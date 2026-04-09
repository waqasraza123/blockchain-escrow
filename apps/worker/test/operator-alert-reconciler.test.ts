import assert from "node:assert/strict";
import test from "node:test";

import type {
  ChainCursorRecord,
  DealMilestoneDisputeDecisionRecord,
  DealMilestoneDisputeRecord,
  FundingTransactionRecord,
  OperatorAlertRecord,
  Release1Repositories,
  Release4Repositories,
  Release8Repositories,
  DealMilestoneSettlementExecutionTransactionRecord
} from "@blockchain-escrow/db";

import type { WorkerOperatorAlertConfiguration } from "../src/config";
import {
  OperatorAlertReconciler,
  type OperatorAlertReconciliationResult
} from "../src/operator-alert-reconciler";

const configuration: WorkerOperatorAlertConfiguration = {
  indexerBaseUrl: "http://127.0.0.1:4200",
  indexerFreshnessTtlSeconds: 300,
  release4CursorKey: "release4:base-sepolia",
  requestTimeoutMs: 3000,
  unresolvedDisputeAfterSeconds: 86400
};

function createFundingTransaction(
  overrides: Partial<FundingTransactionRecord> = {}
): FundingTransactionRecord {
  return {
    chainId: 84532,
    dealVersionId: "version-1",
    draftDealId: "draft-1",
    id: "funding-1",
    organizationId: "org-1",
    reconciledAgreementAddress: null,
    reconciledAt: null,
    reconciledConfirmedAt: null,
    reconciledMatchesTrackedVersion: null,
    reconciledStatus: null,
    stalePendingEscalatedAt: "2026-04-08T12:00:00.000Z",
    submittedAt: "2026-04-08T11:00:00.000Z",
    submittedByUserId: "user-1",
    submittedWalletAddress:
      "0x1111111111111111111111111111111111111111",
    submittedWalletId: "wallet-1",
    supersededAt: null,
    supersededByFundingTransactionId: null,
    transactionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212",
    ...overrides
  };
}

function createSettlementTransaction(
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
    id: "settlement-1",
    organizationId: "org-1",
    reconciledAgreementAddress: null,
    reconciledAt: null,
    reconciledConfirmedAt: null,
    reconciledMatchesTrackedAgreement: null,
    reconciledStatus: "FAILED",
    stalePendingEscalatedAt: null,
    submittedAt: "2026-04-08T11:30:00.000Z",
    submittedByUserId: "user-1",
    submittedWalletAddress:
      "0x1111111111111111111111111111111111111111",
    submittedWalletId: "wallet-1",
    supersededAt: null,
    supersededByDealMilestoneSettlementExecutionTransactionId: null,
    transactionHash:
      "0x3434343434343434343434343434343434343434343434343434343434343434",
    ...overrides
  };
}

function createDispute(
  overrides: Partial<DealMilestoneDisputeRecord> = {}
): DealMilestoneDisputeRecord {
  return {
    dealMilestoneReviewId: "review-1",
    dealMilestoneSubmissionId: "submission-1",
    dealVersionId: "version-1",
    dealVersionMilestoneId: "milestone-1",
    draftDealId: "draft-1",
    id: "dispute-1",
    openedAt: "2026-04-07T00:00:00.000Z",
    openedByUserId: "user-1",
    organizationId: "org-1",
    statementMarkdown: "Unresolved delivery dispute",
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

function createRelease1Repositories(input?: {
  decisions?: DealMilestoneDisputeDecisionRecord[];
  disputes?: DealMilestoneDisputeRecord[];
  fundingTransactions?: FundingTransactionRecord[];
  settlementTransactions?: DealMilestoneSettlementExecutionTransactionRecord[];
}) {
  const disputes = input?.disputes ?? [];
  const decisions = input?.decisions ?? [];
  const fundingTransactions = input?.fundingTransactions ?? [];
  const settlementTransactions = input?.settlementTransactions ?? [];

  return {
    repositories: {
      dealMilestoneDisputeDecisions: {
        findByDealMilestoneDisputeId: async (
          dealMilestoneDisputeId: string
        ): Promise<DealMilestoneDisputeDecisionRecord | null> =>
          decisions.find((entry) => entry.dealMilestoneDisputeId === dealMilestoneDisputeId) ??
          null
      },
      dealMilestoneDisputes: {
        listAll: async (): Promise<DealMilestoneDisputeRecord[]> => disputes
      },
      dealMilestoneSettlementExecutionTransactions: {
        listByChainId: async (
          chainId: number
        ): Promise<DealMilestoneSettlementExecutionTransactionRecord[]> =>
          settlementTransactions.filter((entry) => entry.chainId === chainId)
      },
      fundingTransactions: {
        listByChainId: async (chainId: number): Promise<FundingTransactionRecord[]> =>
          fundingTransactions.filter((entry) => entry.chainId === chainId)
      }
    } as unknown as Release1Repositories
  };
}

function createRelease4Repositories(cursor: ChainCursorRecord | null) {
  return {
    repositories: {
      chainCursors: {
        findByChainIdAndCursorKey: async (
          chainId: number,
          cursorKey: string
        ): Promise<ChainCursorRecord | null> => {
          void chainId;
          void cursorKey;
          return cursor;
        }
      }
    } as unknown as Release4Repositories
  };
}

function createRelease8Repositories(initialAlerts: OperatorAlertRecord[] = []) {
  const alerts = [...initialAlerts];

  return {
    alerts,
    repositories: {
      operatorAlerts: {
        create: async (record: OperatorAlertRecord): Promise<OperatorAlertRecord> => {
          alerts.push(record);
          return record;
        },
        findByFingerprint: async (
          fingerprint: string
        ): Promise<OperatorAlertRecord | null> =>
          alerts.find((entry) => entry.fingerprint === fingerprint) ?? null,
        listAll: async (): Promise<OperatorAlertRecord[]> => [...alerts],
        update: async (
          id: string,
          updates: Partial<Omit<OperatorAlertRecord, "id" | "fingerprint" | "firstDetectedAt">>
        ): Promise<OperatorAlertRecord> => {
          const alert = alerts.find((entry) => entry.id === id) ?? null;

          if (!alert) {
            throw new Error(`operator alert not found: ${id}`);
          }

          Object.assign(alert, updates);
          return alert;
        }
      }
    } as unknown as Release8Repositories
  };
}

function createReadyResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status
  });
}

