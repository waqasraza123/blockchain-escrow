ALTER TYPE "AuditAction" ADD VALUE 'COUNTERPARTY_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'COUNTERPARTY';

CREATE TABLE "counterparties" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "legalName" TEXT,
  "contactEmail" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "counterparties_organization_id_normalized_name_key"
ON "counterparties"("organizationId", "normalizedName");

CREATE INDEX "counterparties_organization_id_idx"
ON "counterparties"("organizationId");

CREATE INDEX "counterparties_created_by_user_id_idx"
ON "counterparties"("createdByUserId");

CREATE INDEX "counterparties_organization_id_created_at_idx"
ON "counterparties"("organizationId", "createdAt");

ALTER TABLE "counterparties"
  ADD CONSTRAINT "counterparties_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "counterparties"
  ADD CONSTRAINT "counterparties_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
