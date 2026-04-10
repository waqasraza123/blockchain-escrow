import assert from "node:assert/strict";
import test from "node:test";

import type {
  ApprovalRequestRecord,
  CostCenterRecord,
  DealMilestoneSettlementExecutionTransactionRecord,
  DealVersionMilestoneRecord,
  DealVersionRecord,
  DraftDealRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  FinanceExportArtifactRecord,
  FinanceExportJobRecord,
  FundingTransactionRecord,
  Release1Repositories,
  Release4Repositories,
  Release9Repositories,
  StatementSnapshotRecord
} from "@blockchain-escrow/db";
import { buildCanonicalDealId, type JsonObject } from "@blockchain-escrow/shared";

import {
  FinanceExportReconciler,
  type FinanceExportReconciliationResult
} from "../src/finance-export-reconciler";

function createDraft(overrides: Partial<DraftDealRecord> = {}): DraftDealRecord {
  return {
    costCenterId: "cost-center-1",
    createdAt: "2026-04-10T00:00:00.000Z",
    createdByUserId: "user-1",
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "ACTIVE",
    summary: "Expansion rollout",
    templateId: null,
    title: "Expansion Rollout",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides
  };
}

function createVersion(overrides: Partial<DealVersionRecord> = {}): DealVersionRecord {
  return {
    bodyMarkdown: "# Terms",
    createdAt: "2026-04-10T00:01:00.000Z",
    createdByUserId: "user-1",
    draftDealId: "draft-1",
    id: "version-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    summary: "Expansion rollout",
    templateId: null,
    title: "Expansion Rollout v1",
    versionNumber: 1,
    ...overrides
  };
}

function createMilestone(
  overrides: Partial<DealVersionMilestoneRecord> = {}
): DealVersionMilestoneRecord {
  return {
    amountMinor: "1000000",
    createdAt: "2026-04-10T00:02:00.000Z",
    dealVersionId: "version-1",
    description: "Ship the phase",
    dueAt: null,
    id: "milestone-1",
    position: 1,
    title: "Phase 1",
    ...overrides
  };
}

