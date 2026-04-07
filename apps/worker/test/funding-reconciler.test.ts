import assert from "node:assert/strict";
import test from "node:test";

import { getDeploymentManifestByChainId } from "@blockchain-escrow/contracts-sdk";
import type {
  AuditLogRecord,
  ChainCursorRecord,
  EscrowAgreementRecord,
  FundingTransactionRecord,
  IndexedTransactionRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { buildCanonicalDealId } from "@blockchain-escrow/shared";

import type { WorkerFundingReconciliationConfiguration } from "../src/config";
import { FundingReconciler } from "../src/funding-reconciler";

const fundingReconciliationConfiguration: WorkerFundingReconciliationConfiguration = {
  indexerFreshnessTtlSeconds: 300,
  pendingStaleAfterSeconds: 3600,
  release4CursorKey: "release4:base-sepolia"
};

function createFundingTransaction(
  overrides: Partial<FundingTransactionRecord> = {}
): FundingTransactionRecord {
  return {
    chainId: 84532,
    dealVersionId: "version-1",
    draftDealId: "draft-1",
    id: "funding-tx-1",
    organizationId: "org-1",
    reconciledAgreementAddress: null,
    reconciledAt: null,
    reconciledConfirmedAt: null,
    reconciledMatchesTrackedVersion: null,
    reconciledStatus: null,
    stalePendingEscalatedAt: null,
    submittedAt: "2026-04-06T11:00:00.000Z",
    submittedByUserId: "user-1",
    submittedWalletAddress: "0x1111111111111111111111111111111111111111",
    submittedWalletId: "wallet-1",
    supersededAt: null,
    supersededByFundingTransactionId: null,
    transactionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212",
    ...overrides
  };
}

function createRelease1Repositories(fundingTransactions: FundingTransactionRecord[]) {
  const auditLogs: AuditLogRecord[] = [];

  const repositories = {
    auditLogs: {
      append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
        auditLogs.push(record);
        return record;
      }
    },
    fundingTransactions: {
      listByChainId: async (chainId: number): Promise<FundingTransactionRecord[]> =>
        fundingTransactions.filter((transaction) => transaction.chainId === chainId),
      markStalePendingEscalated: async (
        id: string,
        stalePendingEscalatedAt: string
      ): Promise<FundingTransactionRecord> => {
        const transaction = fundingTransactions.find((entry) => entry.id === id) ?? null;

        if (!transaction) {
          throw new Error(`Funding transaction not found: ${id}`);
        }

        transaction.stalePendingEscalatedAt = stalePendingEscalatedAt;
        return transaction;
      },
      updateReconciliation: async (
        id: string,
        reconciliation: Pick<
          FundingTransactionRecord,
          | "reconciledAgreementAddress"
          | "reconciledAt"
          | "reconciledConfirmedAt"
          | "reconciledMatchesTrackedVersion"
          | "reconciledStatus"
        >
      ): Promise<FundingTransactionRecord> => {
        const transaction = fundingTransactions.find((entry) => entry.id === id) ?? null;

        if (!transaction) {
          throw new Error(`Funding transaction not found: ${id}`);
        }

        transaction.reconciledAgreementAddress =
          reconciliation.reconciledAgreementAddress;
        transaction.reconciledAt = reconciliation.reconciledAt;
        transaction.reconciledConfirmedAt =
          reconciliation.reconciledConfirmedAt;
        transaction.reconciledMatchesTrackedVersion =
          reconciliation.reconciledMatchesTrackedVersion;
        transaction.reconciledStatus = reconciliation.reconciledStatus;

        return transaction;
      }
    }
  } as unknown as Release1Repositories;

  return { auditLogs, repositories };
}

function createRelease4Repositories(input?: {
  agreements?: EscrowAgreementRecord[];
  chainCursor?: ChainCursorRecord | null;
  indexedTransactions?: IndexedTransactionRecord[];
}) {
  const agreements = input?.agreements ?? [];
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
      escrowAgreements: {
        listByChainId: async (chainId: number): Promise<EscrowAgreementRecord[]> =>
          agreements.filter((agreement) => agreement.chainId === chainId)
      },
      indexedTransactions: {
        listByChainId: async (chainId: number): Promise<IndexedTransactionRecord[]> =>
          indexedTransactions.filter((transaction) => transaction.chainId === chainId)
      }
    } as unknown as Release4Repositories
  };
}

function createChainCursor(updatedAt: string): ChainCursorRecord {
  return {
    chainId: 84532,
    cursorKey: fundingReconciliationConfiguration.release4CursorKey,
    lastProcessedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lastProcessedBlockNumber: "100",
    nextBlockNumber: "101",
    updatedAt
  };
}

function createObservedAgreement(
  fundingTransaction: FundingTransactionRecord,
  overrides: Partial<EscrowAgreementRecord> = {}
): EscrowAgreementRecord {
  const manifest = getDeploymentManifestByChainId(84532);

  assert.ok(manifest, "missing base sepolia manifest");

  return {
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress: null,
    buyerAddress: fundingTransaction.submittedWalletAddress,
    chainId: fundingTransaction.chainId,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash: fundingTransaction.transactionHash,
    dealId: buildCanonicalDealId(
      fundingTransaction.organizationId,
      fundingTransaction.draftDealId
    ),
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    factoryAddress: manifest.contracts.EscrowFactory!.toLowerCase() as `0x${string}`,
    feeVaultAddress: manifest.contracts.FeeVault!.toLowerCase() as `0x${string}`,
    funded: false,
    fundedAt: null,
    fundedBlockHash: null,
    fundedBlockNumber: null,
    fundedLogIndex: null,
    fundedPayerAddress: null,
    fundedTransactionHash: null,
    initializedBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: "2026-04-06T12:05:00.000Z",
    initializedTransactionHash: fundingTransaction.transactionHash,
    milestoneCount: 2,
    protocolConfigAddress:
      manifest.contracts.ProtocolConfig!.toLowerCase() as `0x${string}`,
    protocolFeeBps: manifest.protocolFeeBps,
    sellerAddress: "0x3333333333333333333333333333333333333333",
    settlementTokenAddress: manifest.usdcToken!.toLowerCase() as `0x${string}`,
    totalAmount: "3500000",
    updatedAt: "2026-04-06T12:05:00.000Z",
    ...overrides
  };
}

