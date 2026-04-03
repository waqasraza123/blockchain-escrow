ALTER TYPE "AuditAction" ADD VALUE 'DEAL_VERSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DRAFT_DEAL_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_VERSION';
ALTER TYPE "AuditEntityType" ADD VALUE 'DRAFT_DEAL';

CREATE TYPE "DealState" AS ENUM (
  'DRAFT',
  'AWAITING_SELLER_ACCEPTANCE',
  'AWAITING_FUNDING',
  'ACTIVE',
  'UNDER_REVIEW',
  'DISPUTED',
  'PARTIALLY_RELEASED',
  'COMPLETED',
  'REFUNDED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "DealPartyRole" AS ENUM ('BUYER', 'SELLER');
CREATE TYPE "DealPartySubjectType" AS ENUM ('ORGANIZATION', 'COUNTERPARTY');
CREATE TYPE "SettlementCurrency" AS ENUM ('USDC');

CREATE TABLE "draft_deals" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "templateId" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "settlementCurrency" "SettlementCurrency" NOT NULL,
  "state" "DealState" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "draft_deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "draft_deal_parties" (
  "id" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "role" "DealPartyRole" NOT NULL,
  "subjectType" "DealPartySubjectType" NOT NULL,
  "organizationId" TEXT,
  "counterpartyId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "draft_deal_parties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_versions" (
  "id" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "templateId" TEXT,
  "versionNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "settlementCurrency" "SettlementCurrency" NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "deal_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_version_parties" (
  "id" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "role" "DealPartyRole" NOT NULL,
  "subjectType" "DealPartySubjectType" NOT NULL,
  "organizationId" TEXT,
  "counterpartyId" TEXT,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "deal_version_parties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_version_milestones" (
  "id" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amountMinor" TEXT NOT NULL,
  "dueAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "deal_version_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deal_version_files" (
  "id" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "deal_version_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "draft_deals_organization_id_idx" ON "draft_deals"("organizationId");
CREATE INDEX "draft_deals_created_by_user_id_idx" ON "draft_deals"("createdByUserId");
CREATE INDEX "draft_deals_template_id_idx" ON "draft_deals"("templateId");
CREATE INDEX "draft_deals_organization_id_created_at_idx" ON "draft_deals"("organizationId", "createdAt");

CREATE UNIQUE INDEX "draft_deal_parties_draft_deal_id_role_key"
ON "draft_deal_parties"("draftDealId", "role");
CREATE INDEX "draft_deal_parties_draft_deal_id_idx" ON "draft_deal_parties"("draftDealId");
CREATE INDEX "draft_deal_parties_organization_id_idx" ON "draft_deal_parties"("organizationId");
CREATE INDEX "draft_deal_parties_counterparty_id_idx" ON "draft_deal_parties"("counterpartyId");

CREATE UNIQUE INDEX "deal_versions_draft_deal_id_version_number_key"
ON "deal_versions"("draftDealId", "versionNumber");
CREATE INDEX "deal_versions_draft_deal_id_idx" ON "deal_versions"("draftDealId");
CREATE INDEX "deal_versions_organization_id_idx" ON "deal_versions"("organizationId");
CREATE INDEX "deal_versions_created_by_user_id_idx" ON "deal_versions"("createdByUserId");
CREATE INDEX "deal_versions_template_id_idx" ON "deal_versions"("templateId");
CREATE INDEX "deal_versions_draft_deal_id_created_at_idx"
ON "deal_versions"("draftDealId", "createdAt");

CREATE UNIQUE INDEX "deal_version_parties_deal_version_id_role_key"
ON "deal_version_parties"("dealVersionId", "role");
CREATE INDEX "deal_version_parties_deal_version_id_idx" ON "deal_version_parties"("dealVersionId");
CREATE INDEX "deal_version_parties_organization_id_idx" ON "deal_version_parties"("organizationId");
CREATE INDEX "deal_version_parties_counterparty_id_idx" ON "deal_version_parties"("counterpartyId");

CREATE UNIQUE INDEX "deal_version_milestones_deal_version_id_position_key"
ON "deal_version_milestones"("dealVersionId", "position");
CREATE INDEX "deal_version_milestones_deal_version_id_idx"
ON "deal_version_milestones"("dealVersionId");

CREATE UNIQUE INDEX "deal_version_files_deal_version_id_file_id_key"
ON "deal_version_files"("dealVersionId", "fileId");
CREATE INDEX "deal_version_files_deal_version_id_idx"
ON "deal_version_files"("dealVersionId");
CREATE INDEX "deal_version_files_file_id_idx"
ON "deal_version_files"("fileId");

ALTER TABLE "draft_deals"
  ADD CONSTRAINT "draft_deals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "draft_deals"
  ADD CONSTRAINT "draft_deals_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "draft_deals"
  ADD CONSTRAINT "draft_deals_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "draft_deal_parties"
  ADD CONSTRAINT "draft_deal_parties_draftDealId_fkey"
  FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "draft_deal_parties"
  ADD CONSTRAINT "draft_deal_parties_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "draft_deal_parties"
  ADD CONSTRAINT "draft_deal_parties_counterpartyId_fkey"
  FOREIGN KEY ("counterpartyId") REFERENCES "counterparties"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_versions"
  ADD CONSTRAINT "deal_versions_draftDealId_fkey"
  FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_versions"
  ADD CONSTRAINT "deal_versions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_versions"
  ADD CONSTRAINT "deal_versions_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_versions"
  ADD CONSTRAINT "deal_versions_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_version_parties"
  ADD CONSTRAINT "deal_version_parties_dealVersionId_fkey"
  FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_version_parties"
  ADD CONSTRAINT "deal_version_parties_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_version_parties"
  ADD CONSTRAINT "deal_version_parties_counterpartyId_fkey"
  FOREIGN KEY ("counterpartyId") REFERENCES "counterparties"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deal_version_milestones"
  ADD CONSTRAINT "deal_version_milestones_dealVersionId_fkey"
  FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_version_files"
  ADD CONSTRAINT "deal_version_files_dealVersionId_fkey"
  FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_version_files"
  ADD CONSTRAINT "deal_version_files_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "files"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
