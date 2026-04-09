import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuditLogRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSettlementPreparationRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionRecord,
  DealVersionMilestoneRecord,
  DealVersionRecord,
  DraftDealRecord,
  EscrowAgreementRecord,
  Release1Repositories,
  Release4Repositories
} from "@blockchain-escrow/db";
import { buildCanonicalDealId } from "@blockchain-escrow/shared";

import { MilestoneSettlementPreparationReconciler } from "../src/milestone-settlement-preparation-reconciler";

function createDraft(overrides: Partial<DraftDealRecord> = {}): DraftDealRecord {
  return {
    createdAt: "2026-04-08T00:00:00.000Z",
    createdByUserId: "user-1",
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "ACTIVE",
    summary: "Milestone draft",
    templateId: null,
    title: "Milestone draft",
    updatedAt: "2026-04-08T00:00:00.000Z",
    ...overrides
  };
}

function createVersion(draft: DraftDealRecord): DealVersionRecord {
  return {
    bodyMarkdown: "# Scope",
    createdAt: "2026-04-08T00:00:00.000Z",
    createdByUserId: "user-1",
    draftDealId: draft.id,
    id: "version-1",
    organizationId: draft.organizationId,
    settlementCurrency: "USDC",
    summary: null,
    templateId: null,
    title: "Milestone version",
    versionNumber: 1
  };
}

function createMilestone(version: DealVersionRecord): DealVersionMilestoneRecord {
  return {
    amountMinor: "1250000",
    createdAt: "2026-04-08T00:00:00.000Z",
    dealVersionId: version.id,
    description: null,
    dueAt: null,
    id: "milestone-1",
    position: 1,
    title: "Design"
  };
}

function createSubmission(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  milestone: DealVersionMilestoneRecord
): DealMilestoneSubmissionRecord {
  return {
    dealVersionId: version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: draft.id,
    id: "submission-1",
    organizationId: draft.organizationId,
    reviewDeadlineAt: "2026-04-15T00:00:00.000Z",
    scheme: null,
    signature: null,
    statementMarkdown: "Delivered",
    submissionNumber: 1,
    submittedAt: "2026-04-08T01:00:00.000Z",
    submittedByCounterpartyId: null,
    submittedByPartyRole: "SELLER",
    submittedByPartySubjectType: "ORGANIZATION",
    submittedByUserId: "user-1",
    typedData: null
  };
}

function createReview(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  milestone: DealVersionMilestoneRecord,
  submission: DealMilestoneSubmissionRecord,
  overrides: Partial<DealMilestoneReviewRecord> = {}
): DealMilestoneReviewRecord {
  return {
    decision: "APPROVED",
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: draft.id,
    id: "review-1",
    organizationId: draft.organizationId,
    reviewedAt: "2026-04-08T02:00:00.000Z",
    reviewedByUserId: "user-2",
    statementMarkdown: null,
    ...overrides
  };
}

function createSettlementRequest(
  draft: DraftDealRecord,
  version: DealVersionRecord,
  milestone: DealVersionMilestoneRecord,
  submission: DealMilestoneSubmissionRecord,
  review: DealMilestoneReviewRecord,
  overrides: Partial<DealMilestoneSettlementRequestRecord> = {}
): DealMilestoneSettlementRequestRecord {
  return {
    dealMilestoneReviewId: review.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: draft.id,
    id: "settlement-request-1",
    kind: "RELEASE",
    organizationId: draft.organizationId,
    requestedAt: "2026-04-08T03:00:00.000Z",
    requestedByUserId: "user-2",
    statementMarkdown: "Release funds.",
    ...overrides
  };
}

function createAgreement(
  draft: DraftDealRecord,
  overrides: Partial<EscrowAgreementRecord> = {}
): EscrowAgreementRecord {
  return {
    agreementAddress: "0x7777777777777777777777777777777777777777",
    arbitratorAddress: null,
    buyerAddress: "0x4444444444444444444444444444444444444444",
    chainId: 84532,
    createdBlockHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdBlockNumber: "10",
    createdLogIndex: 0,
    createdTransactionHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    dealId: buildCanonicalDealId(draft.organizationId, draft.id),
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    factoryAddress: "0x8888888888888888888888888888888888888888",
    feeVaultAddress: "0x9999999999999999999999999999999999999999",
    funded: true,
    fundedAt: "2026-04-08T00:30:00.000Z",
    fundedBlockHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    fundedBlockNumber: "11",
    fundedLogIndex: 0,
    fundedPayerAddress: "0x4444444444444444444444444444444444444444",
    fundedTransactionHash:
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    initializedBlockHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    initializedBlockNumber: "10",
    initializedLogIndex: 1,
    initializedTimestamp: "2026-04-08T00:00:00.000Z",
    initializedTransactionHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    milestoneCount: 2,
    protocolConfigAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    protocolFeeBps: 250,
    sellerAddress: "0x5555555555555555555555555555555555555555",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3500000",
    updatedAt: "2026-04-08T03:00:00.000Z",
    ...overrides
  };
}

