import test from "node:test";
import assert from "node:assert/strict";

import type {
  ArbitratorRegistryEntryRecord,
  ChainCursorRecord,
  ContractOwnershipRecord,
  EscrowAgreementRecord,
  FeeVaultStateRecord,
  IndexedBlockRecord,
  IndexedContractEventRecord,
  IndexedTransactionRecord,
  ProtocolConfigStateRecord,
  Release4Repositories,
  TokenAllowlistEntryRecord
} from "@blockchain-escrow/db";
import { applyIndexedEvents, resetRelease4Projections } from "../src/projector";

class InMemoryRelease4Repositories implements Release4Repositories {
  readonly arbitratorRegistryEntries = {
    listApprovedByChainIdAndContract: async (
      chainId: number,
      arbitratorRegistryAddress: string
    ) =>
      [...this.arbitratorRegistryEntriesStore.values()].filter(
        (record) =>
          record.chainId === chainId &&
          record.arbitratorRegistryAddress === arbitratorRegistryAddress &&
          record.isApproved
      ),
    listByChainId: async (chainId: number) =>
      [...this.arbitratorRegistryEntriesStore.values()].filter(
        (record) => record.chainId === chainId
      ),
    resetByChainId: async (chainId: number) => {
      for (const [key, value] of this.arbitratorRegistryEntriesStore.entries()) {
        if (value.chainId === chainId) {
          this.arbitratorRegistryEntriesStore.delete(key);
        }
      }
    },
    upsert: async (record: ArbitratorRegistryEntryRecord) => {
      this.arbitratorRegistryEntriesStore.set(
        `${record.chainId}:${record.arbitratorRegistryAddress}:${record.arbitrator}`,
        record
      );
      return record;
    }
  };

  readonly chainCursors = {
    findByChainIdAndCursorKey: async (chainId: number, cursorKey: string) => {
      void chainId;
      void cursorKey;
      return null;
    },
    upsert: async (record: ChainCursorRecord) => record
  };

  readonly contractOwnerships = {
    listByChainId: async (chainId: number) =>
      [...this.contractOwnershipsStore.values()].filter(
        (record) => record.chainId === chainId
      ),
    resetByChainId: async (chainId: number) => {
      for (const [key, value] of this.contractOwnershipsStore.entries()) {
        if (value.chainId === chainId) {
          this.contractOwnershipsStore.delete(key);
        }
      }
    },
    upsert: async (record: ContractOwnershipRecord) => {
      this.contractOwnershipsStore.set(
        `${record.chainId}:${record.contractAddress}`,
        record
      );
      return record;
    }
  };

  readonly escrowAgreements = {
    findByChainIdAndAddress: async (chainId: number, agreementAddress: string) =>
      this.escrowAgreementsStore.get(`${chainId}:${agreementAddress}`) ?? null,
    listByChainId: async (chainId: number) =>
      [...this.escrowAgreementsStore.values()].filter(
        (record) => record.chainId === chainId
      ),
    resetByChainId: async (chainId: number) => {
      for (const [key, value] of this.escrowAgreementsStore.entries()) {
        if (value.chainId === chainId) {
          this.escrowAgreementsStore.delete(key);
        }
      }
    },
    upsert: async (record: EscrowAgreementRecord) => {
      this.escrowAgreementsStore.set(
        `${record.chainId}:${record.agreementAddress}`,
        record
      );
      return record;
    }
  };

  readonly feeVaultStates = {
    findByChainIdAndAddress: async (chainId: number, feeVaultAddress: string) =>
      this.feeVaultStatesStore.get(`${chainId}:${feeVaultAddress}`) ?? null,
    listByChainId: async (chainId: number) =>
      [...this.feeVaultStatesStore.values()].filter(
        (record) => record.chainId === chainId
      ),
    resetByChainId: async (chainId: number) => {
      for (const [key, value] of this.feeVaultStatesStore.entries()) {
        if (value.chainId === chainId) {
          this.feeVaultStatesStore.delete(key);
        }
      }
    },
    upsert: async (record: FeeVaultStateRecord) => {
      this.feeVaultStatesStore.set(
        `${record.chainId}:${record.feeVaultAddress}`,
        record
      );
      return record;
    }
  };

