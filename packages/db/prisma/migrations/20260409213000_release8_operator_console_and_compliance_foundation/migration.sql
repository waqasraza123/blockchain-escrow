CREATE TYPE "OperatorRole" AS ENUM (
  'VIEWER',
  'COMPLIANCE',
  'PROTOCOL_ADMIN',
  'SUPER_ADMIN'
);

CREATE TYPE "OperatorAlertKind" AS ENUM (
  'FUNDING_TRANSACTION_STALE_PENDING',
  'FUNDING_TRANSACTION_FAILED',
  'FUNDING_TRANSACTION_MISMATCHED',
  'SETTLEMENT_EXECUTION_STALE_PENDING',
  'SETTLEMENT_EXECUTION_FAILED',
  'SETTLEMENT_EXECUTION_MISMATCHED',
  'DISPUTE_UNRESOLVED',
  'SERVICE_UNHEALTHY',
  'INDEXER_CURSOR_STALE',
  'INDEXER_DRIFT_FAILURE'
);

CREATE TYPE "OperatorAlertSeverity" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "OperatorAlertStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED'
);

CREATE TYPE "OperatorSubjectType" AS ENUM (
  'DRAFT_DEAL',
  'ESCROW_AGREEMENT',
  'DEAL_MILESTONE_DISPUTE',
  'FUNDING_TRANSACTION',
  'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION',
  'SYSTEM'
);

CREATE TYPE "ComplianceCheckpointKind" AS ENUM (
  'SANCTIONS'
);

CREATE TYPE "ComplianceCheckpointStatus" AS ENUM (
  'PENDING',
  'CLEARED',
  'BLOCKED'
);

CREATE TYPE "ComplianceCaseStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'ESCALATED',
  'RESOLVED'
);

CREATE TYPE "ProtocolProposalTarget" AS ENUM (
  'TokenAllowlist',
  'ArbitratorRegistry',
  'ProtocolConfig'
);

CREATE TYPE "ProtocolProposalAction" AS ENUM (
  'ALLOW_TOKEN',
  'DISALLOW_TOKEN',
  'APPROVE_ARBITRATOR',
  'REVOKE_ARBITRATOR',
  'SET_TOKEN_ALLOWLIST',
  'SET_ARBITRATOR_REGISTRY',
  'SET_FEE_VAULT',
  'SET_TREASURY',
  'SET_PROTOCOL_FEE_BPS',
  'PAUSE_CREATE_ESCROW',
  'UNPAUSE_CREATE_ESCROW',
  'PAUSE_FUNDING',
  'UNPAUSE_FUNDING'
);

ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_CASE_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_CASE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_CASE_NOTE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_CASE_STATUS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_CHECKPOINT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPLIANCE_CHECKPOINT_DECIDED';
ALTER TYPE "AuditAction" ADD VALUE 'OPERATOR_ALERT_ACKNOWLEDGED';
ALTER TYPE "AuditAction" ADD VALUE 'OPERATOR_ALERT_RESOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'PROTOCOL_PROPOSAL_DRAFT_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'COMPLIANCE_CASE';
ALTER TYPE "AuditEntityType" ADD VALUE 'COMPLIANCE_CASE_NOTE';
ALTER TYPE "AuditEntityType" ADD VALUE 'COMPLIANCE_CHECKPOINT';
ALTER TYPE "AuditEntityType" ADD VALUE 'OPERATOR_ALERT';
ALTER TYPE "AuditEntityType" ADD VALUE 'PROTOCOL_PROPOSAL_DRAFT';

CREATE TABLE "operator_accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "role" "OperatorRole" NOT NULL,
  "active" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "operator_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_accounts_wallet_id_key"
ON "operator_accounts"("walletId");

CREATE INDEX "operator_accounts_user_id_idx"
ON "operator_accounts"("userId");

CREATE INDEX "operator_accounts_role_idx"
ON "operator_accounts"("role");

