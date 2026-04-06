import {
  createPrismaClient,
  createPrismaRelease4Repositories,
  runInRelease4Transaction,
  type ChainCursorRecord
} from "@blockchain-escrow/db";
import { getContractArtifact } from "@blockchain-escrow/contracts-sdk";
import type {
  EscrowAgreementSummary,
  FeeVaultStateSummary,
  HexString,
  IndexedBlockSummary,
  IndexedContractEventSummary,
  IndexedTransactionSummary,
  ProtocolConfigStateSummary,
  WalletAddress
} from "@blockchain-escrow/shared";
import {
  createPublicClient,
  http,
  type Abi,
  type PublicClient,
  type Transaction
} from "viem";

import type { IndexerConfig } from "./config";
import {
  decodeAgreementInitializedEventsFromReceipt,
  decodeTrackedContractLog,
  getTrackedContracts,
  type TrackedContracts
} from "./event-codec";
import type { HealthState } from "./health-state";
import { applyIndexedEvents, resetRelease4Projections } from "./projector";

const zeroAddress = "0x0000000000000000000000000000000000000000";

function now(): string {
  return new Date().toISOString();
}

function normalizeAddress(value: string): WalletAddress {
  return value.toLowerCase() as WalletAddress;
}

function asAddress(value: unknown, label: string): WalletAddress {
  if (typeof value !== "string") {
    throw new Error(`Expected ${label} to be an address string`);
  }

  return normalizeAddress(value);
}

function asAddressArray(value: unknown, label: string): WalletAddress[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an address array`);
  }

  return value.map((entry) => asAddress(entry, label));
}

function asBigInt(value: unknown, label: string): bigint {
  if (typeof value !== "bigint") {
    throw new Error(`Expected ${label} to be a bigint`);
  }

  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Expected ${label} to be a boolean`);
  }

  return value;
}

function asHexString(value: unknown, label: string): HexString {
  if (typeof value !== "string") {
    throw new Error(`Expected ${label} to be a hex string`);
  }

  return normalizeHex(value);
}

function normalizeHex(value: string): HexString {
  return value.toLowerCase() as HexString;
}

function equalHex(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? "").toLowerCase() === (right ?? "").toLowerCase();
}

function requireBlockHash(value: string | null | undefined, label: string): HexString {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }

  return normalizeHex(value);
}

function sortIndexedEvents(
  left: IndexedContractEventSummary,
  right: IndexedContractEventSummary
): number {
  const blockDelta = BigInt(left.blockNumber) - BigInt(right.blockNumber);
  if (blockDelta !== 0n) {
    return blockDelta < 0n ? -1 : 1;
  }

  if (left.transactionIndex !== right.transactionIndex) {
    return left.transactionIndex - right.transactionIndex;
  }

  return left.logIndex - right.logIndex;
}

function buildCursor(
  config: IndexerConfig,
  current: ChainCursorRecord | null,
  overrides: Partial<ChainCursorRecord>
): ChainCursorRecord {
  return {
    chainId: config.chainId,
    cursorKey: config.cursorKey,
    lastProcessedBlockHash: current?.lastProcessedBlockHash ?? null,
    lastProcessedBlockNumber: current?.lastProcessedBlockNumber ?? null,
    nextBlockNumber: current?.nextBlockNumber ?? config.startBlock.toString(),
    updatedAt: now(),
    ...overrides
  };
}

export class IndexerService {
  private readonly client: PublicClient;
  private readonly prisma = createPrismaClient();
  private readonly repositories = createPrismaRelease4Repositories(this.prisma);
  private readonly trackedContracts: TrackedContracts;
  private intervalHandle: NodeJS.Timeout | null = null;
  private running = false;
  private syncing = false;

  constructor(
    private readonly config: IndexerConfig,
    private readonly healthState: HealthState
  ) {
    this.client = createPublicClient({
      transport: http(config.baseRpcUrl)
    });
    this.trackedContracts = getTrackedContracts(config.chainId);
  }

  async close(): Promise<void> {
    this.running = false;

    if (this.intervalHandle) {
      clearTimeout(this.intervalHandle);
      this.intervalHandle = null;
    }

    await this.prisma.$disconnect();
  }