function createIndexedTransaction(
  fundingTransaction: FundingTransactionRecord,
  executionStatus: IndexedTransactionRecord["executionStatus"]
): IndexedTransactionRecord {
  return {
    blockHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    blockNumber: "11",
    chainId: fundingTransaction.chainId,
    executionStatus,
    fromAddress: fundingTransaction.submittedWalletAddress,
    indexedAt: "2026-04-06T12:05:00.000Z",
    toAddress: "0x9999999999999999999999999999999999999999",
    transactionHash: fundingTransaction.transactionHash,
    transactionIndex: 0
  };
}

test("funding reconciler persists confirmed terminal reconciliation and emits an audit log", async () => {
  const fundingTransaction = createFundingTransaction();
  const release1 = createRelease1Repositories([fundingTransaction]);
  const release4 = createRelease4Repositories({
    agreements: [createObservedAgreement(fundingTransaction)],
    chainCursor: createChainCursor("2026-04-06T12:04:00.000Z")
  });
  const reconciler = new FundingReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    fundingReconciliationConfiguration,
    () => "2026-04-06T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.reconciledFundingTransactionCount, 1);
  assert.equal(result.clearedFundingReconciliationCount, 0);
  assert.equal(fundingTransaction.reconciledStatus, "CONFIRMED");
  assert.equal(
    fundingTransaction.reconciledAgreementAddress,
    "0x7777777777777777777777777777777777777777"
  );
  assert.equal(fundingTransaction.reconciledAt, "2026-04-06T12:05:00.000Z");
  assert.equal(release1.auditLogs.length, 1);
  assert.equal(
    release1.auditLogs[0]?.action,
    "FUNDING_TRANSACTION_RECONCILIATION_UPDATED"
  );
});

test("funding reconciler persists failed terminal reconciliation from reverted indexed transactions", async () => {
  const fundingTransaction = createFundingTransaction();
  const release1 = createRelease1Repositories([fundingTransaction]);
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-06T12:04:00.000Z"),
    indexedTransactions: [createIndexedTransaction(fundingTransaction, "REVERTED")]
  });
  const reconciler = new FundingReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    fundingReconciliationConfiguration,
    () => "2026-04-06T12:05:00.000Z"
  );

  await reconciler.reconcileOnce();

  assert.equal(fundingTransaction.reconciledStatus, "FAILED");
  assert.equal(fundingTransaction.reconciledAgreementAddress, null);
  assert.equal(fundingTransaction.reconciledConfirmedAt, null);
  assert.equal(release1.auditLogs[0]?.action, "FUNDING_TRANSACTION_RECONCILIATION_UPDATED");
});

test("funding reconciler clears stale terminal reconciliation when the transaction is no longer terminal", async () => {
  const fundingTransaction = createFundingTransaction({
    reconciledAgreementAddress: "0x7777777777777777777777777777777777777777",
    reconciledAt: "2026-04-06T12:00:00.000Z",
    reconciledConfirmedAt: "2026-04-06T12:00:00.000Z",
    reconciledMatchesTrackedVersion: true,
    reconciledStatus: "CONFIRMED"
  });
  const release1 = createRelease1Repositories([fundingTransaction]);
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-06T12:04:00.000Z")
  });
  const reconciler = new FundingReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    fundingReconciliationConfiguration,
    () => "2026-04-06T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.reconciledFundingTransactionCount, 0);
  assert.equal(result.clearedFundingReconciliationCount, 1);
  assert.equal(fundingTransaction.reconciledStatus, null);
  assert.equal(fundingTransaction.reconciledAgreementAddress, null);
  assert.equal(fundingTransaction.reconciledAt, null);
  assert.equal(
    release1.auditLogs[0]?.metadata?.reconciliationCleared,
    true
  );
});

test("funding reconciler escalates stale pending transactions and emits an audit log", async () => {
  const fundingTransaction = createFundingTransaction();
  const release1 = createRelease1Repositories([fundingTransaction]);
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-06T12:04:00.000Z")
  });
  const reconciler = new FundingReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    fundingReconciliationConfiguration,
    () => "2026-04-06T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedFundingTransactionCount, 1);
  assert.equal(result.stalePendingEscalationCount, 1);
  assert.equal(
    fundingTransaction.stalePendingEscalatedAt,
    "2026-04-06T12:05:00.000Z"
  );
  assert.equal(release1.auditLogs.length, 1);
  assert.equal(release1.auditLogs[0]?.action, "FUNDING_TRANSACTION_STALE_PENDING");
});

test("funding reconciler defers stale escalation when the release4 cursor is stale", async () => {
  const fundingTransaction = createFundingTransaction();
  const release1 = createRelease1Repositories([fundingTransaction]);
  const release4 = createRelease4Repositories({
    chainCursor: createChainCursor("2026-04-06T11:50:00.000Z")
  });
  const reconciler = new FundingReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    fundingReconciliationConfiguration,
    () => "2026-04-06T12:05:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.stalePendingEscalationCount, 0);
  assert.equal(fundingTransaction.stalePendingEscalatedAt, null);
  assert.equal(release1.auditLogs.length, 0);
});
