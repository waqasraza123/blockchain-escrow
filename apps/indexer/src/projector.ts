import type {
  FeeVaultStateRecord,
  ProtocolConfigStateRecord,
  Release4Repositories
} from "@blockchain-escrow/db";
import type {
  IndexedContractEventSummary,
  IsoTimestamp,
  WalletAddress
} from "@blockchain-escrow/shared";

const zeroAddress = "0x0000000000000000000000000000000000000000";

function requireString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== "string") {
    throw new Error(`Expected event field ${key} to be a string`);
  }

  return value;
}

function requireBoolean(data: Record<string, unknown>, key: string): boolean {
  const value = data[key];
  if (typeof value !== "boolean") {
    throw new Error(`Expected event field ${key} to be a boolean`);
  }

  return value;
}

function requireNumber(data: Record<string, unknown>, key: string): number {
  const value = data[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && /^[0-9]+$/u.test(value)) {
    return Number.parseInt(value, 10);
  }

  throw new Error(`Expected event field ${key} to be numeric`);
}

function normalizeNullableAddress(value: string): WalletAddress | null {
  return value.toLowerCase() === zeroAddress ? null : (value as WalletAddress);
}

function toEventTime(event: IndexedContractEventSummary): IsoTimestamp {
  return event.blockTimestamp;
}

function createDefaultProtocolConfigState(
  event: IndexedContractEventSummary,
  owner: WalletAddress,
  pendingOwner: WalletAddress | null
): ProtocolConfigStateRecord {
  return {
    arbitratorRegistryAddress: null,
    chainId: event.chainId,
    createEscrowPaused: false,
    feeVaultAddress: null,
    fundingPaused: false,
    owner,
    pendingOwner,
    protocolConfigAddress: event.contractAddress,
    protocolFeeBps: 0,
    tokenAllowlistAddress: null,
    treasuryAddress: null,
    updatedAt: toEventTime(event),
    updatedBlockHash: event.blockHash,
    updatedBlockNumber: event.blockNumber,
    updatedLogIndex: event.logIndex,
    updatedTransactionHash: event.transactionHash
  };
}

function createDefaultFeeVaultState(
  event: IndexedContractEventSummary,
  owner: WalletAddress,
  pendingOwner: WalletAddress | null
): FeeVaultStateRecord {
  return {
    chainId: event.chainId,
    feeVaultAddress: event.contractAddress,
    owner,
    pendingOwner,
    treasuryAddress: null,
    updatedAt: toEventTime(event),
    updatedBlockHash: event.blockHash,
    updatedBlockNumber: event.blockNumber,
    updatedLogIndex: event.logIndex,
    updatedTransactionHash: event.transactionHash
  };
}

function agreementInitializationLookup(
  events: readonly IndexedContractEventSummary[]
): Map<string, IndexedContractEventSummary> {
  const lookup = new Map<string, IndexedContractEventSummary>();

  for (const event of events) {
    if (event.eventName !== "AgreementInitialized") {
      continue;
    }

    const dealId = requireString(event.data, "dealId");
    lookup.set(`${event.chainId}:${event.transactionHash}:${dealId}`, event);
  }

  return lookup;
}

async function applyOwnershipEvent(
  repositories: Release4Repositories,
  event: IndexedContractEventSummary
): Promise<void> {
  const previousOwner = requireString(event.data, "previousOwner") as WalletAddress;
  const newOwner = requireString(event.data, "newOwner") as WalletAddress;
  const pendingOwner =
    event.eventName === "OwnershipTransferStarted" ? newOwner : null;
  const owner =
    event.eventName === "OwnershipTransferStarted" ? previousOwner : newOwner;

  await repositories.contractOwnerships.upsert({
    chainId: event.chainId,
    contractAddress: event.contractAddress,
    contractName: event.contractName,
    owner,
    pendingOwner,
    updatedAt: toEventTime(event),
    updatedBlockHash: event.blockHash,
    updatedBlockNumber: event.blockNumber,
    updatedLogIndex: event.logIndex,
    updatedTransactionHash: event.transactionHash
  });

  if (event.contractName === "ProtocolConfig") {
    const existing = await repositories.protocolConfigStates.findByChainIdAndAddress(
      event.chainId,
      event.contractAddress
    );

    await repositories.protocolConfigStates.upsert({
      ...(existing ?? createDefaultProtocolConfigState(event, owner, pendingOwner)),
      owner,
      pendingOwner,
      updatedAt: toEventTime(event),
      updatedBlockHash: event.blockHash,
      updatedBlockNumber: event.blockNumber,
      updatedLogIndex: event.logIndex,
      updatedTransactionHash: event.transactionHash
    });
  }

  if (event.contractName === "FeeVault") {
    const existing = await repositories.feeVaultStates.findByChainIdAndAddress(
      event.chainId,
      event.contractAddress
    );

    await repositories.feeVaultStates.upsert({
      ...(existing ?? createDefaultFeeVaultState(event, owner, pendingOwner)),
      owner,
      pendingOwner,
      updatedAt: toEventTime(event),
      updatedBlockHash: event.blockHash,
      updatedBlockNumber: event.blockNumber,
      updatedLogIndex: event.logIndex,
      updatedTransactionHash: event.transactionHash
    });
  }
}