  async start(): Promise<void> {
    this.running = true;
    await this.tick();
  }

  private scheduleNext(): void {
    if (!this.running || this.config.runOnce) {
      return;
    }

    this.intervalHandle = setTimeout(() => {
      void this.tick();
    }, this.config.pollIntervalMs);
  }

  private async tick(): Promise<void> {
    if (!this.running || this.syncing) {
      return;
    }

    this.syncing = true;
    this.healthState.markSyncStart();

    try {
      await this.sync();
      this.healthState.markSyncSuccess();

      if (this.config.enableDriftChecks) {
        await this.runDriftChecks();
        this.healthState.markDriftSuccess();
      }
    } catch (error) {
      console.error("Indexer sync failed", error);
      this.healthState.markSyncFailure(error);
    } finally {
      this.syncing = false;
      this.scheduleNext();
    }
  }

  private async sync(): Promise<void> {
    let cursor = await this.repositories.chainCursors.findByChainIdAndCursorKey(
      this.config.chainId,
      this.config.cursorKey
    );

    if (!cursor) {
      cursor = await this.repositories.chainCursors.upsert(
        buildCursor(this.config, null, {
          nextBlockNumber: this.config.startBlock.toString()
        })
      );
    }

    cursor = await this.reconcileReorg(cursor);

    const latestBlockNumber = await this.client.getBlockNumber();
    const finalityBuffer = BigInt(this.config.finalityBuffer);
    const targetBlockNumber =
      latestBlockNumber > finalityBuffer ? latestBlockNumber - finalityBuffer : 0n;

    let nextBlockNumber = BigInt(cursor.nextBlockNumber);

    while (nextBlockNumber <= targetBlockNumber) {
      const toBlockNumber =
        nextBlockNumber + BigInt(this.config.batchSize - 1) < targetBlockNumber
          ? nextBlockNumber + BigInt(this.config.batchSize - 1)
          : targetBlockNumber;

      cursor = await this.syncRange(cursor, nextBlockNumber, toBlockNumber);
      nextBlockNumber = BigInt(cursor.nextBlockNumber);
    }
  }

  private async syncRange(
    cursor: ChainCursorRecord,
    fromBlockNumber: bigint,
    toBlockNumber: bigint
  ): Promise<ChainCursorRecord> {
    const indexedAt = now();
    const blockRecords = await this.fetchBlockRecords(fromBlockNumber, toBlockNumber, indexedAt);
    const blockTimestampByNumber = new Map(
      blockRecords.map((record) => [record.blockNumber, record.timestamp])
    );

    const baseLogs = await this.client.getLogs({
      address: [...this.trackedContracts.baseAddresses],
      fromBlock: fromBlockNumber,
      toBlock: toBlockNumber
    });

    const decodedBaseEvents = baseLogs
      .map((log) => {
        const blockNumber = log.blockNumber?.toString();
        if (!blockNumber) {
          throw new Error("Received log without block number");
        }

        const blockTimestamp = blockTimestampByNumber.get(blockNumber);
        if (!blockTimestamp) {
          throw new Error(`Missing block timestamp for block ${blockNumber}`);
        }

        return decodeTrackedContractLog(
          this.config.chainId,
          this.trackedContracts,
          log,
          blockTimestamp,
          indexedAt
        );
      })
      .sort(sortIndexedEvents);

    const agreementInitializedEvents = await this.fetchAgreementInitializedEvents(
      decodedBaseEvents,
      blockTimestampByNumber,
      indexedAt
    );

    const allEvents = [...decodedBaseEvents, ...agreementInitializedEvents].sort(
      sortIndexedEvents
    );
    const transactionRecords = await this.fetchTransactionRecords(
      fromBlockNumber,
      toBlockNumber,
      indexedAt
    );
    const lastBlock = blockRecords.at(-1);

    if (!lastBlock) {
      return cursor;
    }

    return runInRelease4Transaction(this.prisma, async (repositories) => {
      await repositories.indexedBlocks.upsertMany(blockRecords);
      await repositories.indexedTransactions.upsertMany(transactionRecords);
      await repositories.indexedContractEvents.upsertMany(allEvents);
      await applyIndexedEvents(repositories, allEvents);

      return repositories.chainCursors.upsert(
        buildCursor(this.config, cursor, {
          lastProcessedBlockHash: lastBlock.blockHash,
          lastProcessedBlockNumber: lastBlock.blockNumber,
          nextBlockNumber: (toBlockNumber + 1n).toString()
        })
      );
    });
  }