  readonly indexedBlocks = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    findByChainIdAndBlockNumber: async (chainId: number, blockNumber: string) => {
      void chainId;
      void blockNumber;
      return null;
    },
    listByChainId: async (chainId: number) => {
      void chainId;
      return [] as IndexedBlockRecord[];
    },
    upsertMany: async (records: IndexedBlockRecord[]) => {
      void records;
    }
  };

  readonly indexedContractEvents = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    listByChainId: async (chainId: number) => {
      void chainId;
      return [] as IndexedContractEventRecord[];
    },
    upsertMany: async (records: IndexedContractEventRecord[]) => {
      void records;
    }
  };

  readonly indexedTransactions = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    upsertMany: async (records: IndexedTransactionRecord[]) => {
      void records;
    }
  };

  readonly protocolConfigStates = {
    findByChainIdAndAddress: async (chainId: number, protocolConfigAddress: string) =>
      this.protocolConfigStatesStore.get(`${chainId}:${protocolConfigAddress}`) ?? null,
    listByChainId: async (chainId: number) =>
      [...this.protocolConfigStatesStore.values()].filter(
        (record) => record.chainId === chainId
      ),
    resetByChainId: async (chainId: number) => {
      for (const [key, value] of this.protocolConfigStatesStore.entries()) {
        if (value.chainId === chainId) {
          this.protocolConfigStatesStore.delete(key);
        }
      }
    },
    upsert: async (record: ProtocolConfigStateRecord) => {
      this.protocolConfigStatesStore.set(
        `${record.chainId}:${record.protocolConfigAddress}`,
        record
      );
      return record;
    }
  };

  readonly tokenAllowlistEntries = {
    listAllowedByChainIdAndContract: async (
      chainId: number,
      tokenAllowlistAddress: string
    ) =>
      [...this.tokenAllowlistEntriesStore.values()].filter(
        (record) =>
          record.chainId === chainId &&
          record.tokenAllowlistAddress === tokenAllowlistAddress &&
          record.isAllowed
      ),
    listByChainId: async (chainId: number) =>
      [...this.tokenAllowlistEntriesStore.values()].filter(
        (record) => record.chainId === chainId
      ),
    resetByChainId: async (chainId: number) => {
      for (const [key, value] of this.tokenAllowlistEntriesStore.entries()) {
        if (value.chainId === chainId) {
          this.tokenAllowlistEntriesStore.delete(key);
        }
      }
    },
    upsert: async (record: TokenAllowlistEntryRecord) => {
      this.tokenAllowlistEntriesStore.set(
        `${record.chainId}:${record.tokenAllowlistAddress}:${record.token}`,
        record
      );
      return record;
    }
  };

  private readonly arbitratorRegistryEntriesStore = new Map<
    string,
    ArbitratorRegistryEntryRecord
  >();
  private readonly contractOwnershipsStore = new Map<string, ContractOwnershipRecord>();
  private readonly escrowAgreementsStore = new Map<string, EscrowAgreementRecord>();
  private readonly feeVaultStatesStore = new Map<string, FeeVaultStateRecord>();
  private readonly protocolConfigStatesStore = new Map<string, ProtocolConfigStateRecord>();
  private readonly tokenAllowlistEntriesStore = new Map<string, TokenAllowlistEntryRecord>();
}

function createIndexedEvent(
  overrides: Partial<IndexedContractEventRecord>
): IndexedContractEventRecord {
  return {
    blockHash: "0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999",
    blockNumber: "100",
    blockTimestamp: "2026-04-05T04:32:54.951Z",
    chainId: 84532,
    contractAddress: "0x1111111111111111111111111111111111111111",
    contractName: "TokenAllowlist",
    data: {},
    eventName: "OwnershipTransferred",
    indexedAt: "2026-04-05T04:33:00.000Z",
    logIndex: 0,
    topic0: "0x01",
    topics: ["0x01"],
    transactionHash: "0x9999999999999999999999999999999999999999999999999999999999999999",
    transactionIndex: 0,
    ...overrides
  };
}

