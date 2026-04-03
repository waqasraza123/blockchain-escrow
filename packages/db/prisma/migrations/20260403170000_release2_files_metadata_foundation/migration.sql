ALTER TYPE "AuditAction" ADD VALUE 'FILE_CREATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'FILE';

CREATE TYPE "FileCategory" AS ENUM (
  'GENERAL',
  'DRAFT_ATTACHMENT',
  'EVIDENCE',
  'SIGNED_DOCUMENT'
);

CREATE TABLE "files" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "byteSize" BIGINT NOT NULL,
  "sha256Hex" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "category" "FileCategory" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "files_organization_id_storage_key_key"
ON "files"("organizationId", "storageKey");

CREATE INDEX "files_organization_id_idx"
ON "files"("organizationId");

CREATE INDEX "files_created_by_user_id_idx"
ON "files"("createdByUserId");

CREATE INDEX "files_organization_id_created_at_idx"
ON "files"("organizationId", "createdAt");

ALTER TABLE "files"
  ADD CONSTRAINT "files_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "files"
  ADD CONSTRAINT "files_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