  private async fetchAgreementInitializedEvents(
    baseEvents: readonly IndexedContractEventSummary[],
    blockTimestampByNumber: ReadonlyMap<string, string>,
    indexedAt: string
  ): Promise<IndexedContractEventSummary[]> {
    const agreementCreatedEvents = baseEvents.filter(
      (event) => event.eventName === "AgreementCreated"
    );

    const agreementInitializedEvents: IndexedContractEventSummary[] = [];

    for (const event of agreementCreatedEvents) {
      const agreementAddress = normalizeAddress(String(event.data.agreement));
      const receipt = await this.client.getTransactionReceipt({
        hash: event.transactionHash
      });
      const blockTimestamp = blockTimestampByNumber.get(event.blockNumber);

      if (!blockTimestamp) {
        throw new Error(
          `Missing block timestamp for agreement initialization tx ${event.transactionHash}`
        );
      }

      agreementInitializedEvents.push(
        ...decodeAgreementInitializedEventsFromReceipt(
          this.config.chainId,
          receipt,
          new Set([agreementAddress]),
          indexedAt,
          blockTimestamp
        )
      );
    }

    return agreementInitializedEvents;
  }

  private async fetchBlockRecords(
    fromBlockNumber: bigint,
    toBlockNumber: bigint,
    indexedAt: string
  ): Promise<IndexedBlockSummary[]> {
    const blockNumbers: bigint[] = [];

    for (let current = fromBlockNumber; current <= toBlockNumber; current += 1n) {
      blockNumbers.push(current);
    }

    const blocks = await Promise.all(
      blockNumbers.map((blockNumber) =>
        this.client.getBlock({
          blockNumber
        })
      )
    );

    return blocks.map((block) => ({
      blockHash: requireBlockHash(block.hash, "block hash"),
      blockNumber: block.number.toString(),
      chainId: this.config.chainId,
      indexedAt,
      parentBlockHash: requireBlockHash(block.parentHash, "parent block hash"),
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString()
    }));
  }

  private async fetchTransactionRecords(
    fromBlockNumber: bigint,
    toBlockNumber: bigint,
    indexedAt: string
  ): Promise<IndexedTransactionSummary[]> {
    const blockNumbers: bigint[] = [];

    for (let current = fromBlockNumber; current <= toBlockNumber; current += 1n) {
      blockNumbers.push(current);
    }

    const blocks = await Promise.all(
      blockNumbers.map((blockNumber) =>
        this.client.getBlock({
          blockNumber,
          includeTransactions: true
        })
      )
    );
    const trackedTransactions = new Map<HexString, Transaction>();

    for (const block of blocks) {
      for (const transaction of block.transactions) {
        if (typeof transaction === "string") {
          continue;
        }

        const normalizedHash = normalizeHex(transaction.hash);
        const normalizedToAddress = transaction.to
          ? normalizeAddress(transaction.to)
          : null;

        if (
          !normalizedToAddress ||
          !this.trackedContracts.baseAddresses.includes(normalizedToAddress)
        ) {
          continue;
        }

        trackedTransactions.set(normalizedHash, transaction);
      }
    }

    const receipts = await Promise.all(
      [...trackedTransactions.keys()].map((hash) =>
        this.client.getTransactionReceipt({ hash })
      )
    );
    const executionStatusByHash = new Map(
      receipts.map((receipt) => [
        normalizeHex(receipt.transactionHash),
        receipt.status === "reverted" ? "REVERTED" : "SUCCESS"
      ] as const)
    );

    return [...trackedTransactions.values()].map((transaction) =>
      this.mapTransactionRecord(
        transaction,
        indexedAt,
        executionStatusByHash.get(normalizeHex(transaction.hash)) ?? "SUCCESS"
      )
    );
  }