function createFundingTransaction(
  overrides: Partial<FundingTransactionRecord> = {}
): FundingTransactionRecord {
  return {
    chainId: 84532,
    dealVersionId: "version-1",
    draftDealId: "draft-1",
    id: "funding-1",
    organizationId: "org-1",
    reconciledAgreementAddress: "0x1111111111111111111111111111111111111111",
    reconciledAt: "2026-04-10T01:00:00.000Z",
    reconciledConfirmedAt: "2026-04-10T01:05:00.000Z",
    reconciledMatchesTrackedVersion: true,
    reconciledStatus: "CONFIRMED",
    stalePendingEscalatedAt: null,
    submittedAt: "2026-04-10T00:50:00.000Z",
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
    id: "settlement-execution-1",
    organizationId: "org-1",
    reconciledAgreementAddress: "0x1111111111111111111111111111111111111111",
    reconciledAt: "2026-04-10T02:00:00.000Z",
    reconciledConfirmedAt: "2026-04-10T02:05:00.000Z",
    reconciledMatchesTrackedAgreement: true,
    reconciledStatus: "CONFIRMED",
    stalePendingEscalatedAt: null,
    submittedAt: "2026-04-10T01:55:00.000Z",
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

function createApprovalRequest(
  overrides: Partial<ApprovalRequestRecord> = {}
): ApprovalRequestRecord {
  return {
    approvalPolicyId: "policy-1",
    costCenterId: "cost-center-1",
    decidedAt: null,
    dealVersionId: "version-1",
    dealVersionMilestoneId: null,
    draftDealId: "draft-1",
    id: "approval-request-1",
    kind: "FUNDING_TRANSACTION_CREATE",
    metadata: null,
    note: "Finance review",
    organizationId: "org-1",
    requestedAt: "2026-04-10T00:40:00.000Z",
    requestedByUserId: "user-1",
    settlementCurrency: "USDC",
    status: "PENDING",
    subjectFingerprint: "fingerprint-1",
    subjectId: "version-1",
    subjectLabel: "Expansion Rollout v1",
    subjectType: "DEAL_VERSION",
    title: "Expansion Rollout v1",
    totalAmountMinor: "1000000",
    ...overrides
  };
}

function createStatementSnapshot(
  overrides: Partial<StatementSnapshotRecord> = {}
): StatementSnapshotRecord {
  return {
    approvalRequestId: "approval-request-1",
    asOf: "2026-04-10T03:00:00.000Z",
    costCenterId: "cost-center-1",
    createdAt: "2026-04-10T03:00:00.000Z",
    createdByUserId: "user-1",
    dealVersionId: "version-1",
    draftDealId: "draft-1",
    id: "snapshot-1",
    kind: "DEAL_VERSION_SETTLEMENT",
    note: "Close of day",
    organizationId: "org-1",
    payload: {
      statement: {
        totalAmountMinor: "1000000"
      }
    } as JsonObject,
    ...overrides
  };
}

function createCostCenter(overrides: Partial<CostCenterRecord> = {}): CostCenterRecord {
  return {
    code: "ENG-001",
    createdAt: "2026-04-10T00:00:00.000Z",
    createdByUserId: "user-1",
    description: "Engineering",
    id: "cost-center-1",
    name: "Engineering",
    normalizedCode: "ENG-001",
    organizationId: "org-1",
    status: "ACTIVE",
    updatedAt: "2026-04-10T00:00:00.000Z",
    ...overrides
  };
}

function createAgreement(overrides: Partial<EscrowAgreementRecord> = {}): EscrowAgreementRecord {
  return {
    agreementAddress: "0x1111111111111111111111111111111111111111",
    arbitratorAddress: null,
    buyerAddress: "0x2222222222222222222222222222222222222222",
    chainId: 84532,
    createdBlockHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    createdBlockNumber: "120",
    createdLogIndex: 0,
    createdTransactionHash:
      "0x5656565656565656565656565656565656565656565656565656565656565656",
    dealId: buildCanonicalDealId("org-1", "draft-1"),
    dealVersionHash:
      "0x7878787878787878787878787878787878787878787878787878787878787878",
    factoryAddress: "0x5555555555555555555555555555555555555555",
    feeVaultAddress: "0x6666666666666666666666666666666666666666",
    funded: true,
    fundedAt: "2026-04-10T01:00:00.000Z",
    fundedBlockHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    fundedBlockNumber: "121",
    fundedLogIndex: 1,
    fundedPayerAddress: "0x2222222222222222222222222222222222222222",
    fundedTransactionHash:
      "0x1212121212121212121212121212121212121212121212121212121212121212",
    initializedBlockHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    initializedBlockNumber: "119",
    initializedLogIndex: 0,
    initializedTimestamp: "2026-04-10T00:59:00.000Z",
    initializedTransactionHash:
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    milestoneCount: 1,
    protocolConfigAddress: "0x7777777777777777777777777777777777777777",
    protocolFeeBps: 100,
    sellerAddress: "0x3333333333333333333333333333333333333333",
    settlementTokenAddress:
      "0x4444444444444444444444444444444444444444",
    totalAmount: "1000000",
    updatedAt: "2026-04-10T01:00:00.000Z",
    ...overrides
  };
}

function createIndexedSettlement(
  overrides: Partial<EscrowAgreementMilestoneSettlementRecord> = {}
): EscrowAgreementMilestoneSettlementRecord {
  return {
    agreementAddress: "0x1111111111111111111111111111111111111111",
    amount: "1000000",
    beneficiaryAddress: "0x3333333333333333333333333333333333333333",
    chainId: 84532,
    dealId: buildCanonicalDealId("org-1", "draft-1"),
    dealVersionHash:
      "0x7878787878787878787878787878787878787878787878787878787878787878",
    kind: "RELEASE",
    milestonePosition: 1,
    settledAt: "2026-04-10T02:10:00.000Z",
    settledBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    settledBlockNumber: "123",
    settledByAddress: "0x2222222222222222222222222222222222222222",
    settledLogIndex: 0,
    settledTransactionHash:
      "0x9999999999999999999999999999999999999999999999999999999999999999",
    updatedAt: "2026-04-10T02:10:00.000Z",
    ...overrides
  };
}

function createPendingJob(
  overrides: Partial<FinanceExportJobRecord> = {}
): FinanceExportJobRecord {
  return {
    createdAt: "2026-04-10T04:00:00.000Z",
    createdByUserId: "user-1",
    errorMessage: null,
    failedAt: null,
    filters: {} as JsonObject,
    finishedAt: null,
    id: "export-job-1",
    organizationId: "org-1",
    startedAt: null,
    status: "PENDING",
    ...overrides
  };
}

function createRepositories(input?: {
  approvalRequests?: ApprovalRequestRecord[];
  costCenters?: CostCenterRecord[];
  drafts?: DraftDealRecord[];
  failDraftListing?: boolean;
  jobs?: FinanceExportJobRecord[];
  milestones?: DealVersionMilestoneRecord[];
  settlements?: EscrowAgreementMilestoneSettlementRecord[];
  statementSnapshots?: StatementSnapshotRecord[];
  versions?: DealVersionRecord[];
}) {
  const approvalRequests = input?.approvalRequests ?? [createApprovalRequest()];
  const costCenters = input?.costCenters ?? [createCostCenter()];
  const drafts = input?.drafts ?? [createDraft()];
  const jobs = input?.jobs ?? [createPendingJob()];
  const milestones = input?.milestones ?? [createMilestone()];
  const settlements = input?.settlements ?? [createIndexedSettlement()];
  const statementSnapshots = input?.statementSnapshots ?? [createStatementSnapshot()];
  const versions = input?.versions ?? [createVersion()];
  const artifacts: FinanceExportArtifactRecord[] = [];
  const auditLogs: Array<{ action: string; entityId: string }> = [];

  return {
    artifacts,
    auditLogs,
    jobs,
    release1Repositories: {
      auditLogs: {
        append: async (record: { action: string; entityId: string }) => {
          auditLogs.push({ action: record.action, entityId: record.entityId });
          return record;
        }
      },
      dealMilestoneSettlementExecutionTransactions: {
        listByChainId: async () => [createSettlementExecutionTransaction()]
      },
      dealVersionMilestones: {
        listByDealVersionId: async () => milestones
      },
      dealVersions: {
        listByDraftDealId: async () => versions
      },
      draftDeals: {
        listByOrganizationId: async () => {
          if (input?.failDraftListing) {
            throw new Error("draft list unavailable");
          }

          return drafts;
        }
      },
      fundingTransactions: {
        listByDraftDealId: async () => [createFundingTransaction()]
      }
    } as unknown as Release1Repositories,
    release4Repositories: {
      escrowAgreementMilestoneSettlements: {
        listByChainId: async () => settlements
      },
      escrowAgreements: {
        listByChainId: async () => [createAgreement()]
      }
    } as unknown as Release4Repositories,
    release9Repositories: {
      approvalRequestSteps: {
        listByApprovalRequestId: async () => [
          {
            approvalRequestId: "approval-request-1",
            decidedAt: null,
            decidedByUserId: null,
            id: "step-1",
            label: "Owner review",
            note: null,
            position: 1,
            requiredRole: "OWNER",
            status: "PENDING"
          }
        ]
      },
      approvalRequests: {
        listByOrganizationId: async () => approvalRequests
      },
      costCenters: {
        listByOrganizationId: async () => costCenters
      },
      financeExportArtifacts: {
        create: async (record: FinanceExportArtifactRecord) => {
          artifacts.push(record);
          return record;
        }
      },
      financeExportJobs: {
        claimNextPending: async (startedAt: string) => {
          const job = jobs.find((record) => record.status === "PENDING") ?? null;

          if (!job) {
            return null;
          }

          job.startedAt = startedAt;
          job.status = "PROCESSING";
          return job;
        },
        update: async (
          id: string,
          updates: Partial<
            Omit<
              FinanceExportJobRecord,
              "id" | "organizationId" | "createdAt" | "createdByUserId" | "filters"
            >
          >
        ) => {
          const job = jobs.find((record) => record.id === id);

          if (!job) {
            throw new Error(`job not found: ${id}`);
          }

          Object.assign(job, updates);
          return job;
        }
      },
      statementSnapshots: {
        listByOrganizationId: async () => statementSnapshots
      }
    } as unknown as Release9Repositories
  };
}

test("finance export reconciler claims a pending job and generates JSON and CSV artifacts", async () => {
  const repositories = createRepositories();
  const reconciler = new FinanceExportReconciler(
    repositories.release1Repositories,
    repositories.release4Repositories,
    repositories.release9Repositories,
    84532,
    () => "2026-04-10T05:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.deepEqual(result, {
    completedFinanceExportJobCount: 1,
    failedFinanceExportJobCount: 0,
    generatedFinanceExportArtifactCount: 2,
    processedFinanceExportJobCount: 1
  } satisfies FinanceExportReconciliationResult);
  assert.equal(repositories.jobs[0]?.status, "COMPLETED");
  assert.equal(repositories.artifacts.length, 2);
  assert.deepEqual(
    repositories.artifacts.map((artifact) => artifact.format).sort(),
    ["CSV", "JSON"]
  );

  const jsonArtifact = repositories.artifacts.find((artifact) => artifact.format === "JSON");
  const csvArtifact = repositories.artifacts.find((artifact) => artifact.format === "CSV");

  assert.ok(jsonArtifact);
  assert.ok(csvArtifact);
  assert.equal(jsonArtifact?.filename, "finance-export-export-job-1.json");
  assert.match(csvArtifact?.body ?? "", /approval_requests/);
  assert.match(csvArtifact?.body ?? "", /settlement_statement_aggregates/);

  const parsedJson = JSON.parse(jsonArtifact?.body ?? "{}") as {
    approvalRequests: unknown[];
    fundingTransactions: unknown[];
    settlementStatementAggregates: unknown[];
  };

  assert.equal(parsedJson.approvalRequests.length, 1);
  assert.equal(parsedJson.fundingTransactions.length, 1);
  assert.equal(parsedJson.settlementStatementAggregates.length, 1);
});

test("finance export reconciler marks the job failed when export generation throws", async () => {
  const repositories = createRepositories({
    failDraftListing: true
  });
  const reconciler = new FinanceExportReconciler(
    repositories.release1Repositories,
    repositories.release4Repositories,
    repositories.release9Repositories,
    84532,
    () => "2026-04-10T05:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.deepEqual(result, {
    completedFinanceExportJobCount: 0,
    failedFinanceExportJobCount: 1,
    generatedFinanceExportArtifactCount: 0,
    processedFinanceExportJobCount: 1
  } satisfies FinanceExportReconciliationResult);
  assert.equal(repositories.jobs[0]?.status, "FAILED");
  assert.match(repositories.jobs[0]?.errorMessage ?? "", /draft list unavailable/);
  assert.equal(repositories.artifacts.length, 0);
});
