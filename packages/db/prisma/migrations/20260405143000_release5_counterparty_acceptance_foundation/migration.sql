ALTER TYPE "AuditAction" ADD VALUE 'DEAL_VERSION_COUNTERPARTY_ACCEPTANCE_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_VERSION_COUNTERPARTY_ACCEPTANCE';

CREATE TABLE "counterparty_deal_version_acceptances" (
  "id" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionPartyId" TEXT NOT NULL,
  "signerWalletAddress" TEXT NOT NULL,
  "scheme" "TypedSignatureScheme" NOT NULL,
  "signature" TEXT NOT NULL,
  "typedData" JSONB NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "counterparty_deal_version_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ctpty_dv_acceptances_party_id_key"
ON "counterparty_deal_version_acceptances"("dealVersionPartyId");

CREATE INDEX "ctpty_dv_acceptances_version_id_idx"
ON "counterparty_deal_version_acceptances"("dealVersionId");

CREATE INDEX "ctpty_dv_acceptances_version_id_accepted_at_idx"
ON "counterparty_deal_version_acceptances"("dealVersionId", "acceptedAt");

ALTER TABLE "counterparty_deal_version_acceptances"
ADD CONSTRAINT "counterparty_deal_version_acceptances_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "counterparty_deal_version_acceptances"
ADD CONSTRAINT "counterparty_deal_version_acceptances_dealVersionPartyId_fkey"
FOREIGN KEY ("dealVersionPartyId") REFERENCES "deal_version_parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