  private mapTransactionRecord(
    transaction: Transaction,
    indexedAt: string,
    executionStatus: IndexedTransactionSummary["executionStatus"]
  ): IndexedTransactionSummary {
    return {
      blockHash: requireBlockHash(transaction.blockHash, "transaction block hash"),
      blockNumber: (transaction.blockNumber ?? 0n).toString(),
      chainId: this.config.chainId,
      executionStatus,
      fromAddress: normalizeAddress(transaction.from),
      indexedAt,
      toAddress: transaction.to ? normalizeAddress(transaction.to) : null,
      transactionHash: normalizeHex(transaction.hash),
      transactionIndex: transaction.transactionIndex ?? 0
    };
  }

  private async reconcileReorg(cursor: ChainCursorRecord): Promise<ChainCursorRecord> {
    if (!cursor.lastProcessedBlockNumber || !cursor.lastProcessedBlockHash) {
      return cursor;
    }

    const liveBlock = await this.client.getBlock({
      blockNumber: BigInt(cursor.lastProcessedBlockNumber)
    });

    if (equalHex(liveBlock.hash ?? null, cursor.lastProcessedBlockHash)) {
      return cursor;
    }

    let probe = BigInt(cursor.lastProcessedBlockNumber);
    let canonicalBlock: IndexedBlockSummary | null = null;

    while (probe >= this.config.startBlock) {
      const storedBlock = await this.repositories.indexedBlocks.findByChainIdAndBlockNumber(
        this.config.chainId,
        probe.toString()
      );

      if (!storedBlock) {
        probe -= 1n;
        continue;
      }

      const liveProbeBlock = await this.client.getBlock({ blockNumber: probe });
      if (equalHex(liveProbeBlock.hash ?? null, storedBlock.blockHash)) {
        canonicalBlock = storedBlock;
        break;
      }

      probe -= 1n;
    }

    const rollbackFromBlock = canonicalBlock ? BigInt(canonicalBlock.blockNumber) + 1n : this.config.startBlock;

    return runInRelease4Transaction(this.prisma, async (repositories) => {
      await repositories.indexedContractEvents.deleteFromBlockNumber(
        this.config.chainId,
        rollbackFromBlock.toString()
      );
      await repositories.indexedTransactions.deleteFromBlockNumber(
        this.config.chainId,
        rollbackFromBlock.toString()
      );
      await repositories.indexedBlocks.deleteFromBlockNumber(
        this.config.chainId,
        rollbackFromBlock.toString()
      );
      await resetRelease4Projections(repositories, this.config.chainId);

      const survivingEvents = await repositories.indexedContractEvents.listByChainId(
        this.config.chainId
      );
      await applyIndexedEvents(repositories, survivingEvents);

      return repositories.chainCursors.upsert(
        buildCursor(this.config, cursor, {
          lastProcessedBlockHash: canonicalBlock?.blockHash ?? null,
          lastProcessedBlockNumber: canonicalBlock?.blockNumber ?? null,
          nextBlockNumber: rollbackFromBlock.toString()
        })
      );
    });
  }

  private async runDriftChecks(): Promise<void> {
    try {
      await this.verifyTokenAllowlistDrift();
      await this.verifyArbitratorRegistryDrift();
      await this.verifyProtocolConfigDrift();
      await this.verifyFeeVaultDrift();
      await this.verifyEscrowAgreementDrift();
    } catch (error) {
      this.healthState.markDriftFailure(error);
      throw error;
    }
  }

