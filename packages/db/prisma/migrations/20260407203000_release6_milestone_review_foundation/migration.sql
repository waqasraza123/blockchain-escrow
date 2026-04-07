CREATE TYPE "MilestoneReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_REVIEW_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_REVIEW_REJECTED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_MILESTONE_REVIEW';

ALTER TABLE "deal_milestone_submissions"
ADD COLUMN "submittedByPartyRole" "DealPartyRole",
ADD COLUMN "submittedByPartySubjectType" "DealPartySubjectType",
ADD COLUMN "submittedByCounterpartyId" TEXT;

UPDATE "deal_milestone_submissions"
SET
  "submittedByPartyRole" = 'SELLER',
  "submittedByPartySubjectType" = 'ORGANIZATION'
WHERE
  "submittedByPartyRole" IS NULL
  OR "submittedByPartySubjectType" IS NULL;

ALTER TABLE "deal_milestone_submissions"
ALTER COLUMN "submittedByPartyRole" SET NOT NULL,
ALTER COLUMN "submittedByPartySubjectType" SET NOT NULL,
ALTER COLUMN "submittedByUserId" DROP NOT NULL;

CREATE INDEX "deal_milestone_submissions_submitted_by_counterparty_id_idx"
ON "deal_milestone_submissions"("submittedByCounterpartyId");

ALTER TABLE "deal_milestone_submissions"
ADD CONSTRAINT "deal_milestone_submissions_submittedByCounterpartyId_fkey"
FOREIGN KEY ("submittedByCounterpartyId") REFERENCES "counterparties"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submissions"
DROP CONSTRAINT "deal_milestone_submissions_submittedByUserId_fkey",
ADD CONSTRAINT "deal_milestone_submissions_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "deal_milestone_reviews" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "reviewedByUserId" TEXT NOT NULL,
  "decision" "MilestoneReviewDecision" NOT NULL,
  "statementMarkdown" TEXT,
  "reviewedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_reviews_dealMilestoneSubmissionId_key"
ON "deal_milestone_reviews"("dealMilestoneSubmissionId");

CREATE INDEX "deal_milestone_reviews_organization_id_idx"
ON "deal_milestone_reviews"("organizationId");

CREATE INDEX "deal_milestone_reviews_draft_deal_id_idx"
ON "deal_milestone_reviews"("draftDealId");

CREATE INDEX "deal_milestone_reviews_deal_version_id_idx"
ON "deal_milestone_reviews"("dealVersionId");

CREATE INDEX "deal_milestone_reviews_milestone_id_idx"
ON "deal_milestone_reviews"("dealVersionMilestoneId");

CREATE INDEX "deal_milestone_reviews_reviewed_by_user_id_idx"
ON "deal_milestone_reviews"("reviewedByUserId");

CREATE INDEX "deal_milestone_reviews_milestone_id_reviewed_at_idx"
ON "deal_milestone_reviews"("dealVersionMilestoneId", "reviewedAt");

ALTER TABLE "deal_milestone_reviews"
ADD CONSTRAINT "deal_milestone_reviews_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_reviews"
ADD CONSTRAINT "deal_milestone_reviews_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_reviews"
ADD CONSTRAINT "deal_milestone_reviews_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_reviews"
ADD CONSTRAINT "deal_milestone_reviews_dealVersionMilestoneId_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_reviews"
ADD CONSTRAINT "deal_milestone_reviews_dealMilestoneSubmissionId_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_reviews"
ADD CONSTRAINT "deal_milestone_reviews_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
