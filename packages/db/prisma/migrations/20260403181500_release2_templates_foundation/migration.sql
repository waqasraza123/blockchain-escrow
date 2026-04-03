ALTER TYPE "AuditAction" ADD VALUE 'TEMPLATE_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'TEMPLATE';

CREATE TABLE "templates" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "defaultCounterpartyId" TEXT,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "description" TEXT,
  "bodyMarkdown" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "templates_organization_id_normalized_name_key"
ON "templates"("organizationId", "normalizedName");

CREATE INDEX "templates_organization_id_idx"
ON "templates"("organizationId");

CREATE INDEX "templates_created_by_user_id_idx"
ON "templates"("createdByUserId");

CREATE INDEX "templates_default_counterparty_id_idx"
ON "templates"("defaultCounterpartyId");

CREATE INDEX "templates_organization_id_created_at_idx"
ON "templates"("organizationId", "createdAt");

ALTER TABLE "templates"
  ADD CONSTRAINT "templates_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "templates"
  ADD CONSTRAINT "templates_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "templates"
  ADD CONSTRAINT "templates_defaultCounterpartyId_fkey"
  FOREIGN KEY ("defaultCounterpartyId") REFERENCES "counterparties"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
