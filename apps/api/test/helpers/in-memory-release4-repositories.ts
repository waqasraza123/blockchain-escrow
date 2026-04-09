import type {
  ArbitratorRegistryEntryRecord,
  ChainCursorRecord,
  ContractOwnershipRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  FeeVaultStateRecord,
  IndexedBlockRecord,
  IndexedContractEventRecord,
  IndexedTransactionRecord,
  ProtocolConfigStateRecord,
  Release4Repositories,
  TokenAllowlistEntryRecord
} from "@blockchain-escrow/db";

export class InMemoryRelease4Repositories implements Release4Repositories {
  readonly arbitratorRegistryEntries = {
    listApprovedByChainIdAndContract: async (
      chainId: number,
      arbitratorRegistryAddress: string
    ) =>
      this.arbitratorRegistryEntriesStore.filter(
        (record) =>
          record.chainId === chainId &&
          record.arbitratorRegistryAddress === arbitratorRegistryAddress &&
          record.isApproved
      ),
    listByChainId: async (chainId: number) =>
      this.arbitratorRegistryEntriesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.arbitratorRegistryEntriesStore = this.arbitratorRegistryEntriesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: ArbitratorRegistryEntryRecord) => {
      this.arbitratorRegistryEntriesStore = this.arbitratorRegistryEntriesStore.filter(
        (entry) =>
          !(
            entry.chainId === record.chainId &&
            entry.arbitratorRegistryAddress === record.arbitratorRegistryAddress &&
            entry.arbitrator === record.arbitrator
          )
      );
      this.arbitratorRegistryEntriesStore.push(record);
      return record;
    }
  };

  readonly chainCursors = {
    findByChainIdAndCursorKey: async (
      chainId: number,
      cursorKey: string
    ): Promise<ChainCursorRecord | null> =>
      this.chainCursorStore.find(
        (record) => record.chainId === chainId && record.cursorKey === cursorKey
      ) ?? null,
    upsert: async (record: ChainCursorRecord) => {
      this.chainCursorStore = this.chainCursorStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.cursorKey === record.cursorKey)
      );
      this.chainCursorStore.push(record);
      return record;
    }
  };

  readonly contractOwnerships = {
    listByChainId: async (chainId: number) =>
      this.contractOwnershipsStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.contractOwnershipsStore = this.contractOwnershipsStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: ContractOwnershipRecord) => {
      this.contractOwnershipsStore = this.contractOwnershipsStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.contractAddress === record.contractAddress)
      );
      this.contractOwnershipsStore.push(record);
      return record;
    }
  };

  readonly escrowAgreements = {
    findByChainIdAndAddress: async (chainId: number, agreementAddress: string) =>
      this.escrowAgreementsStore.find(
        (record) => record.chainId === chainId && record.agreementAddress === agreementAddress
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.escrowAgreementsStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.escrowAgreementsStore = this.escrowAgreementsStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: EscrowAgreementRecord) => {
      this.escrowAgreementsStore = this.escrowAgreementsStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.agreementAddress === record.agreementAddress)
      );
      this.escrowAgreementsStore.push(record);
      return record;
    }
  };

  readonly escrowAgreementMilestoneSettlements = {
    listByChainId: async (chainId: number) =>
      this.escrowAgreementMilestoneSettlementsStore.filter(
        (record) => record.chainId === chainId
      ),
    listByChainIdAndAgreementAddress: async (
      chainId: number,
      agreementAddress: string
    ) =>
      this.escrowAgreementMilestoneSettlementsStore.filter(
        (record) =>
          record.chainId === chainId && record.agreementAddress === agreementAddress
      ),
    resetByChainId: async (chainId: number) => {
      this.escrowAgreementMilestoneSettlementsStore =
        this.escrowAgreementMilestoneSettlementsStore.filter(
          (record) => record.chainId !== chainId
        );
    },
    upsert: async (record: EscrowAgreementMilestoneSettlementRecord) => {
      this.escrowAgreementMilestoneSettlementsStore =
        this.escrowAgreementMilestoneSettlementsStore.filter(
          (entry) =>
            !(
              entry.chainId === record.chainId &&
              entry.agreementAddress === record.agreementAddress &&
              entry.milestonePosition === record.milestonePosition
            )
        );
      this.escrowAgreementMilestoneSettlementsStore.push(record);
      return record;
    }
  };

  readonly feeVaultStates = {
    findByChainIdAndAddress: async (chainId: number, feeVaultAddress: string) =>
      this.feeVaultStatesStore.find(
        (record) => record.chainId === chainId && record.feeVaultAddress === feeVaultAddress
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.feeVaultStatesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.feeVaultStatesStore = this.feeVaultStatesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: FeeVaultStateRecord) => {
      this.feeVaultStatesStore = this.feeVaultStatesStore.filter(
        (entry) =>
          !(entry.chainId === record.chainId && entry.feeVaultAddress === record.feeVaultAddress)
      );
      this.feeVaultStatesStore.push(record);
      return record;
    }
  };

  readonly indexedBlocks = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      void chainId;
      void fromBlockNumber;
    },
    findByChainIdAndBlockNumber: async (
      chainId: number,
      blockNumber: string
    ): Promise<IndexedBlockRecord | null> => {
      void chainId;
      void blockNumber;
      return null;
    },
    listByChainId: async (chainId: number): Promise<IndexedBlockRecord[]> => {
      void chainId;
      return [];
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
    listByChainId: async (chainId: number): Promise<IndexedContractEventRecord[]> => {
      void chainId;
      return [];
    },
    upsertMany: async (records: IndexedContractEventRecord[]) => {
      void records;
    }
  };

  readonly indexedTransactions = {
    deleteFromBlockNumber: async (chainId: number, fromBlockNumber: string) => {
      this.indexedTransactionsStore = this.indexedTransactionsStore.filter(
        (record) =>
          !(
            record.chainId === chainId &&
            BigInt(record.blockNumber) >= BigInt(fromBlockNumber)
          )
      );
    },
    findByChainIdAndTransactionHash: async (chainId: number, transactionHash: string) =>
      this.indexedTransactionsStore.find(
        (record) =>
          record.chainId === chainId && record.transactionHash === transactionHash
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.indexedTransactionsStore.filter((record) => record.chainId === chainId),
    upsertMany: async (records: IndexedTransactionRecord[]) => {
      for (const record of records) {
        this.indexedTransactionsStore = this.indexedTransactionsStore.filter(
          (entry) =>
            !(
              entry.chainId === record.chainId &&
              entry.transactionHash === record.transactionHash
            )
        );
        this.indexedTransactionsStore.push(record);
      }
    },
  };

  readonly protocolConfigStates = {
    findByChainIdAndAddress: async (chainId: number, protocolConfigAddress: string) =>
      this.protocolConfigStatesStore.find(
        (record) =>
          record.chainId === chainId && record.protocolConfigAddress === protocolConfigAddress
      ) ?? null,
    listByChainId: async (chainId: number) =>
      this.protocolConfigStatesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.protocolConfigStatesStore = this.protocolConfigStatesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: ProtocolConfigStateRecord) => {
      this.protocolConfigStatesStore = this.protocolConfigStatesStore.filter(
        (entry) =>
          !(
            entry.chainId === record.chainId &&
            entry.protocolConfigAddress === record.protocolConfigAddress
          )
      );
      this.protocolConfigStatesStore.push(record);
      return record;
    }
  };

  readonly tokenAllowlistEntries = {
    listAllowedByChainIdAndContract: async (
      chainId: number,
      tokenAllowlistAddress: string
    ) =>
      this.tokenAllowlistEntriesStore.filter(
        (record) =>
          record.chainId === chainId &&
          record.tokenAllowlistAddress === tokenAllowlistAddress &&
          record.isAllowed
      ),
    listByChainId: async (chainId: number) =>
      this.tokenAllowlistEntriesStore.filter((record) => record.chainId === chainId),
    resetByChainId: async (chainId: number) => {
      this.tokenAllowlistEntriesStore = this.tokenAllowlistEntriesStore.filter(
        (record) => record.chainId !== chainId
      );
    },
    upsert: async (record: TokenAllowlistEntryRecord) => {
      this.tokenAllowlistEntriesStore = this.tokenAllowlistEntriesStore.filter(
        (entry) =>
          !(
            entry.chainId === record.chainId &&
            entry.tokenAllowlistAddress === record.tokenAllowlistAddress &&
            entry.token === record.token
          )
      );
      this.tokenAllowlistEntriesStore.push(record);
      return record;
    }
  };

  private arbitratorRegistryEntriesStore: ArbitratorRegistryEntryRecord[] = [];
  private chainCursorStore: ChainCursorRecord[] = [];
  private contractOwnershipsStore: ContractOwnershipRecord[] = [];
  private escrowAgreementsStore: EscrowAgreementRecord[] = [];
  private escrowAgreementMilestoneSettlementsStore: EscrowAgreementMilestoneSettlementRecord[] =
    [];
  private feeVaultStatesStore: FeeVaultStateRecord[] = [];
  private indexedTransactionsStore: IndexedTransactionRecord[] = [];
  private protocolConfigStatesStore: ProtocolConfigStateRecord[] = [];
  private tokenAllowlistEntriesStore: TokenAllowlistEntryRecord[] = [];
}