async function applyProtocolConfigEvent(
  repositories: Release4Repositories,
  event: IndexedContractEventSummary
): Promise<void> {
  const existing = await repositories.protocolConfigStates.findByChainIdAndAddress(
    event.chainId,
    event.contractAddress
  );

  const state =
    existing ??
    createDefaultProtocolConfigState(
      event,
      zeroAddress as WalletAddress,
      null
    );

  switch (event.eventName) {
    case "TokenAllowlistUpdated":
      state.tokenAllowlistAddress = requireString(
        event.data,
        "newTokenAllowlist"
      ) as WalletAddress;
      break;
    case "ArbitratorRegistryUpdated":
      state.arbitratorRegistryAddress = requireString(
        event.data,
        "newArbitratorRegistry"
      ) as WalletAddress;
      break;
    case "FeeVaultUpdated":
      state.feeVaultAddress = requireString(event.data, "newFeeVault") as WalletAddress;
      break;
    case "TreasuryUpdated":
      state.treasuryAddress = requireString(event.data, "newTreasury") as WalletAddress;
      break;
    case "ProtocolFeeBpsUpdated":
      state.protocolFeeBps = requireNumber(event.data, "newProtocolFeeBps");
      break;
    case "CreateEscrowPauseUpdated":
      state.createEscrowPaused = requireBoolean(event.data, "newPaused");
      break;
    case "FundingPauseUpdated":
      state.fundingPaused = requireBoolean(event.data, "newPaused");
      break;
    default:
      return;
  }

  state.updatedAt = toEventTime(event);
  state.updatedBlockHash = event.blockHash;
  state.updatedBlockNumber = event.blockNumber;
  state.updatedLogIndex = event.logIndex;
  state.updatedTransactionHash = event.transactionHash;

  await repositories.protocolConfigStates.upsert(state);
}

async function applyFeeVaultEvent(
  repositories: Release4Repositories,
  event: IndexedContractEventSummary
): Promise<void> {
  if (event.eventName !== "TreasuryUpdated") {
    return;
  }

  const existing = await repositories.feeVaultStates.findByChainIdAndAddress(
    event.chainId,
    event.contractAddress
  );

  const state =
    existing ??
    createDefaultFeeVaultState(event, zeroAddress as WalletAddress, null);

  state.treasuryAddress = requireString(event.data, "newTreasury") as WalletAddress;
  state.updatedAt = toEventTime(event);
  state.updatedBlockHash = event.blockHash;
  state.updatedBlockNumber = event.blockNumber;
  state.updatedLogIndex = event.logIndex;
  state.updatedTransactionHash = event.transactionHash;

  await repositories.feeVaultStates.upsert(state);
}

async function applyAgreementCreatedEvent(
  repositories: Release4Repositories,
  event: IndexedContractEventSummary,
  initializedEventLookup: ReadonlyMap<string, IndexedContractEventSummary>
): Promise<void> {
  const dealId = requireString(event.data, "dealId");
  const initializedEvent = initializedEventLookup.get(
    `${event.chainId}:${event.transactionHash}:${dealId}`
  );

  if (!initializedEvent) {
    throw new Error(
      `Missing AgreementInitialized event for deal ${dealId} in transaction ${event.transactionHash}`
    );
  }

  await repositories.escrowAgreements.upsert({
    agreementAddress: requireString(event.data, "agreement") as WalletAddress,
    arbitratorAddress: normalizeNullableAddress(
      requireString(event.data, "arbitrator")
    ),
    buyerAddress: requireString(event.data, "buyer") as WalletAddress,
    chainId: event.chainId,
    createdBlockHash: event.blockHash,
    createdBlockNumber: event.blockNumber,
    createdLogIndex: event.logIndex,
    createdTransactionHash: event.transactionHash,
    dealId: dealId as `0x${string}`,
    dealVersionHash: requireString(event.data, "dealVersionHash") as `0x${string}`,
    factoryAddress: requireString(initializedEvent.data, "factory") as WalletAddress,
    feeVaultAddress: requireString(initializedEvent.data, "feeVault") as WalletAddress,
    funded: false,
    fundedAt: null,
    fundedBlockHash: null,
    fundedBlockNumber: null,
    fundedLogIndex: null,
    fundedPayerAddress: null,
    fundedTransactionHash: null,
    initializedBlockHash: initializedEvent.blockHash,
    initializedBlockNumber: initializedEvent.blockNumber,
    initializedLogIndex: initializedEvent.logIndex,
    initializedTimestamp: initializedEvent.blockTimestamp,
    initializedTransactionHash: initializedEvent.transactionHash,
    milestoneCount: requireNumber(event.data, "milestoneCount"),
    protocolConfigAddress: requireString(initializedEvent.data, "protocolConfig") as WalletAddress,
    protocolFeeBps: requireNumber(initializedEvent.data, "protocolFeeBps"),
    sellerAddress: requireString(event.data, "seller") as WalletAddress,
    settlementTokenAddress: requireString(event.data, "settlementToken") as WalletAddress,
    totalAmount: requireString(event.data, "totalAmount"),
    updatedAt: toEventTime(event)
  });
}