CREATE INDEX "operator_accounts_active_idx"
ON "operator_accounts"("active");

ALTER TABLE "operator_accounts"
ADD CONSTRAINT "operator_accounts_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operator_accounts"
ADD CONSTRAINT "operator_accounts_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "operator_alerts" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "kind" "OperatorAlertKind" NOT NULL,
  "severity" "OperatorAlertSeverity" NOT NULL,
  "status" "OperatorAlertStatus" NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "subjectType" "OperatorSubjectType" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "organizationId" TEXT,
  "draftDealId" TEXT,
  "dealVersionId" TEXT,
  "agreementAddress" TEXT,
  "subjectLabel" TEXT,
  "assignedOperatorAccountId" TEXT,
  "linkedComplianceCaseId" TEXT,
  "acknowledgedAt" TIMESTAMPTZ(3),
  "acknowledgedByOperatorAccountId" TEXT,
  "resolvedAt" TIMESTAMPTZ(3),
  "resolvedByOperatorAccountId" TEXT,
  "firstDetectedAt" TIMESTAMPTZ(3) NOT NULL,
  "lastDetectedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "operator_alerts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_alerts_fingerprint_key"
ON "operator_alerts"("fingerprint");

CREATE INDEX "operator_alerts_kind_idx"
ON "operator_alerts"("kind");

CREATE INDEX "operator_alerts_status_idx"
ON "operator_alerts"("status");

CREATE INDEX "operator_alerts_organization_id_idx"
ON "operator_alerts"("organizationId");

CREATE INDEX "operator_alerts_subject_idx"
ON "operator_alerts"("subjectType", "subjectId");

CREATE INDEX "operator_alerts_last_detected_at_idx"
ON "operator_alerts"("lastDetectedAt");

