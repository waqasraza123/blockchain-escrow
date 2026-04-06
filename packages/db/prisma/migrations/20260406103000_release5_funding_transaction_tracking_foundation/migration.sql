ALTER TYPE "AuditAction" ADD VALUE 'FUNDING_TRANSACTION_SUBMITTED';

ALTER TYPE "AuditEntityType" ADD VALUE 'FUNDING_TRANSACTION';

CREATE TABLE "funding_transactions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "submittedWalletId" TEXT NOT NULL,
  "submittedWalletAddress" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "funding_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funding_transactions_chain_id_transaction_hash_key"
ON "funding_transactions"("chainId", "transactionHash");

CREATE INDEX "funding_transactions_organization_id_idx"
ON "funding_transactions"("organizationId");

CREATE INDEX "funding_transactions_draft_deal_id_idx"
ON "funding_transactions"("draftDealId");

CREATE INDEX "funding_transactions_deal_version_id_idx"
ON "funding_transactions"("dealVersionId");

CREATE INDEX "funding_transactions_deal_version_id_submitted_at_idx"
ON "funding_transactions"("dealVersionId", "submittedAt");

ALTER TABLE "funding_transactions"
ADD CONSTRAINT "funding_transactions_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "funding_transactions"
ADD CONSTRAINT "funding_transactions_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "funding_transactions"
ADD CONSTRAINT "funding_transactions_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "funding_transactions"
ADD CONSTRAINT "funding_transactions_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "funding_transactions"
ADD CONSTRAINT "funding_transactions_submittedWalletId_fkey"
FOREIGN KEY ("submittedWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
