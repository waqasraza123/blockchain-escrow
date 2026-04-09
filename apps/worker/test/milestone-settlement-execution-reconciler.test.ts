import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuditLogRecord,
  ChainCursorRecord,
  DealMilestoneSettlementExecutionTransactionRecord,
  DealMilestoneSettlementPreparationRecord,
  IndexedTransactionRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";

import type { WorkerMilestoneSettlementExecutionReconciliationConfiguration } from "../src/config";
import { MilestoneSettlementExecutionReconciler } from "../src/milestone-settlement-execution-reconciler";

const configuration: WorkerMilestoneSettlementExecutionReconciliationConfiguration = {
  indexerFreshnessTtlSeconds: 300,
  pendingStaleAfterSeconds: 3600,
  release4CursorKey: "release4:base-sepolia"
};

function createSettlementExecutionTransaction(
  overrides: Partial<DealMilestoneSettlementExecutionTransactionRecord> = {}
): DealMilestoneSettlementExecutionTransactionRecord {
  return {
    chainId: 84532,
    dealMilestoneReviewId: "review-1",
    dealMilestoneSettlementRequestId: "settlement-request-1",
    dealMilestoneSubmissionId: "submission-1",
    dealVersionId: "version-1",
    dealVersionMilestoneId: "milestone-1",
    draftDealId: "draft-1",
    id: "settlement-execution-tx-1",
    organizationId: "org-1",
    reconciledAgreementAddress: null,
    reconciledAt: null,
    reconciledConfirmedAt: null,
    reconciledMatchesTrackedAgreement: null,
    reconciledStatus: null,
    stalePendingEscalatedAt: null,
    submittedAt: "2026-04-08T11:00:00.000Z",
    submittedByUserId: "user-1",
    submittedWalletAddress: "0x1111111111111111111111111111111111111111",
    submittedWalletId: "wallet-1",
    supersededAt: null,
    supersededByDealMilestoneSettlementExecutionTransactionId: null,
    transactionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212",
    ...overrides
  };
}

function createSettlementPreparation(
  overrides: Partial<DealMilestoneSettlementPreparationRecord> = {}
): DealMilestoneSettlementPreparationRecord {
  return {
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    dealMilestoneReviewId: "review-1",
    dealMilestoneSettlementRequestId: "settlement-request-1",
    dealMilestoneSubmissionId: "submission-1",
    dealVersionHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    dealVersionId: "version-1",
    dealVersionMilestoneId: "milestone-1",
    draftDealId: "draft-1",
    id: "settlement-preparation-1",
    kind: "RELEASE",
    milestoneAmountMinor: "1000000",
    milestonePosition: 1,
    organizationId: "org-1",
    preparedAt: "2026-04-08T10:00:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3000000",
    ...overrides
  };
}

function createIndexedTransaction(
  settlementExecutionTransaction: DealMilestoneSettlementExecutionTransactionRecord,
  overrides: Partial<IndexedTransactionRecord> = {}
): IndexedTransactionRecord {
  return {
    blockHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    blockNumber: "11",
    chainId: settlementExecutionTransaction.chainId,
    executionStatus: "SUCCESS",
    fromAddress: settlementExecutionTransaction.submittedWalletAddress,
    indexedAt: "2026-04-08T12:05:00.000Z",
    toAddress: "0x7777777777777777777777777777777777777777",
    transactionHash: settlementExecutionTransaction.transactionHash,
    transactionIndex: 0,
    ...overrides
  };
}

function createChainCursor(updatedAt: string): ChainCursorRecord {
  return {
    chainId: 84532,
    cursorKey: configuration.release4CursorKey,
    lastProcessedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastProcessedBlockNumber: "100",
    nextBlockNumber: "101",
    updatedAt
  };
}