function createRelease1Repositories(input: {
  drafts: DraftDealRecord[];
  milestones: DealVersionMilestoneRecord[];
  reviews: DealMilestoneReviewRecord[];
  settlementPreparations?: DealMilestoneSettlementPreparationRecord[];
  settlementRequests: DealMilestoneSettlementRequestRecord[];
  submissions: DealMilestoneSubmissionRecord[];
  versions: DealVersionRecord[];
}) {
  const auditLogs: AuditLogRecord[] = [];
  const settlementPreparations = [...(input.settlementPreparations ?? [])];
  const repositories = {
    auditLogs: {
      append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
        auditLogs.push(record);
        return record;
      }
    },
    dealMilestoneReviews: {
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealMilestoneReviewRecord[]> =>
        input.reviews.filter((record) => record.dealVersionId === dealVersionId)
    },
    dealMilestoneSettlementPreparations: {
      create: async (
        record: DealMilestoneSettlementPreparationRecord
      ): Promise<DealMilestoneSettlementPreparationRecord> => {
        settlementPreparations.push(record);
        return record;
      },
      findByDealMilestoneSettlementRequestId: async (
        dealMilestoneSettlementRequestId: string
      ): Promise<DealMilestoneSettlementPreparationRecord | null> =>
        settlementPreparations.find(
          (record) =>
            record.dealMilestoneSettlementRequestId === dealMilestoneSettlementRequestId
        ) ?? null,
      findById: async (
        id: string
      ): Promise<DealMilestoneSettlementPreparationRecord | null> =>
        settlementPreparations.find((record) => record.id === id) ?? null,
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealMilestoneSettlementPreparationRecord[]> =>
        settlementPreparations.filter((record) => record.dealVersionId === dealVersionId)
    },
    dealMilestoneSettlementRequests: {
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealMilestoneSettlementRequestRecord[]> =>
        input.settlementRequests.filter((record) => record.dealVersionId === dealVersionId)
    },
    dealMilestoneSubmissions: {
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealMilestoneSubmissionRecord[]> =>
        input.submissions.filter((record) => record.dealVersionId === dealVersionId)
    },
    dealVersionMilestones: {
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealVersionMilestoneRecord[]> =>
        input.milestones.filter((record) => record.dealVersionId === dealVersionId)
    },
    dealVersions: {
      findLatestByDraftDealId: async (draftDealId: string): Promise<DealVersionRecord | null> =>
        input.versions.find((record) => record.draftDealId === draftDealId) ?? null
    },
    draftDeals: {
      listByStates: async (
        states: DraftDealRecord["state"][]
      ): Promise<DraftDealRecord[]> =>
        input.drafts.filter((record) => states.includes(record.state))
    }
  } as unknown as Release1Repositories;

  return {
    auditLogs,
    repositories,
    settlementPreparations
  };
}

function createRelease4Repositories(agreements: EscrowAgreementRecord[]) {
  return {
    repositories: {
      escrowAgreements: {
        listByChainId: async (chainId: number): Promise<EscrowAgreementRecord[]> =>
          agreements.filter((agreement) => agreement.chainId === chainId)
      }
    } as unknown as Release4Repositories
  };
}