async function applyAgreementFundedEvent(
  repositories: Release4Repositories,
  event: IndexedContractEventSummary
): Promise<void> {
  const existing = await repositories.escrowAgreements.findByChainIdAndAddress(
    event.chainId,
    event.contractAddress
  );

  if (!existing) {
    throw new Error(
      `Missing EscrowAgreement projection for funded event at ${event.contractAddress}`
    );
  }

  await repositories.escrowAgreements.upsert({
    ...existing,
    funded: true,
    fundedAt: toEventTime(event),
    fundedBlockHash: event.blockHash,
    fundedBlockNumber: event.blockNumber,
    fundedLogIndex: event.logIndex,
    fundedPayerAddress: requireString(event.data, "payer") as WalletAddress,
    fundedTransactionHash: event.transactionHash,
    updatedAt: toEventTime(event)
  });
}

export async function resetRelease4Projections(
  repositories: Release4Repositories,
  chainId: number
): Promise<void> {
  await repositories.arbitratorRegistryEntries.resetByChainId(chainId);
  await repositories.contractOwnerships.resetByChainId(chainId);
  await repositories.escrowAgreements.resetByChainId(chainId);
  await repositories.feeVaultStates.resetByChainId(chainId);
  await repositories.protocolConfigStates.resetByChainId(chainId);
  await repositories.tokenAllowlistEntries.resetByChainId(chainId);
}

export async function applyIndexedEvents(
  repositories: Release4Repositories,
  events: readonly IndexedContractEventSummary[]
): Promise<void> {
  const initializedEventLookup = agreementInitializationLookup(events);

  for (const event of events) {
    switch (event.eventName) {
      case "OwnershipTransferStarted":
      case "OwnershipTransferred":
        await applyOwnershipEvent(repositories, event);
        break;
      case "TokenStatusUpdated":
        await repositories.tokenAllowlistEntries.upsert({
          chainId: event.chainId,
          isAllowed: requireBoolean(event.data, "allowed"),
          token: requireString(event.data, "token") as WalletAddress,
          tokenAllowlistAddress: event.contractAddress,
          updatedAt: toEventTime(event),
          updatedBlockHash: event.blockHash,
          updatedBlockNumber: event.blockNumber,
          updatedLogIndex: event.logIndex,
          updatedTransactionHash: event.transactionHash
        });
        break;
      case "ArbitratorApprovalUpdated":
        await repositories.arbitratorRegistryEntries.upsert({
          arbitrator: requireString(event.data, "arbitrator") as WalletAddress,
          arbitratorRegistryAddress: event.contractAddress,
          chainId: event.chainId,
          isApproved: requireBoolean(event.data, "approved"),
          updatedAt: toEventTime(event),
          updatedBlockHash: event.blockHash,
          updatedBlockNumber: event.blockNumber,
          updatedLogIndex: event.logIndex,
          updatedTransactionHash: event.transactionHash
        });
        break;
      case "ArbitratorRegistryUpdated":
      case "CreateEscrowPauseUpdated":
      case "FeeVaultUpdated":
      case "FundingPauseUpdated":
      case "ProtocolFeeBpsUpdated":
      case "TokenAllowlistUpdated":
      case "TreasuryUpdated":
        if (event.contractName === "ProtocolConfig") {
          await applyProtocolConfigEvent(repositories, event);
        } else if (event.contractName === "FeeVault") {
          await applyFeeVaultEvent(repositories, event);
        }
        break;
      case "AgreementCreated":
        await applyAgreementCreatedEvent(
          repositories,
          event,
          initializedEventLookup
        );
        break;
      case "AgreementFunded":
        await applyAgreementFundedEvent(repositories, event);
        break;
      case "AgreementInitialized":
      case "NativeFeesWithdrawn":
      case "TokenFeesWithdrawn":
        break;
      default: {
        const exhaustiveCheck: never = event.eventName;
        throw new Error(`Unhandled indexed event: ${String(exhaustiveCheck)}`);
      }
    }
  }
}
