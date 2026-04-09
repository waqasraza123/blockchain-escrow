CREATE TYPE "MilestoneSettlementRequestSource" AS ENUM (
  'BUYER_REVIEW',
  'ARBITRATOR_DECISION'
);

ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_DISPUTE_ARBITRATOR_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_DISPUTE_DECISION_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_DISPUTE_OPENED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_MILESTONE_DISPUTE';
ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_MILESTONE_DISPUTE_ASSIGNMENT';
ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_MILESTONE_DISPUTE_DECISION';

CREATE TABLE "deal_milestone_disputes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "dealMilestoneReviewId" TEXT NOT NULL,
  "openedByUserId" TEXT NOT NULL,
  "statementMarkdown" TEXT NOT NULL,
  "openedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_disputes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_disputes_dealMilestoneReviewId_key"
ON "deal_milestone_disputes"("dealMilestoneReviewId");

CREATE INDEX "deal_milestone_disputes_organization_id_idx"
ON "deal_milestone_disputes"("organizationId");

CREATE INDEX "deal_milestone_disputes_draft_deal_id_idx"
ON "deal_milestone_disputes"("draftDealId");

CREATE INDEX "deal_milestone_disputes_deal_version_id_idx"
ON "deal_milestone_disputes"("dealVersionId");

CREATE INDEX "deal_milestone_disputes_milestone_id_idx"
ON "deal_milestone_disputes"("dealVersionMilestoneId");

CREATE INDEX "deal_milestone_disputes_submission_id_idx"
ON "deal_milestone_disputes"("dealMilestoneSubmissionId");

CREATE INDEX "deal_milestone_disputes_opened_by_user_id_idx"
ON "deal_milestone_disputes"("openedByUserId");