  private async verifyTokenAllowlistDrift(): Promise<void> {
    const ownerships = await this.repositories.contractOwnerships.listByChainId(
      this.config.chainId
    );
    const contract = this.trackedContracts.addressByContractName.get("TokenAllowlist");

    if (!contract) {
      return;
    }

    const ownership = ownerships.find(
      (entry) => entry.contractAddress === contract
    );

    const abi = getContractArtifact("TokenAllowlist").abi as Abi;
    const owner = normalizeAddress(
      asAddress(
        await this.client.readContract({
          abi,
          address: contract,
          functionName: "owner"
        }),
        "TokenAllowlist owner"
      )
    );
    const pendingOwner = normalizeNullable(
      asAddress(
        await this.client.readContract({
          abi,
          address: contract,
          functionName: "pendingOwner"
        }),
        "TokenAllowlist pending owner"
      )
    );
    const allowedTokens = asAddressArray(
      await this.client.readContract({
        abi,
        address: contract,
        functionName: "getAllowedTokens"
      }),
      "TokenAllowlist allowed tokens"
    );
    const projectedAllowedTokens = (
      await this.repositories.tokenAllowlistEntries.listAllowedByChainIdAndContract(
        this.config.chainId,
        contract
      )
    ).map((entry) => entry.token);

    if (!ownership || owner !== ownership.owner || pendingOwner !== ownership.pendingOwner) {
      throw new Error("TokenAllowlist ownership projection drift detected");
    }

    if (allowedTokens.join(",") !== projectedAllowedTokens.join(",")) {
      throw new Error("TokenAllowlist entry projection drift detected");
    }
  }

  private async verifyArbitratorRegistryDrift(): Promise<void> {
    const ownerships = await this.repositories.contractOwnerships.listByChainId(
      this.config.chainId
    );
    const contract = this.trackedContracts.addressByContractName.get("ArbitratorRegistry");

    if (!contract) {
      return;
    }

    const ownership = ownerships.find((entry) => entry.contractAddress === contract);
    const abi = getContractArtifact("ArbitratorRegistry").abi as Abi;
    const owner = normalizeAddress(
      asAddress(
        await this.client.readContract({
          abi,
          address: contract,
          functionName: "owner"
        }),
        "ArbitratorRegistry owner"
      )
    );
    const pendingOwner = normalizeNullable(
      asAddress(
        await this.client.readContract({
          abi,
          address: contract,
          functionName: "pendingOwner"
        }),
        "ArbitratorRegistry pending owner"
      )
    );
    const approvedArbitrators = asAddressArray(
      await this.client.readContract({
        abi,
        address: contract,
        functionName: "getApprovedArbitrators"
      }),
      "ArbitratorRegistry approved arbitrators"
    );
    const projectedArbitrators = (
      await this.repositories.arbitratorRegistryEntries.listApprovedByChainIdAndContract(
        this.config.chainId,
        contract
      )
    ).map((entry) => entry.arbitrator);

    if (!ownership || owner !== ownership.owner || pendingOwner !== ownership.pendingOwner) {
      throw new Error("ArbitratorRegistry ownership projection drift detected");
    }

    if (approvedArbitrators.join(",") !== projectedArbitrators.join(",")) {
      throw new Error("ArbitratorRegistry entry projection drift detected");
    }
  }

