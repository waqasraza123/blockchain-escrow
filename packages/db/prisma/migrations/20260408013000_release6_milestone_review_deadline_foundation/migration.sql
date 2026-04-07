ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_REVIEW_DEADLINE_EXPIRED';

ALTER TABLE "deal_milestone_submissions"
ADD COLUMN "reviewDeadlineAt" TIMESTAMPTZ(3);

UPDATE "deal_milestone_submissions"
SET "reviewDeadlineAt" = "submittedAt" + INTERVAL '7 days'
WHERE "reviewDeadlineAt" IS NULL;

ALTER TABLE "deal_milestone_submissions"
ALTER COLUMN "reviewDeadlineAt" SET NOT NULL;

CREATE TABLE "deal_milestone_review_deadline_expiries" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "deadlineAt" TIMESTAMPTZ(3) NOT NULL,
  "expiredAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_review_deadline_expiries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_review_deadline_expiries_submission_id_key"
ON "deal_milestone_review_deadline_expiries"("dealMilestoneSubmissionId");

CREATE INDEX "deal_milestone_review_deadline_expiries_org_id_idx"
ON "deal_milestone_review_deadline_expiries"("organizationId");

CREATE INDEX "deal_milestone_review_deadline_expiries_draft_id_idx"
ON "deal_milestone_review_deadline_expiries"("draftDealId");

CREATE INDEX "deal_milestone_review_deadline_expiries_version_id_idx"
ON "deal_milestone_review_deadline_expiries"("dealVersionId");

CREATE INDEX "deal_milestone_review_deadline_expiries_milestone_id_idx"
ON "deal_milestone_review_deadline_expiries"("dealVersionMilestoneId");

ALTER TABLE "deal_milestone_review_deadline_expiries"
ADD CONSTRAINT "deal_milestone_review_deadline_expiries_org_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_review_deadline_expiries"
ADD CONSTRAINT "deal_milestone_review_deadline_expiries_draft_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_review_deadline_expiries"
ADD CONSTRAINT "deal_milestone_review_deadline_expiries_version_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_review_deadline_expiries"
ADD CONSTRAINT "deal_milestone_review_deadline_expiries_milestone_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_review_deadline_expiries"
ADD CONSTRAINT "deal_milestone_review_deadline_expiries_submission_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