test("applyIndexedEvents builds protocol and agreement projections from replayable raw events", async () => {
  const repositories = new InMemoryRelease4Repositories();
  const events: IndexedContractEventRecord[] = [
    createIndexedEvent({
      contractAddress: "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b",
      contractName: "TokenAllowlist",
      data: {
        newOwner: "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
        previousOwner: "0x0000000000000000000000000000000000000000"
      },
      eventName: "OwnershipTransferred"
    }),
    createIndexedEvent({
      contractAddress: "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b",
      contractName: "TokenAllowlist",
      data: {
        allowed: true,
        token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e"
      },
      eventName: "TokenStatusUpdated",
      logIndex: 1
    }),
    createIndexedEvent({
      contractAddress: "0x0f133ac8d69a16efab20709479a521880b509613",
      contractName: "ProtocolConfig",
      data: {
        newOwner: "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
        previousOwner: "0x0000000000000000000000000000000000000000"
      },
      eventName: "OwnershipTransferred",
      logIndex: 2
    }),
    createIndexedEvent({
      contractAddress: "0x0f133ac8d69a16efab20709479a521880b509613",
      contractName: "ProtocolConfig",
      data: {
        newTokenAllowlist: "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b",
        previousTokenAllowlist: "0x0000000000000000000000000000000000000000"
      },
      eventName: "TokenAllowlistUpdated",
      logIndex: 3
    }),
    createIndexedEvent({
      contractAddress: "0x0f133ac8d69a16efab20709479a521880b509613",
      contractName: "ProtocolConfig",
      data: {
        newTreasury: "0x573b6f6f84cdf764ee25cceea673a4cd259abfdb",
        previousTreasury: "0x0000000000000000000000000000000000000000"
      },
      eventName: "TreasuryUpdated",
      logIndex: 4
    }),
    createIndexedEvent({
      contractAddress: "0xeca4953857048466bd2958273c9b470c28ecab2e",
      contractName: "FeeVault",
      data: {
        newOwner: "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
        previousOwner: "0x0000000000000000000000000000000000000000"
      },
      eventName: "OwnershipTransferred",
      logIndex: 5
    }),
    createIndexedEvent({
      contractAddress: "0xeca4953857048466bd2958273c9b470c28ecab2e",
      contractName: "FeeVault",
      data: {
        newTreasury: "0x573b6f6f84cdf764ee25cceea673a4cd259abfdb",
        previousTreasury: "0x0000000000000000000000000000000000000000"
      },
      eventName: "TreasuryUpdated",
      logIndex: 6
    }),
    createIndexedEvent({
      blockHash: "0xbbbbccccddddeeeeffff0000111122223333444455556666777788889999aaaa",
      blockNumber: "101",
      contractAddress: "0x43292d7fac721139157c69effd18afc6739815f6",
      contractName: "EscrowAgreement",
      data: {
        arbitrator: "0x0000000000000000000000000000000000000000",
        buyer: "0x1111111111111111111111111111111111111111",
        dealId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        dealVersionHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        factory: "0x47ca3d3f2f6a62240c1e1197dabdf45f05534d83",
        feeVault: "0xeca4953857048466bd2958273c9b470c28ecab2e",
        milestoneCount: "2",
        protocolConfig: "0x0f133ac8d69a16efab20709479a521880b509613",
        protocolFeeBps: "0",
        seller: "0x2222222222222222222222222222222222222222",
        settlementToken: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
        totalAmount: "1000"
      },
      eventName: "AgreementInitialized",
      logIndex: 0,
      topic0: "0x02",
      topics: ["0x02"],
      transactionHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0001",
      transactionIndex: 1
    }),
    createIndexedEvent({
      blockHash: "0xbbbbccccddddeeeeffff0000111122223333444455556666777788889999aaaa",
      blockNumber: "101",
      contractAddress: "0x47ca3d3f2f6a62240c1e1197dabdf45f05534d83",
      contractName: "EscrowFactory",
      data: {
        agreement: "0x43292d7fac721139157c69effd18afc6739815f6",
        arbitrator: "0x0000000000000000000000000000000000000000",
        buyer: "0x1111111111111111111111111111111111111111",
        dealId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        dealVersionHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        milestoneCount: "2",
        protocolConfig: "0x0f133ac8d69a16efab20709479a521880b509613",
        seller: "0x2222222222222222222222222222222222222222",
        settlementToken: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
        totalAmount: "1000"
      },
      eventName: "AgreementCreated",
      logIndex: 1,
      topic0: "0x03",
      topics: ["0x03"],
      transactionHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0001",
      transactionIndex: 1
    })
  ];

  await applyIndexedEvents(repositories, events);

  const ownerships = await repositories.contractOwnerships.listByChainId(84532);
  const tokenEntries = await repositories.tokenAllowlistEntries.listAllowedByChainIdAndContract(
    84532,
    "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b"
  );
  const protocolConfig = await repositories.protocolConfigStates.findByChainIdAndAddress(
    84532,
    "0x0f133ac8d69a16efab20709479a521880b509613"
  );
  const feeVault = await repositories.feeVaultStates.findByChainIdAndAddress(
    84532,
    "0xeca4953857048466bd2958273c9b470c28ecab2e"
  );
  const agreements = await repositories.escrowAgreements.listByChainId(84532);

  assert.equal(ownerships.length, 3);
  assert.equal(tokenEntries.length, 1);
  assert.equal(protocolConfig?.treasuryAddress, "0x573b6f6f84cdf764ee25cceea673a4cd259abfdb");
  assert.equal(
    protocolConfig?.tokenAllowlistAddress,
    "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b"
  );
  assert.equal(feeVault?.treasuryAddress, "0x573b6f6f84cdf764ee25cceea673a4cd259abfdb");
  assert.equal(agreements.length, 1);
  assert.equal(
    agreements[0]?.agreementAddress,
    "0x43292d7fac721139157c69effd18afc6739815f6"
  );
  assert.equal(agreements[0]?.protocolFeeBps, 0);
  assert.equal(agreements[0]?.arbitratorAddress, null);
});

