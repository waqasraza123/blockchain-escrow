ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SPONSORED_TRANSACTION_REQUEST_EXPIRED';

ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'SPONSORED_TRANSACTION_REQUEST';

CREATE INDEX IF NOT EXISTS "sponsored_transaction_requests_lifecycle_idx"
ON "sponsored_transaction_requests"("status", "submittedAt", "expiresAt");