CREATE INDEX "deal_milestone_disputes_milestone_opened_at_idx"
ON "deal_milestone_disputes"("dealVersionMilestoneId", "openedAt");

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_dealVersionMilestoneId_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_dealMilestoneSubmissionId_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_dealMilestoneReviewId_fkey"
FOREIGN KEY ("dealMilestoneReviewId") REFERENCES "deal_milestone_reviews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_disputes"
ADD CONSTRAINT "deal_milestone_disputes_openedByUserId_fkey"
FOREIGN KEY ("openedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "deal_milestone_dispute_evidence" (
  "id" TEXT NOT NULL,
  "dealMilestoneDisputeId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_dispute_evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_dispute_evidence_dispute_id_file_id_key"
ON "deal_milestone_dispute_evidence"("dealMilestoneDisputeId", "fileId");

CREATE INDEX "deal_milestone_dispute_evidence_dispute_id_idx"
ON "deal_milestone_dispute_evidence"("dealMilestoneDisputeId");

CREATE INDEX "deal_milestone_dispute_evidence_file_id_idx"
ON "deal_milestone_dispute_evidence"("fileId");

ALTER TABLE "deal_milestone_dispute_evidence"
ADD CONSTRAINT "deal_milestone_dispute_evidence_dealMilestoneDisputeId_fkey"
FOREIGN KEY ("dealMilestoneDisputeId") REFERENCES "deal_milestone_disputes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_dispute_evidence"
ADD CONSTRAINT "deal_milestone_dispute_evidence_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "files"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "deal_milestone_dispute_assignments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "dealMilestoneDisputeId" TEXT NOT NULL,
  "assignedByUserId" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "arbitratorAddress" TEXT NOT NULL,
  "assignedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_dispute_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deal_milestone_dispute_assignments_organization_id_idx"
ON "deal_milestone_dispute_assignments"("organizationId");

CREATE INDEX "deal_milestone_dispute_assignments_dispute_id_idx"
ON "deal_milestone_dispute_assignments"("dealMilestoneDisputeId");

CREATE INDEX "deal_milestone_dispute_assignments_assigned_by_user_id_idx"
ON "deal_milestone_dispute_assignments"("assignedByUserId");

CREATE INDEX "deal_milestone_dispute_assignments_dispute_assigned_at_idx"
ON "deal_milestone_dispute_assignments"("dealMilestoneDisputeId", "assignedAt");

ALTER TABLE "deal_milestone_dispute_assignments"
ADD CONSTRAINT "deal_milestone_dispute_assignments_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_dispute_assignments"
ADD CONSTRAINT "deal_milestone_dispute_assignments_dealMilestoneDisputeId_fkey"
FOREIGN KEY ("dealMilestoneDisputeId") REFERENCES "deal_milestone_disputes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_dispute_assignments"
ADD CONSTRAINT "deal_milestone_dispute_assignments_assignedByUserId_fkey"
FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD COLUMN "dealMilestoneDisputeId" TEXT,
ADD COLUMN "requestedByArbitratorAddress" TEXT,
ADD COLUMN "source" "MilestoneSettlementRequestSource" NOT NULL DEFAULT 'BUYER_REVIEW';

ALTER TABLE "deal_milestone_settlement_requests"
ALTER COLUMN "requestedByUserId" DROP NOT NULL;

ALTER TABLE "deal_milestone_settlement_requests"
ALTER COLUMN "source" DROP DEFAULT;

ALTER TABLE "deal_milestone_settlement_requests"
DROP CONSTRAINT "deal_milestone_settlement_requests_requestedByUserId_fkey";

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "deal_milestone_settlement_requests_dealMilestoneDisputeId_key"
ON "deal_milestone_settlement_requests"("dealMilestoneDisputeId");

CREATE INDEX "deal_milestone_settlement_requests_dispute_id_idx"
ON "deal_milestone_settlement_requests"("dealMilestoneDisputeId");

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_dealMilestoneDisputeId_fkey"
FOREIGN KEY ("dealMilestoneDisputeId") REFERENCES "deal_milestone_disputes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "deal_milestone_dispute_decisions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "dealMilestoneDisputeId" TEXT NOT NULL,
  "dealMilestoneDisputeAssignmentId" TEXT NOT NULL,
  "dealMilestoneSettlementRequestId" TEXT NOT NULL,
  "kind" "MilestoneSettlementRequestKind" NOT NULL,
  "statementMarkdown" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "typedData" JSONB NOT NULL,
  "signedByArbitratorAddress" TEXT NOT NULL,
  "decidedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_dispute_decisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_dispute_decisions_dealMilestoneDisputeId_key"
ON "deal_milestone_dispute_decisions"("dealMilestoneDisputeId");

CREATE UNIQUE INDEX "deal_milestone_dispute_decisions_dealMilestoneDisputeAssignmentId_key"
ON "deal_milestone_dispute_decisions"("dealMilestoneDisputeAssignmentId");

CREATE UNIQUE INDEX "deal_milestone_dispute_decisions_dealMilestoneSettlementRequestId_key"
ON "deal_milestone_dispute_decisions"("dealMilestoneSettlementRequestId");

CREATE INDEX "deal_milestone_dispute_decisions_organization_id_idx"
ON "deal_milestone_dispute_decisions"("organizationId");

CREATE INDEX "deal_milestone_dispute_decisions_decided_at_idx"
ON "deal_milestone_dispute_decisions"("decidedAt");

ALTER TABLE "deal_milestone_dispute_decisions"
ADD CONSTRAINT "deal_milestone_dispute_decisions_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_dispute_decisions"
ADD CONSTRAINT "deal_milestone_dispute_decisions_dealMilestoneDisputeId_fkey"
FOREIGN KEY ("dealMilestoneDisputeId") REFERENCES "deal_milestone_disputes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_dispute_decisions"
ADD CONSTRAINT "deal_milestone_dispute_decisions_dealMilestoneDisputeAssignmentId_fkey"
FOREIGN KEY ("dealMilestoneDisputeAssignmentId") REFERENCES "deal_milestone_dispute_assignments"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_dispute_decisions"
ADD CONSTRAINT "deal_milestone_dispute_decisions_dealMilestoneSettlementRequestId_fkey"
FOREIGN KEY ("dealMilestoneSettlementRequestId") REFERENCES "deal_milestone_settlement_requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