test("milestone settlement preparation reconciler persists immutable preparation records for latest settlement requests", async () => {
  const draft = createDraft();
  const version = createVersion(draft);
  const milestone = createMilestone(version);
  const submission = createSubmission(draft, version, milestone);
  const review = createReview(draft, version, milestone, submission);
  const settlementRequest = createSettlementRequest(
    draft,
    version,
    milestone,
    submission,
    review
  );
  const release1 = createRelease1Repositories({
    drafts: [draft],
    milestones: [milestone],
    reviews: [review],
    settlementRequests: [settlementRequest],
    submissions: [submission],
    versions: [version]
  });
  const release4 = createRelease4Repositories([createAgreement(draft)]);
  const reconciler = new MilestoneSettlementPreparationReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-08T04:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedMilestoneSettlementDraftCount, 1);
  assert.equal(result.scannedMilestoneSettlementRequestCount, 1);
  assert.equal(result.preparedMilestoneSettlementCount, 1);
  assert.equal(result.blockedMilestoneSettlementPreparationCount, 0);
  assert.equal(release1.settlementPreparations.length, 1);
  assert.equal(
    release1.settlementPreparations[0]?.dealMilestoneSettlementRequestId,
    settlementRequest.id
  );
  assert.equal(release1.settlementPreparations[0]?.preparedAt, "2026-04-08T04:00:00.000Z");
  assert.equal(release1.settlementPreparations[0]?.milestoneAmountMinor, milestone.amountMinor);
  assert.equal(release1.auditLogs.length, 1);
  assert.equal(
    release1.auditLogs[0]?.action,
    "DEAL_MILESTONE_SETTLEMENT_EXECUTION_PREPARED"
  );
  assert.equal(release1.auditLogs[0]?.entityId, settlementRequest.id);
});

test("milestone settlement preparation reconciler skips requests that already have a preparation", async () => {
  const draft = createDraft();
  const version = createVersion(draft);
  const milestone = createMilestone(version);
  const submission = createSubmission(draft, version, milestone);
  const review = createReview(draft, version, milestone, submission);
  const settlementRequest = createSettlementRequest(
    draft,
    version,
    milestone,
    submission,
    review
  );
  const existingPreparation: DealMilestoneSettlementPreparationRecord = {
    agreementAddress: "0x7777777777777777777777777777777777777777",
    chainId: 84532,
    dealId: buildCanonicalDealId(draft.organizationId, draft.id),
    dealMilestoneReviewId: review.id,
    dealMilestoneSettlementRequestId: settlementRequest.id,
    dealMilestoneSubmissionId: submission.id,
    dealVersionHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    dealVersionId: version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: draft.id,
    id: "prep-1",
    kind: settlementRequest.kind,
    milestoneAmountMinor: milestone.amountMinor,
    milestonePosition: milestone.position,
    organizationId: draft.organizationId,
    preparedAt: "2026-04-08T03:30:00.000Z",
    settlementTokenAddress: "0x6666666666666666666666666666666666666666",
    totalAmount: "3500000"
  };
  const release1 = createRelease1Repositories({
    drafts: [draft],
    milestones: [milestone],
    reviews: [review],
    settlementPreparations: [existingPreparation],
    settlementRequests: [settlementRequest],
    submissions: [submission],
    versions: [version]
  });
  const release4 = createRelease4Repositories([createAgreement(draft)]);
  const reconciler = new MilestoneSettlementPreparationReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-08T04:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedMilestoneSettlementRequestCount, 1);
  assert.equal(result.preparedMilestoneSettlementCount, 0);
  assert.equal(result.blockedMilestoneSettlementPreparationCount, 0);
  assert.equal(release1.settlementPreparations.length, 1);
  assert.equal(release1.auditLogs.length, 0);
});

test("milestone settlement preparation reconciler records blocked requests when agreement truth is missing or incomplete", async () => {
  const draft = createDraft();
  const version = createVersion(draft);
  const milestone = createMilestone(version);
  const submission = createSubmission(draft, version, milestone);
  const review = createReview(draft, version, milestone, submission);
  const settlementRequest = createSettlementRequest(
    draft,
    version,
    milestone,
    submission,
    review
  );
  const release1 = createRelease1Repositories({
    drafts: [draft],
    milestones: [milestone],
    reviews: [review],
    settlementRequests: [settlementRequest],
    submissions: [submission],
    versions: [version]
  });
  const release4 = createRelease4Repositories([
    createAgreement(draft, {
      milestoneCount: 0
    })
  ]);
  const reconciler = new MilestoneSettlementPreparationReconciler(
    release1.repositories,
    release4.repositories,
    84532,
    () => "2026-04-08T04:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedMilestoneSettlementRequestCount, 1);
  assert.equal(result.preparedMilestoneSettlementCount, 0);
  assert.equal(result.blockedMilestoneSettlementPreparationCount, 1);
  assert.equal(release1.settlementPreparations.length, 0);
  assert.equal(release1.auditLogs.length, 0);
});