  private async verifyProtocolConfigDrift(): Promise<void> {
    const contract = this.trackedContracts.addressByContractName.get("ProtocolConfig");
    if (!contract) {
      return;
    }

    const state = await this.repositories.protocolConfigStates.findByChainIdAndAddress(
      this.config.chainId,
      contract
    );
    if (!state) {
      throw new Error("Missing ProtocolConfig projection");
    }

    const abi = getContractArtifact("ProtocolConfig").abi as Abi;
    const liveState: ProtocolConfigStateSummary = {
      arbitratorRegistryAddress: normalizeAddress(
        asAddress(await this.client.readContract({
          abi,
          address: contract,
          functionName: "arbitratorRegistry"
        }), "ProtocolConfig arbitratorRegistry")
      ),
      chainId: this.config.chainId,
      createEscrowPaused: asBoolean(await this.client.readContract({
        abi,
        address: contract,
        functionName: "createEscrowPaused"
      }), "ProtocolConfig createEscrowPaused"),
      feeVaultAddress: normalizeAddress(
        asAddress(
          await this.client.readContract({
            abi,
            address: contract,
            functionName: "feeVault"
          }),
          "ProtocolConfig feeVault"
        )
      ),
      fundingPaused: asBoolean(await this.client.readContract({
        abi,
        address: contract,
        functionName: "fundingPaused"
      }), "ProtocolConfig fundingPaused"),
      owner: normalizeAddress(
        asAddress(
          await this.client.readContract({ abi, address: contract, functionName: "owner" }),
          "ProtocolConfig owner"
        )
      ),
      pendingOwner: normalizeNullable(
        asAddress(await this.client.readContract({
          abi,
          address: contract,
          functionName: "pendingOwner"
        }), "ProtocolConfig pending owner")
      ),
      protocolConfigAddress: contract,
      protocolFeeBps: Number(asBigInt(await this.client.readContract({
          abi,
          address: contract,
          functionName: "protocolFeeBps"
        }), "ProtocolConfig protocolFeeBps")),
      tokenAllowlistAddress: normalizeAddress(
        asAddress(await this.client.readContract({
          abi,
          address: contract,
          functionName: "tokenAllowlist"
        }), "ProtocolConfig tokenAllowlist")
      ),
      treasuryAddress: normalizeAddress(
        asAddress(
          await this.client.readContract({
            abi,
            address: contract,
            functionName: "treasury"
          }),
          "ProtocolConfig treasury"
        )
      ),
      updatedAt: state.updatedAt,
      updatedBlockHash: state.updatedBlockHash,
      updatedBlockNumber: state.updatedBlockNumber,
      updatedLogIndex: state.updatedLogIndex,
      updatedTransactionHash: state.updatedTransactionHash
    };

    if (
      liveState.owner !== state.owner ||
      liveState.pendingOwner !== state.pendingOwner ||
      liveState.tokenAllowlistAddress !== state.tokenAllowlistAddress ||
      liveState.arbitratorRegistryAddress !== state.arbitratorRegistryAddress ||
      liveState.feeVaultAddress !== state.feeVaultAddress ||
      liveState.treasuryAddress !== state.treasuryAddress ||
      liveState.protocolFeeBps !== state.protocolFeeBps ||
      liveState.createEscrowPaused !== state.createEscrowPaused ||
      liveState.fundingPaused !== state.fundingPaused
    ) {
      throw new Error("ProtocolConfig projection drift detected");
    }
  }

  private async verifyFeeVaultDrift(): Promise<void> {
    const contract = this.trackedContracts.addressByContractName.get("FeeVault");
    if (!contract) {
      return;
    }

    const state = await this.repositories.feeVaultStates.findByChainIdAndAddress(
      this.config.chainId,
      contract
    );
    if (!state) {
      throw new Error("Missing FeeVault projection");
    }

    const abi = getContractArtifact("FeeVault").abi as Abi;
    const liveState: FeeVaultStateSummary = {
      chainId: this.config.chainId,
      feeVaultAddress: contract,
      owner: normalizeAddress(
        asAddress(
          await this.client.readContract({ abi, address: contract, functionName: "owner" }),
          "FeeVault owner"
        )
      ),
      pendingOwner: normalizeNullable(
        asAddress(await this.client.readContract({
          abi,
          address: contract,
          functionName: "pendingOwner"
        }), "FeeVault pending owner")
      ),
      treasuryAddress: normalizeNullable(
        asAddress(await this.client.readContract({
          abi,
          address: contract,
          functionName: "treasury"
        }), "FeeVault treasury")
      ),
      updatedAt: state.updatedAt,
      updatedBlockHash: state.updatedBlockHash,
      updatedBlockNumber: state.updatedBlockNumber,
      updatedLogIndex: state.updatedLogIndex,
      updatedTransactionHash: state.updatedTransactionHash
    };

    if (
      liveState.owner !== state.owner ||
      liveState.pendingOwner !== state.pendingOwner ||
      liveState.treasuryAddress !== state.treasuryAddress
    ) {
      throw new Error("FeeVault projection drift detected");
    }
  }

