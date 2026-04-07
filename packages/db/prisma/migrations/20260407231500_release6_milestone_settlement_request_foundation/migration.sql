CREATE TYPE "MilestoneSettlementRequestKind" AS ENUM ('RELEASE', 'REFUND');

ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_RELEASE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_REFUND_REQUESTED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_MILESTONE_SETTLEMENT_REQUEST';

CREATE TABLE "deal_milestone_settlement_requests" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "dealMilestoneReviewId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "kind" "MilestoneSettlementRequestKind" NOT NULL,
  "statementMarkdown" TEXT,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_settlement_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_settlement_requests_dealMilestoneReviewId_key"
ON "deal_milestone_settlement_requests"("dealMilestoneReviewId");

CREATE INDEX "deal_milestone_settlement_requests_organization_id_idx"
ON "deal_milestone_settlement_requests"("organizationId");

CREATE INDEX "deal_milestone_settlement_requests_draft_deal_id_idx"
ON "deal_milestone_settlement_requests"("draftDealId");

CREATE INDEX "deal_milestone_settlement_requests_deal_version_id_idx"
ON "deal_milestone_settlement_requests"("dealVersionId");

CREATE INDEX "deal_milestone_settlement_requests_milestone_id_idx"
ON "deal_milestone_settlement_requests"("dealVersionMilestoneId");

CREATE INDEX "deal_milestone_settlement_requests_submission_id_idx"
ON "deal_milestone_settlement_requests"("dealMilestoneSubmissionId");

CREATE INDEX "deal_milestone_settlement_requests_requested_by_user_id_idx"
ON "deal_milestone_settlement_requests"("requestedByUserId");

CREATE INDEX "deal_milestone_settlement_requests_milestone_req_at_idx"
ON "deal_milestone_settlement_requests"("dealVersionMilestoneId", "requestedAt");

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_dealVersionMilestoneId_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_dealMilestoneSubmissionId_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_dealMilestoneReviewId_fkey"
FOREIGN KEY ("dealMilestoneReviewId") REFERENCES "deal_milestone_reviews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_requests"
ADD CONSTRAINT "deal_milestone_settlement_requests_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
