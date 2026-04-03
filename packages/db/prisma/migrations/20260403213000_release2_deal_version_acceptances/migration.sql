ALTER TYPE "AuditAction" ADD VALUE 'DEAL_VERSION_ACCEPTANCE_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'DEAL_VERSION_ACCEPTANCE';

CREATE TYPE "TypedSignatureScheme" AS ENUM ('EIP712');

CREATE TABLE "deal_version_acceptances" (
  "id" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionPartyId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "acceptedByUserId" TEXT NOT NULL,
  "signerWalletId" TEXT NOT NULL,
  "signerWalletAddress" TEXT NOT NULL,
  "scheme" "TypedSignatureScheme" NOT NULL,
  "signature" TEXT NOT NULL,
  "typedData" JSONB NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "deal_version_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_version_acceptances_deal_version_party_id_key"
ON "deal_version_acceptances"("dealVersionPartyId");
CREATE INDEX "deal_version_acceptances_deal_version_id_idx"
ON "deal_version_acceptances"("dealVersionId");
CREATE INDEX "deal_version_acceptances_organization_id_idx"
ON "deal_version_acceptances"("organizationId");
CREATE INDEX "deal_version_acceptances_accepted_by_user_id_idx"
ON "deal_version_acceptances"("acceptedByUserId");
CREATE INDEX "deal_version_acceptances_signer_wallet_id_idx"
ON "deal_version_acceptances"("signerWalletId");
CREATE INDEX "deal_version_acceptances_deal_version_id_accepted_at_idx"
ON "deal_version_acceptances"("dealVersionId", "acceptedAt");

ALTER TABLE "deal_version_acceptances"
  ADD CONSTRAINT "deal_version_acceptances_dealVersionId_fkey"
  FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_version_acceptances"
  ADD CONSTRAINT "deal_version_acceptances_dealVersionPartyId_fkey"
  FOREIGN KEY ("dealVersionPartyId") REFERENCES "deal_version_parties"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_version_acceptances"
  ADD CONSTRAINT "deal_version_acceptances_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_version_acceptances"
  ADD CONSTRAINT "deal_version_acceptances_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_version_acceptances"
  ADD CONSTRAINT "deal_version_acceptances_signerWalletId_fkey"
  FOREIGN KEY ("signerWalletId") REFERENCES "wallets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