  private async verifyEscrowAgreementDrift(): Promise<void> {
    const factoryAddress = this.trackedContracts.addressByContractName.get("EscrowFactory");
    if (!factoryAddress) {
      return;
    }

    const agreements = await this.repositories.escrowAgreements.listByChainId(
      this.config.chainId
    );
    const factoryAbi = getContractArtifact("EscrowFactory").abi as Abi;
    const agreementAbi = getContractArtifact("EscrowAgreement").abi as Abi;

    for (const agreement of agreements) {
      const factoryAgreementAddress = normalizeAddress(
        asAddress(await this.client.readContract({
          abi: factoryAbi,
          address: factoryAddress,
          functionName: "getAgreement",
          args: [agreement.dealId]
        }), "EscrowFactory agreement address")
      );

      if (factoryAgreementAddress !== agreement.agreementAddress) {
        throw new Error(
          `EscrowFactory projection drift detected for deal ${agreement.dealId}`
        );
      }

      const liveAgreement: EscrowAgreementSummary = {
        agreementAddress: agreement.agreementAddress,
        arbitratorAddress: normalizeNullable(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "arbitrator"
          }), "EscrowAgreement arbitrator")
        ),
        buyerAddress: normalizeAddress(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "buyer"
          }), "EscrowAgreement buyer")
        ),
        chainId: this.config.chainId,
        createdBlockHash: agreement.createdBlockHash,
        createdBlockNumber: agreement.createdBlockNumber,
        createdLogIndex: agreement.createdLogIndex,
        createdTransactionHash: agreement.createdTransactionHash,
        dealId: normalizeHex(
          asHexString(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "dealId"
          }), "EscrowAgreement dealId")
        ),
        dealVersionHash: normalizeHex(
          asHexString(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "dealVersionHash"
          }), "EscrowAgreement dealVersionHash")
        ),
        factoryAddress: normalizeAddress(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "factory"
          }), "EscrowAgreement factory")
        ),
        feeVaultAddress: normalizeAddress(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "feeVault"
          }), "EscrowAgreement feeVault")
        ),
        initializedBlockHash: agreement.initializedBlockHash,
        initializedBlockNumber: agreement.initializedBlockNumber,
        initializedLogIndex: agreement.initializedLogIndex,
        initializedTimestamp: agreement.initializedTimestamp,
        initializedTransactionHash: agreement.initializedTransactionHash,
        milestoneCount: Number(asBigInt(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "milestoneCount"
          }), "EscrowAgreement milestoneCount")),
        protocolConfigAddress: normalizeAddress(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "protocolConfig"
          }), "EscrowAgreement protocolConfig")
        ),
        protocolFeeBps: Number(asBigInt(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "protocolFeeBps"
          }), "EscrowAgreement protocolFeeBps")),
        sellerAddress: normalizeAddress(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "seller"
          }), "EscrowAgreement seller")
        ),
        settlementTokenAddress: normalizeAddress(
          asAddress(await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "settlementToken"
          }), "EscrowAgreement settlementToken")
        ),
        totalAmount: asBigInt(
          await this.client.readContract({
            abi: agreementAbi,
            address: agreement.agreementAddress,
            functionName: "totalAmount"
          }),
          "EscrowAgreement totalAmount"
        ).toString(),
        updatedAt: agreement.updatedAt
      };

      const initialized = asBoolean(await this.client.readContract({
        abi: agreementAbi,
        address: agreement.agreementAddress,
        functionName: "initialized"
      }), "EscrowAgreement initialized");

      if (
        !initialized ||
        liveAgreement.dealId !== agreement.dealId ||
        liveAgreement.dealVersionHash !== agreement.dealVersionHash ||
        liveAgreement.factoryAddress !== agreement.factoryAddress ||
        liveAgreement.protocolConfigAddress !== agreement.protocolConfigAddress ||
        liveAgreement.buyerAddress !== agreement.buyerAddress ||
        liveAgreement.sellerAddress !== agreement.sellerAddress ||
        liveAgreement.settlementTokenAddress !== agreement.settlementTokenAddress ||
        liveAgreement.arbitratorAddress !== agreement.arbitratorAddress ||
        liveAgreement.feeVaultAddress !== agreement.feeVaultAddress ||
        liveAgreement.protocolFeeBps !== agreement.protocolFeeBps ||
        liveAgreement.totalAmount !== agreement.totalAmount ||
        liveAgreement.milestoneCount !== agreement.milestoneCount
      ) {
        throw new Error(
          `EscrowAgreement projection drift detected for ${agreement.agreementAddress}`
        );
      }
    }
  }
}

function normalizeNullable(value: string): WalletAddress | null {
  const normalized = normalizeAddress(value);
  return normalized === zeroAddress ? null : normalized;
}