test("operator alert reconciler creates deterministic workflow and system alerts", async () => {
  const release1 = createRelease1Repositories({
    disputes: [createDispute()],
    fundingTransactions: [createFundingTransaction()],
    settlementTransactions: [createSettlementTransaction()]
  });
  const release4 = createRelease4Repositories(
    createChainCursor("2026-04-08T00:00:00.000Z")
  );
  const release8 = createRelease8Repositories();
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);

    if (url.endsWith("/health/live")) {
      return createReadyResponse({ service: "indexer" }, 503);
    }

    return createReadyResponse({
      driftError: "projection drift detected",
      ready: false,
      service: "indexer"
    }, 503);
  };

  const reconciler = new OperatorAlertReconciler(
    release1.repositories,
    release4.repositories,
    release8.repositories,
    84532,
    configuration,
    fetcher,
    () => "2026-04-09T12:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();
  const kinds = release8.alerts.map((entry) => entry.kind).sort();

  assert.equal(result.activeOperatorAlertCount, 6);
  assert.deepEqual(kinds, [
    "DISPUTE_UNRESOLVED",
    "FUNDING_TRANSACTION_STALE_PENDING",
    "INDEXER_CURSOR_STALE",
    "INDEXER_DRIFT_FAILURE",
    "SERVICE_UNHEALTHY",
    "SETTLEMENT_EXECUTION_FAILED"
  ]);
});

test("operator alert reconciler reopens recurring alerts and auto-resolves cleared alerts", async () => {
  const existingAlerts: OperatorAlertRecord[] = [
    {
      acknowledgedAt: null,
      acknowledgedByOperatorAccountId: null,
      agreementAddress: null,
      assignedOperatorAccountId: null,
      dealVersionId: "version-1",
      description: "Funding transaction remains pending beyond the stale threshold.",
      draftDealId: "draft-1",
      fingerprint: "FUNDING_TRANSACTION_STALE_PENDING:funding-1",
      firstDetectedAt: "2026-04-08T12:00:00.000Z",
      id: "alert-1",
      kind: "FUNDING_TRANSACTION_STALE_PENDING",
      lastDetectedAt: "2026-04-08T12:00:00.000Z",
      linkedComplianceCaseId: null,
      metadata: null,
      organizationId: "org-1",
      resolvedAt: "2026-04-08T13:00:00.000Z",
      resolvedByOperatorAccountId: "operator-1",
      severity: "MEDIUM",
      status: "RESOLVED",
      subjectId: "funding-1",
      subjectLabel:
        "0x1212121212121212121212121212121212121212121212121212121212121212",
      subjectType: "FUNDING_TRANSACTION"
    },
    {
      acknowledgedAt: null,
      acknowledgedByOperatorAccountId: null,
      agreementAddress: null,
      assignedOperatorAccountId: null,
      dealVersionId: null,
      description: "Release 4 cursor freshness is outside the configured operator threshold.",
      draftDealId: null,
      fingerprint: "INDEXER_CURSOR_STALE:84532:release4:base-sepolia",
      firstDetectedAt: "2026-04-08T12:00:00.000Z",
      id: "alert-2",
      kind: "INDEXER_CURSOR_STALE",
      lastDetectedAt: "2026-04-08T12:00:00.000Z",
      linkedComplianceCaseId: null,
      metadata: null,
      organizationId: null,
      resolvedAt: null,
      resolvedByOperatorAccountId: null,
      severity: "HIGH",
      status: "OPEN",
      subjectId: "release4-cursor:84532:release4:base-sepolia",
      subjectLabel: "Release 4 cursor",
      subjectType: "SYSTEM"
    }
  ];
  const release1 = createRelease1Repositories({
    disputes: [],
    fundingTransactions: [createFundingTransaction()],
    settlementTransactions: []
  });
  const release4 = createRelease4Repositories(
    createChainCursor("2026-04-09T11:59:30.000Z")
  );
  const release8 = createRelease8Repositories(existingAlerts);
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);

    if (url.endsWith("/health/live")) {
      return createReadyResponse({ service: "indexer" });
    }

    return createReadyResponse({
      driftError: null,
      ready: true,
      service: "indexer"
    });
  };

  const reconciler = new OperatorAlertReconciler(
    release1.repositories,
    release4.repositories,
    release8.repositories,
    84532,
    configuration,
    fetcher,
    () => "2026-04-09T12:00:00.000Z"
  );

  const result: OperatorAlertReconciliationResult = await reconciler.reconcileOnce();
  const reopenedFundingAlert = release8.alerts.find((entry) => entry.id === "alert-1");
  const resolvedCursorAlert = release8.alerts.find((entry) => entry.id === "alert-2");

  assert.equal(result.reopenedOperatorAlertCount, 1);
  assert.equal(result.autoResolvedOperatorAlertCount, 1);
  assert.equal(reopenedFundingAlert?.status, "OPEN");
  assert.equal(reopenedFundingAlert?.resolvedAt, null);
  assert.equal(resolvedCursorAlert?.status, "RESOLVED");
});