function createRelease1Repositories(input: {
  settlementExecutionTransactions: DealMilestoneSettlementExecutionTransactionRecord[];
  settlementPreparations: DealMilestoneSettlementPreparationRecord[];
}) {
  const auditLogs: AuditLogRecord[] = [];

  return {
    auditLogs,
    repositories: {
      auditLogs: {
        append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
          auditLogs.push(record);
          return record;
        }
      },
      dealMilestoneSettlementExecutionTransactions: {
        listByChainId: async (
          chainId: number
        ): Promise<DealMilestoneSettlementExecutionTransactionRecord[]> =>
          input.settlementExecutionTransactions.filter(
            (record) => record.chainId === chainId
          ),
        markStalePendingEscalated: async (
          id: string,
          stalePendingEscalatedAt: string
        ): Promise<DealMilestoneSettlementExecutionTransactionRecord> => {
          const record =
            input.settlementExecutionTransactions.find((entry) => entry.id === id) ??
            null;

          if (!record) {
            throw new Error(`Settlement execution transaction not found: ${id}`);
          }

          record.stalePendingEscalatedAt = stalePendingEscalatedAt;
          return record;
        },
        updateReconciliation: async (
          id: string,
          reconciliation: Pick<
            DealMilestoneSettlementExecutionTransactionRecord,
            | "reconciledAgreementAddress"
            | "reconciledAt"
            | "reconciledConfirmedAt"
            | "reconciledMatchesTrackedAgreement"
            | "reconciledStatus"
          >
        ): Promise<DealMilestoneSettlementExecutionTransactionRecord> => {
          const record =
            input.settlementExecutionTransactions.find((entry) => entry.id === id) ??
            null;

          if (!record) {
            throw new Error(`Settlement execution transaction not found: ${id}`);
          }

          record.reconciledAgreementAddress = reconciliation.reconciledAgreementAddress;
          record.reconciledAt = reconciliation.reconciledAt;
          record.reconciledConfirmedAt = reconciliation.reconciledConfirmedAt;
          record.reconciledMatchesTrackedAgreement =
            reconciliation.reconciledMatchesTrackedAgreement;
          record.reconciledStatus = reconciliation.reconciledStatus;
          return record;
        }
      },
      dealMilestoneSettlementPreparations: {
        listByChainId: async (
          chainId: number
        ): Promise<DealMilestoneSettlementPreparationRecord[]> =>
          input.settlementPreparations.filter((record) => record.chainId === chainId)
      }
    } as unknown as Release1Repositories
  };
}

function createRelease4Repositories(input?: {
  chainCursor?: ChainCursorRecord | null;
  indexedTransactions?: IndexedTransactionRecord[];
}) {
  const indexedTransactions = input?.indexedTransactions ?? [];
  const chainCursor = input?.chainCursor ?? null;

  return {
    repositories: {
      chainCursors: {
        findByChainIdAndCursorKey: async (
          chainId: number,
          cursorKey: string
        ): Promise<ChainCursorRecord | null> => {
          void chainId;
          void cursorKey;
          return chainCursor;
        }
      },
      indexedTransactions: {
        listByChainId: async (chainId: number): Promise<IndexedTransactionRecord[]> =>
          indexedTransactions.filter((record) => record.chainId === chainId)
      }
    } as unknown as Release4Repositories
  };
}

test("milestone settlement execution reconciler persists confirmed terminal reconciliation and emits an audit log", async () => {
  const settlementExecutionTransaction = createSettlementExecutionTransaction();
  const release1 = createRelease1Repositories({
    settlementExecutionTransactions: [settlementExecutionTransaction],
    settlementPreparations: [createSettlementPreparation()]
  });
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-08T12:04:00.000Z"),
    indexedTransactions: [createIndexedTransaction(settlementExecutionTransaction)]
  });
  const reconciler = new MilestoneSettlementExecutionReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    configuration,
    () => "2026-04-08T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.reconciledMilestoneSettlementExecutionTransactionCount, 1);
  assert.equal(result.clearedMilestoneSettlementExecutionReconciliationCount, 0);
  assert.equal(settlementExecutionTransaction.reconciledStatus, "CONFIRMED");
  assert.equal(
    settlementExecutionTransaction.reconciledAgreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
  assert.equal(
    settlementExecutionTransaction.reconciledAt,
    "2026-04-08T12:05:00.000Z"
  );
  assert.equal(
    release1.auditLogs[0]?.action,
    "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_RECONCILIATION_UPDATED"
  );
});