ALTER TABLE "operator_alerts"
ADD CONSTRAINT "operator_alerts_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operator_alerts"
ADD CONSTRAINT "operator_alerts_assignedOperatorAccountId_fkey"
FOREIGN KEY ("assignedOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operator_alerts"
ADD CONSTRAINT "operator_alerts_acknowledgedByOperatorAccountId_fkey"
FOREIGN KEY ("acknowledgedByOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "operator_alerts"
ADD CONSTRAINT "operator_alerts_resolvedByOperatorAccountId_fkey"
FOREIGN KEY ("resolvedByOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "compliance_checkpoints" (
  "id" TEXT NOT NULL,
  "kind" "ComplianceCheckpointKind" NOT NULL,
  "status" "ComplianceCheckpointStatus" NOT NULL,
  "subjectType" "OperatorSubjectType" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "organizationId" TEXT,
  "draftDealId" TEXT,
  "dealVersionId" TEXT,
  "agreementAddress" TEXT,
  "subjectLabel" TEXT,
  "note" TEXT NOT NULL,
  "decisionNote" TEXT,
  "createdByOperatorAccountId" TEXT NOT NULL,
  "decidedByOperatorAccountId" TEXT,
  "linkedComplianceCaseId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "decidedAt" TIMESTAMPTZ(3),

  CONSTRAINT "compliance_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compliance_checkpoints_status_idx"
ON "compliance_checkpoints"("status");

CREATE INDEX "compliance_checkpoints_organization_id_idx"
ON "compliance_checkpoints"("organizationId");

CREATE INDEX "compliance_checkpoints_subject_idx"
ON "compliance_checkpoints"("subjectType", "subjectId");

CREATE INDEX "compliance_checkpoints_created_at_idx"
ON "compliance_checkpoints"("createdAt");

ALTER TABLE "compliance_checkpoints"
ADD CONSTRAINT "compliance_checkpoints_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_checkpoints"
ADD CONSTRAINT "compliance_checkpoints_createdByOperatorAccountId_fkey"
FOREIGN KEY ("createdByOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_checkpoints"
ADD CONSTRAINT "compliance_checkpoints_decidedByOperatorAccountId_fkey"
FOREIGN KEY ("decidedByOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "compliance_cases" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "severity" "OperatorAlertSeverity" NOT NULL,
  "status" "ComplianceCaseStatus" NOT NULL,
  "subjectType" "OperatorSubjectType" NOT NULL,
  "subjectId" TEXT NOT NULL,
  "organizationId" TEXT,
  "draftDealId" TEXT,
  "dealVersionId" TEXT,
  "agreementAddress" TEXT,
  "subjectLabel" TEXT,
  "createdByOperatorAccountId" TEXT NOT NULL,
  "assignedOperatorAccountId" TEXT,
  "linkedAlertId" TEXT,
  "linkedCheckpointId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "resolvedAt" TIMESTAMPTZ(3),

  CONSTRAINT "compliance_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compliance_cases_linkedAlertId_key"
ON "compliance_cases"("linkedAlertId");

CREATE UNIQUE INDEX "compliance_cases_linkedCheckpointId_key"
ON "compliance_cases"("linkedCheckpointId");

CREATE INDEX "compliance_cases_status_idx"
ON "compliance_cases"("status");

CREATE INDEX "compliance_cases_organization_id_idx"
ON "compliance_cases"("organizationId");

CREATE INDEX "compliance_cases_subject_idx"
ON "compliance_cases"("subjectType", "subjectId");

CREATE INDEX "compliance_cases_created_at_idx"
ON "compliance_cases"("createdAt");

ALTER TABLE "compliance_cases"
ADD CONSTRAINT "compliance_cases_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_cases"
ADD CONSTRAINT "compliance_cases_createdByOperatorAccountId_fkey"
FOREIGN KEY ("createdByOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "compliance_cases"
ADD CONSTRAINT "compliance_cases_assignedOperatorAccountId_fkey"
FOREIGN KEY ("assignedOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_cases"
ADD CONSTRAINT "compliance_cases_linkedAlertId_fkey"
FOREIGN KEY ("linkedAlertId") REFERENCES "operator_alerts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "compliance_cases"
ADD CONSTRAINT "compliance_cases_linkedCheckpointId_fkey"
FOREIGN KEY ("linkedCheckpointId") REFERENCES "compliance_checkpoints"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "compliance_case_notes" (
  "id" TEXT NOT NULL,
  "complianceCaseId" TEXT NOT NULL,
  "authorOperatorAccountId" TEXT NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "compliance_case_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "compliance_case_notes_case_id_idx"
ON "compliance_case_notes"("complianceCaseId");

CREATE INDEX "compliance_case_notes_created_at_idx"
ON "compliance_case_notes"("createdAt");

ALTER TABLE "compliance_case_notes"
ADD CONSTRAINT "compliance_case_notes_complianceCaseId_fkey"
FOREIGN KEY ("complianceCaseId") REFERENCES "compliance_cases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "compliance_case_notes"
ADD CONSTRAINT "compliance_case_notes_authorOperatorAccountId_fkey"
FOREIGN KEY ("authorOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "protocol_proposal_drafts" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "target" "ProtocolProposalTarget" NOT NULL,
  "action" "ProtocolProposalAction" NOT NULL,
  "description" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "targetAddress" TEXT NOT NULL,
  "calldata" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "createdByOperatorAccountId" TEXT NOT NULL,

  CONSTRAINT "protocol_proposal_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "protocol_proposal_drafts_chain_id_idx"
ON "protocol_proposal_drafts"("chainId");

CREATE INDEX "protocol_proposal_drafts_target_idx"
ON "protocol_proposal_drafts"("target");

CREATE INDEX "protocol_proposal_drafts_created_at_idx"
ON "protocol_proposal_drafts"("createdAt");

ALTER TABLE "protocol_proposal_drafts"
ADD CONSTRAINT "protocol_proposal_drafts_createdByOperatorAccountId_fkey"
FOREIGN KEY ("createdByOperatorAccountId") REFERENCES "operator_accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
