CREATE TYPE "CostCenterStatus" AS ENUM (
  'ACTIVE',
  'ARCHIVED'
);

CREATE TYPE "ApprovalPolicyKind" AS ENUM (
  'DEAL_FUNDING'
);

CREATE TYPE "ApprovalRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "ApprovalStepStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "StatementSnapshotKind" AS ENUM (
  'DEAL_VERSION_SETTLEMENT'
);

ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_POLICY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_REQUEST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_STEP_DECIDED';
ALTER TYPE "AuditAction" ADD VALUE 'COST_CENTER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STATEMENT_SNAPSHOT_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'APPROVAL_POLICY';
ALTER TYPE "AuditEntityType" ADD VALUE 'APPROVAL_REQUEST';
ALTER TYPE "AuditEntityType" ADD VALUE 'APPROVAL_REQUEST_STEP';
ALTER TYPE "AuditEntityType" ADD VALUE 'COST_CENTER';
ALTER TYPE "AuditEntityType" ADD VALUE 'STATEMENT_SNAPSHOT';

CREATE TABLE "cost_centers" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "normalizedCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "CostCenterStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cost_centers_organization_id_normalized_code_key"
ON "cost_centers"("organizationId", "normalizedCode");

CREATE INDEX "cost_centers_organization_id_idx"
ON "cost_centers"("organizationId");

CREATE INDEX "cost_centers_created_by_user_id_idx"
ON "cost_centers"("createdByUserId");

CREATE INDEX "cost_centers_status_idx"
ON "cost_centers"("status");

ALTER TABLE "cost_centers"
ADD CONSTRAINT "cost_centers_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_centers"
ADD CONSTRAINT "cost_centers_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "draft_deals"
ADD COLUMN "costCenterId" TEXT;

CREATE INDEX "draft_deals_cost_center_id_idx"
ON "draft_deals"("costCenterId");

ALTER TABLE "draft_deals"
ADD CONSTRAINT "draft_deals_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "approval_policies" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "costCenterId" TEXT,
  "kind" "ApprovalPolicyKind" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "settlementCurrency" "SettlementCurrency",
  "active" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_policies_organization_id_idx"
ON "approval_policies"("organizationId");

CREATE INDEX "approval_policies_created_by_user_id_idx"
ON "approval_policies"("createdByUserId");

CREATE INDEX "approval_policies_cost_center_id_idx"
ON "approval_policies"("costCenterId");

CREATE INDEX "approval_policies_active_idx"
ON "approval_policies"("active");

CREATE INDEX "approval_policies_kind_idx"
ON "approval_policies"("kind");

ALTER TABLE "approval_policies"
ADD CONSTRAINT "approval_policies_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_policies"
ADD CONSTRAINT "approval_policies_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_policies"
ADD CONSTRAINT "approval_policies_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "approval_policy_steps" (
  "id" TEXT NOT NULL,
  "approvalPolicyId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "requiredRole" "OrganizationRole" NOT NULL,

  CONSTRAINT "approval_policy_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_policy_steps_policy_id_position_key"
ON "approval_policy_steps"("approvalPolicyId", "position");

CREATE INDEX "approval_policy_steps_policy_id_idx"
ON "approval_policy_steps"("approvalPolicyId");

ALTER TABLE "approval_policy_steps"
ADD CONSTRAINT "approval_policy_steps_approvalPolicyId_fkey"
FOREIGN KEY ("approvalPolicyId") REFERENCES "approval_policies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "approval_requests" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "approvalPolicyId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "costCenterId" TEXT,
  "kind" "ApprovalPolicyKind" NOT NULL,
  "status" "ApprovalRequestStatus" NOT NULL,
  "title" TEXT NOT NULL,
  "totalAmountMinor" TEXT NOT NULL,
  "settlementCurrency" "SettlementCurrency" NOT NULL,
  "note" TEXT,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL,
  "decidedAt" TIMESTAMPTZ(3),

  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_requests_deal_version_id_kind_key"
ON "approval_requests"("dealVersionId", "kind");

CREATE INDEX "approval_requests_organization_id_idx"
ON "approval_requests"("organizationId");

CREATE INDEX "approval_requests_draft_deal_id_idx"
ON "approval_requests"("draftDealId");

CREATE INDEX "approval_requests_policy_id_idx"
ON "approval_requests"("approvalPolicyId");

CREATE INDEX "approval_requests_cost_center_id_idx"
ON "approval_requests"("costCenterId");

CREATE INDEX "approval_requests_status_idx"
ON "approval_requests"("status");

CREATE INDEX "approval_requests_requested_at_idx"
ON "approval_requests"("requestedAt");

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_approvalPolicyId_fkey"
FOREIGN KEY ("approvalPolicyId") REFERENCES "approval_policies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "approval_request_steps" (
  "id" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "requiredRole" "OrganizationRole" NOT NULL,
  "status" "ApprovalStepStatus" NOT NULL,
  "note" TEXT,
  "decidedAt" TIMESTAMPTZ(3),
  "decidedByUserId" TEXT,

  CONSTRAINT "approval_request_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_request_steps_request_id_position_key"
ON "approval_request_steps"("approvalRequestId", "position");

CREATE INDEX "approval_request_steps_request_id_idx"
ON "approval_request_steps"("approvalRequestId");

CREATE INDEX "approval_request_steps_status_idx"
ON "approval_request_steps"("status");

CREATE INDEX "approval_request_steps_decided_by_user_id_idx"
ON "approval_request_steps"("decidedByUserId");

ALTER TABLE "approval_request_steps"
ADD CONSTRAINT "approval_request_steps_approvalRequestId_fkey"
FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "approval_request_steps"
ADD CONSTRAINT "approval_request_steps_decidedByUserId_fkey"
FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "statement_snapshots" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "costCenterId" TEXT,
  "approvalRequestId" TEXT,
  "kind" "StatementSnapshotKind" NOT NULL,
  "note" TEXT,
  "asOf" TIMESTAMPTZ(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "statement_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "statement_snapshots_organization_id_idx"
ON "statement_snapshots"("organizationId");

CREATE INDEX "statement_snapshots_draft_deal_id_idx"
ON "statement_snapshots"("draftDealId");

CREATE INDEX "statement_snapshots_deal_version_id_created_at_idx"
ON "statement_snapshots"("dealVersionId", "createdAt");

CREATE INDEX "statement_snapshots_cost_center_id_idx"
ON "statement_snapshots"("costCenterId");

CREATE INDEX "statement_snapshots_approval_request_id_idx"
ON "statement_snapshots"("approvalRequestId");

ALTER TABLE "statement_snapshots"
ADD CONSTRAINT "statement_snapshots_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "statement_snapshots"
ADD CONSTRAINT "statement_snapshots_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "statement_snapshots"
ADD CONSTRAINT "statement_snapshots_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "statement_snapshots"
ADD CONSTRAINT "statement_snapshots_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "statement_snapshots"
ADD CONSTRAINT "statement_snapshots_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "statement_snapshots"
ADD CONSTRAINT "statement_snapshots_approvalRequestId_fkey"
FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