test("milestone settlement execution reconciler persists failed terminal reconciliation from reverted indexed transactions", async () => {
  const settlementExecutionTransaction = createSettlementExecutionTransaction();
  const release1 = createRelease1Repositories({
    settlementExecutionTransactions: [settlementExecutionTransaction],
    settlementPreparations: [createSettlementPreparation()]
  });
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-08T12:04:00.000Z"),
    indexedTransactions: [
      createIndexedTransaction(settlementExecutionTransaction, {
        executionStatus: "REVERTED"
      })
    ]
  });
  const reconciler = new MilestoneSettlementExecutionReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    configuration,
    () => "2026-04-08T12:05:00.000Z"
  );

  await reconciler.reconcileOnce();

  assert.equal(settlementExecutionTransaction.reconciledStatus, "FAILED");
  assert.equal(settlementExecutionTransaction.reconciledAgreementAddress, null);
  assert.equal(
    release1.auditLogs[0]?.action,
    "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_RECONCILIATION_UPDATED"
  );
});

test("milestone settlement execution reconciler clears stale terminal reconciliation when the transaction is no longer terminal", async () => {
  const settlementExecutionTransaction = createSettlementExecutionTransaction({
    reconciledAgreementAddress: "0x7777777777777777777777777777777777777777",
    reconciledAt: "2026-04-08T12:00:00.000Z",
    reconciledConfirmedAt: "2026-04-08T12:00:00.000Z",
    reconciledMatchesTrackedAgreement: true,
    reconciledStatus: "CONFIRMED"
  });
  const release1 = createRelease1Repositories({
    settlementExecutionTransactions: [settlementExecutionTransaction],
    settlementPreparations: [createSettlementPreparation()]
  });
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-08T12:04:00.000Z")
  });
  const reconciler = new MilestoneSettlementExecutionReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    configuration,
    () => "2026-04-08T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.reconciledMilestoneSettlementExecutionTransactionCount, 0);
  assert.equal(result.clearedMilestoneSettlementExecutionReconciliationCount, 1);
  assert.equal(settlementExecutionTransaction.reconciledStatus, null);
  assert.equal(settlementExecutionTransaction.reconciledAgreementAddress, null);
  assert.equal(settlementExecutionTransaction.reconciledAt, null);
  assert.equal(release1.auditLogs[0]?.metadata?.reconciliationCleared, true);
});

test("milestone settlement execution reconciler escalates stale pending transactions and emits an audit log", async () => {
  const settlementExecutionTransaction = createSettlementExecutionTransaction();
  const release1 = createRelease1Repositories({
    settlementExecutionTransactions: [settlementExecutionTransaction],
    settlementPreparations: [createSettlementPreparation()]
  });
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-08T12:04:00.000Z")
  });
  const reconciler = new MilestoneSettlementExecutionReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    configuration,
    () => "2026-04-08T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedMilestoneSettlementExecutionTransactionCount, 1);
  assert.equal(result.stalePendingMilestoneSettlementExecutionCount, 1);
  assert.equal(
    settlementExecutionTransaction.stalePendingEscalatedAt,
    "2026-04-08T12:05:00.000Z"
  );
  assert.equal(
    release1.auditLogs[0]?.action,
    "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_STALE_PENDING"
  );
});

test("milestone settlement execution reconciler defers stale escalation when the release4 cursor is stale", async () => {
  const settlementExecutionTransaction = createSettlementExecutionTransaction();
  const release1 = createRelease1Repositories({
    settlementExecutionTransactions: [settlementExecutionTransaction],
    settlementPreparations: [createSettlementPreparation()]
  });
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-08T11:50:00.000Z")
  });
  const reconciler = new MilestoneSettlementExecutionReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    configuration,
    () => "2026-04-08T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.stalePendingMilestoneSettlementExecutionCount, 0);
  assert.equal(settlementExecutionTransaction.stalePendingEscalatedAt, null);
  assert.equal(release1.auditLogs.length, 0);
});
