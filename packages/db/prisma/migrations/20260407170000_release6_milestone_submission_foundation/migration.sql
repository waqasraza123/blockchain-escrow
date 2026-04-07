ALTER TYPE "AuditAction" ADD VALUE 'DEAL_MILESTONE_SUBMISSION_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_MILESTONE_SUBMISSION';

CREATE TABLE "deal_milestone_submissions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "submissionNumber" INTEGER NOT NULL,
  "statementMarkdown" TEXT NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_milestone_submission_files" (
  "id" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_submission_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_submissions_milestone_id_submission_number_key"
ON "deal_milestone_submissions"("dealVersionMilestoneId", "submissionNumber");

CREATE INDEX "deal_milestone_submissions_organization_id_idx"
ON "deal_milestone_submissions"("organizationId");

CREATE INDEX "deal_milestone_submissions_draft_deal_id_idx"
ON "deal_milestone_submissions"("draftDealId");

CREATE INDEX "deal_milestone_submissions_deal_version_id_idx"
ON "deal_milestone_submissions"("dealVersionId");

CREATE INDEX "deal_milestone_submissions_milestone_id_idx"
ON "deal_milestone_submissions"("dealVersionMilestoneId");

CREATE INDEX "deal_milestone_submissions_submitted_by_user_id_idx"
ON "deal_milestone_submissions"("submittedByUserId");

CREATE INDEX "deal_milestone_submissions_milestone_id_submitted_at_idx"
ON "deal_milestone_submissions"("dealVersionMilestoneId", "submittedAt");

CREATE UNIQUE INDEX "deal_milestone_submission_files_submission_id_file_id_key"
ON "deal_milestone_submission_files"("dealMilestoneSubmissionId", "fileId");

CREATE INDEX "deal_milestone_submission_files_submission_id_idx"
ON "deal_milestone_submission_files"("dealMilestoneSubmissionId");

CREATE INDEX "deal_milestone_submission_files_file_id_idx"
ON "deal_milestone_submission_files"("fileId");

ALTER TABLE "deal_milestone_submissions"
ADD CONSTRAINT "deal_milestone_submissions_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submissions"
ADD CONSTRAINT "deal_milestone_submissions_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submissions"
ADD CONSTRAINT "deal_milestone_submissions_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submissions"
ADD CONSTRAINT "deal_milestone_submissions_dealVersionMilestoneId_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submissions"
ADD CONSTRAINT "deal_milestone_submissions_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submission_files"
ADD CONSTRAINT "deal_milestone_submission_files_dealMilestoneSubmissionId_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_submission_files"
ADD CONSTRAINT "deal_milestone_submission_files_fileId_fkey"
FOREIGN KEY ("fileId") REFERENCES "files"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
