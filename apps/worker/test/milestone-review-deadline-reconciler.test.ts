import test from "node:test";
import assert from "node:assert/strict";

import type {
  AuditLogRecord,
  DealMilestoneReviewDeadlineExpiryRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSubmissionRecord,
  DealVersionMilestoneRecord,
  DealVersionRecord,
  DraftDealRecord,
  Release1Repositories
} from "@blockchain-escrow/db";

import { MilestoneReviewDeadlineReconciler } from "../src/milestone-review-deadline-reconciler";

function createRelease1Repositories(input: {
  deadlineExpiries?: DealMilestoneReviewDeadlineExpiryRecord[];
  drafts: DraftDealRecord[];
  milestones: DealVersionMilestoneRecord[];
  reviews?: DealMilestoneReviewRecord[];
  submissions: DealMilestoneSubmissionRecord[];
  versions: DealVersionRecord[];
}) {
  const auditLogs: AuditLogRecord[] = [];
  const deadlineExpiries = [...(input.deadlineExpiries ?? [])];
  const repositories = {
    auditLogs: {
      append: async (record: AuditLogRecord): Promise<AuditLogRecord> => {
        auditLogs.push(record);
        return record;
      }
    },
    dealMilestoneReviewDeadlineExpiries: {
      create: async (
        record: DealMilestoneReviewDeadlineExpiryRecord
      ): Promise<DealMilestoneReviewDeadlineExpiryRecord> => {
        deadlineExpiries.push(record);
        return record;
      },
      findByDealMilestoneSubmissionId: async (
        dealMilestoneSubmissionId: string
      ): Promise<DealMilestoneReviewDeadlineExpiryRecord | null> =>
        deadlineExpiries.find(
          (record) => record.dealMilestoneSubmissionId === dealMilestoneSubmissionId
        ) ?? null,
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealMilestoneReviewDeadlineExpiryRecord[]> =>
        deadlineExpiries.filter((record) => record.dealVersionId === dealVersionId)
    },
    dealMilestoneReviews: {
      listByDealVersionId: async (
        dealVersionId: string
      ): Promise<DealMilestoneReviewRecord[]> =>
        (input.reviews ?? []).filter((record) => record.dealVersionId === dealVersionId)
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
    deadlineExpiries,
    repositories
  };
}

function createDraft(overrides: Partial<DraftDealRecord> = {}): DraftDealRecord {
  return {
    createdAt: "2026-04-06T12:00:00.000Z",
    createdByUserId: "user-1",
    id: "draft-1",
    organizationId: "org-1",
    settlementCurrency: "USDC",
    state: "ACTIVE",
    summary: "Milestone draft",
    templateId: null,
    title: "Milestone draft",
    updatedAt: "2026-04-06T12:00:00.000Z",
    ...overrides
  };
}

function createVersion(draft: DraftDealRecord): DealVersionRecord {
  return {
    bodyMarkdown: "# Scope",
    createdAt: "2026-04-06T12:00:00.000Z",
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
    amountMinor: "1000000",
    createdAt: "2026-04-06T12:00:00.000Z",
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
  milestone: DealVersionMilestoneRecord,
  overrides: Partial<DealMilestoneSubmissionRecord> = {}
): DealMilestoneSubmissionRecord {
  return {
    dealVersionId: version.id,
    dealVersionMilestoneId: milestone.id,
    draftDealId: draft.id,
    id: "submission-1",
    organizationId: draft.organizationId,
    reviewDeadlineAt: "2026-04-06T10:00:00.000Z",
    scheme: null,
    signature: null,
    statementMarkdown: "Delivered",
    submissionNumber: 1,
    submittedAt: "2026-04-05T10:00:00.000Z",
    submittedByCounterpartyId: null,
    submittedByPartyRole: "SELLER",
    submittedByPartySubjectType: "ORGANIZATION",
    submittedByUserId: "user-1",
    typedData: null,
    ...overrides
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
    reviewedAt: "2026-04-06T09:00:00.000Z",
    reviewedByUserId: "user-2",
    statementMarkdown: null,
    ...overrides
  };
}

test("milestone review deadline reconciler persists immutable expiry events for overdue latest submissions", async () => {
  const draft = createDraft();
  const version = createVersion(draft);
  const milestone = createMilestone(version);
  const submission = createSubmission(draft, version, milestone);
  const release1 = createRelease1Repositories({
    drafts: [draft],
    milestones: [milestone],
    submissions: [submission],
    versions: [version]
  });
  const reconciler = new MilestoneReviewDeadlineReconciler(
    release1.repositories,
    () => "2026-04-06T12:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedMilestoneReviewDeadlineDraftCount, 1);
  assert.equal(result.scannedMilestoneReviewDeadlineCount, 1);
  assert.equal(result.expiredMilestoneReviewDeadlineCount, 1);
  assert.equal(release1.deadlineExpiries.length, 1);
  assert.equal(
    release1.deadlineExpiries[0]?.dealMilestoneSubmissionId,
    submission.id
  );
  assert.equal(release1.deadlineExpiries[0]?.expiredAt, submission.reviewDeadlineAt);
  assert.equal(release1.auditLogs.length, 1);
  assert.equal(
    release1.auditLogs[0]?.action,
    "DEAL_MILESTONE_REVIEW_DEADLINE_EXPIRED"
  );
});

test("milestone review deadline reconciler skips on-time reviews and existing expiry records", async () => {
  const draft = createDraft();
  const version = createVersion(draft);
  const milestone = createMilestone(version);
  const submission = createSubmission(draft, version, milestone);
  const review = createReview(draft, version, milestone, submission, {
    reviewedAt: "2026-04-06T08:00:00.000Z"
  });
  const existingExpiry: DealMilestoneReviewDeadlineExpiryRecord = {
    dealMilestoneSubmissionId: submission.id,
    dealVersionId: version.id,
    dealVersionMilestoneId: milestone.id,
    deadlineAt: submission.reviewDeadlineAt,
    draftDealId: draft.id,
    expiredAt: submission.reviewDeadlineAt,
    id: "expiry-1",
    organizationId: draft.organizationId
  };
  const release1 = createRelease1Repositories({
    deadlineExpiries: [existingExpiry],
    drafts: [draft],
    milestones: [milestone],
    reviews: [review],
    submissions: [submission],
    versions: [version]
  });
  const reconciler = new MilestoneReviewDeadlineReconciler(
    release1.repositories,
    () => "2026-04-06T12:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.scannedMilestoneReviewDeadlineCount, 1);
  assert.equal(result.expiredMilestoneReviewDeadlineCount, 0);
  assert.equal(release1.deadlineExpiries.length, 1);
  assert.equal(release1.auditLogs.length, 0);
});

test("milestone review deadline reconciler records expiry for late-reviewed latest submissions", async () => {
  const draft = createDraft();
  const version = createVersion(draft);
  const milestone = createMilestone(version);
  const submission = createSubmission(draft, version, milestone);
  const review = createReview(draft, version, milestone, submission, {
    reviewedAt: "2026-04-06T11:00:00.000Z"
  });
  const release1 = createRelease1Repositories({
    drafts: [draft],
    milestones: [milestone],
    reviews: [review],
    submissions: [submission],
    versions: [version]
  });
  const reconciler = new MilestoneReviewDeadlineReconciler(
    release1.repositories,
    () => "2026-04-06T12:00:00.000Z"
  );

  const result = await reconciler.reconcileOnce();

  assert.equal(result.expiredMilestoneReviewDeadlineCount, 1);
  assert.equal(release1.deadlineExpiries[0]?.deadlineAt, submission.reviewDeadlineAt);
  assert.equal(release1.auditLogs[0]?.metadata?.reviewedAt, review.reviewedAt);
});