test("resetRelease4Projections clears derived state and replay rebuilds it", async () => {
  const repositories = new InMemoryRelease4Repositories();
  const events = [
    createIndexedEvent({
      contractAddress: "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b",
      contractName: "TokenAllowlist",
      data: {
        newOwner: "0x00e5e8d73a66588ab7fb63383f8f558ba59c929d",
        previousOwner: "0x0000000000000000000000000000000000000000"
      },
      eventName: "OwnershipTransferred"
    }),
    createIndexedEvent({
      contractAddress: "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b",
      contractName: "TokenAllowlist",
      data: {
        allowed: true,
        token: "0x036cbd53842c5426634e7929541ec2318f3dcf7e"
      },
      eventName: "TokenStatusUpdated",
      logIndex: 1
    })
  ];

  await applyIndexedEvents(repositories, events);
  await resetRelease4Projections(repositories, 84532);

  assert.equal(
    (await repositories.contractOwnerships.listByChainId(84532)).length,
    0
  );
  assert.equal(
    (
      await repositories.tokenAllowlistEntries.listAllowedByChainIdAndContract(
        84532,
        "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b"
      )
    ).length,
    0
  );

  await applyIndexedEvents(repositories, events);

  assert.equal(
    (
      await repositories.tokenAllowlistEntries.listAllowedByChainIdAndContract(
        84532,
        "0xa46bb7cc73f292d77e27b27fac6863601ce1d49b"
      )
    ).length,
    1
  );
});
