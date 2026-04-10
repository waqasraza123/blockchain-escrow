ALTER TYPE "ApprovalPolicyKind" RENAME VALUE 'DEAL_FUNDING' TO 'FUNDING_TRANSACTION_CREATE';

ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'ORGANIZATION_INVITE_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'ORGANIZATION_INVITE_REVOKE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'ORGANIZATION_MEMBER_REMOVE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'ORGANIZATION_MEMBER_ROLE_UPDATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'COUNTERPARTY_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'FILE_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'TEMPLATE_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DRAFT_DEAL_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_VERSION_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_VERSION_ACCEPT';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DRAFT_DEAL_COUNTERPARTY_WALLET_UPDATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DRAFT_DEAL_COST_CENTER_UPDATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'COST_CENTER_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'APPROVAL_POLICY_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'APPROVAL_REQUEST_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'APPROVAL_STEP_DECISION';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'STATEMENT_SNAPSHOT_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_SUBMISSION_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_REVIEW_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_SETTLEMENT_REQUEST_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_DISPUTE_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_DISPUTE_ASSIGN_ARBITRATOR';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_DISPUTE_DECISION_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE';
ALTER TYPE "ApprovalPolicyKind" ADD VALUE 'FINANCE_EXPORT_CREATE';

CREATE TYPE "ApprovalSubjectType" AS ENUM (
  'ORGANIZATION',
  'ORGANIZATION_INVITE',
  'ORGANIZATION_MEMBER',
  'COUNTERPARTY',
  'FILE',
  'TEMPLATE',
  'DRAFT_DEAL',
  'DEAL_VERSION',
  'DEAL_VERSION_PARTY',
  'COST_CENTER',
  'APPROVAL_POLICY',
  'APPROVAL_REQUEST',
  'APPROVAL_REQUEST_STEP',
  'DEAL_VERSION_MILESTONE',
  'DEAL_MILESTONE_SUBMISSION',
  'DEAL_MILESTONE_REVIEW',
  'DEAL_MILESTONE_SETTLEMENT_REQUEST',
  'DEAL_MILESTONE_DISPUTE',
  'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION',
  'FINANCE_EXPORT_JOB'
);

CREATE TYPE "FinanceExportJobStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "FinanceExportArtifactFormat" AS ENUM (
  'CSV',
  'JSON'
);

ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_MUTATION_BLOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_EXPORT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_EXPORT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'FINANCE_EXPORT_FAILED';

ALTER TYPE "AuditEntityType" ADD VALUE 'FINANCE_EXPORT_JOB';
ALTER TYPE "AuditEntityType" ADD VALUE 'FINANCE_EXPORT_ARTIFACT';

DROP INDEX "approval_requests_deal_version_id_kind_key";

ALTER TABLE "approval_requests"
ADD COLUMN "dealVersionMilestoneId" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "subjectFingerprint" TEXT,
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "subjectLabel" TEXT,
ADD COLUMN "subjectType" "ApprovalSubjectType";

ALTER TABLE "approval_requests"
ALTER COLUMN "draftDealId" DROP NOT NULL,
ALTER COLUMN "dealVersionId" DROP NOT NULL,
ALTER COLUMN "settlementCurrency" DROP NOT NULL,
ALTER COLUMN "totalAmountMinor" DROP NOT NULL;

UPDATE "approval_requests"
SET
  "metadata" = COALESCE("metadata", '{}'::jsonb),
  "subjectFingerprint" = CONCAT("kind"::text, ':', COALESCE("dealVersionId", 'unknown')),
  "subjectId" = COALESCE("dealVersionId", "draftDealId", "id"),
  "subjectLabel" = "title",
  "subjectType" = 'DEAL_VERSION'::"ApprovalSubjectType"
WHERE "subjectFingerprint" IS NULL;

ALTER TABLE "approval_requests"
ALTER COLUMN "subjectFingerprint" SET NOT NULL,
ALTER COLUMN "subjectId" SET NOT NULL,
ALTER COLUMN "subjectType" SET NOT NULL;

CREATE INDEX "approval_requests_deal_version_id_idx"
ON "approval_requests"("dealVersionId");

CREATE INDEX "approval_requests_deal_version_milestone_id_idx"
ON "approval_requests"("dealVersionMilestoneId");

CREATE INDEX "approval_requests_kind_idx"
ON "approval_requests"("kind");

CREATE INDEX "approval_requests_subject_idx"
ON "approval_requests"("subjectType", "subjectId");

CREATE INDEX "approval_requests_subject_fingerprint_idx"
ON "approval_requests"("subjectFingerprint");

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_dealVersionMilestoneId_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "finance_export_jobs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status" "FinanceExportJobStatus" NOT NULL,
  "filters" JSONB NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "startedAt" TIMESTAMPTZ(3),
  "finishedAt" TIMESTAMPTZ(3),
  "failedAt" TIMESTAMPTZ(3),

  CONSTRAINT "finance_export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_export_jobs_organization_id_idx"
ON "finance_export_jobs"("organizationId");

CREATE INDEX "finance_export_jobs_created_by_user_id_idx"
ON "finance_export_jobs"("createdByUserId");

CREATE INDEX "finance_export_jobs_status_idx"
ON "finance_export_jobs"("status");

CREATE INDEX "finance_export_jobs_created_at_idx"
ON "finance_export_jobs"("createdAt");

ALTER TABLE "finance_export_jobs"
ADD CONSTRAINT "finance_export_jobs_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finance_export_jobs"
ADD CONSTRAINT "finance_export_jobs_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "finance_export_artifacts" (
  "id" TEXT NOT NULL,
  "financeExportJobId" TEXT NOT NULL,
  "fileId" TEXT,
  "format" "FinanceExportArtifactFormat" NOT NULL,
  "filename" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "finance_export_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "finance_export_artifacts_job_id_idx"
ON "finance_export_artifacts"("financeExportJobId");

ALTER TABLE "finance_export_artifacts"
ADD CONSTRAINT "finance_export_artifacts_financeExportJobId_fkey"
FOREIGN KEY ("financeExportJobId") REFERENCES "finance_export_jobs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
