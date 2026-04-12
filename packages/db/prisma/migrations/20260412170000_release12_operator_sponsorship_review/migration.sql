ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SPONSORED_TRANSACTION_REQUEST_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SPONSORED_TRANSACTION_REQUEST_REJECTED';
ALTER TYPE "SponsoredTransactionStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "sponsored_transaction_requests"
ADD COLUMN "decided_by_operator_account_id" TEXT;

CREATE INDEX "sponsored_tx_requests_decided_by_operator_idx"
ON "sponsored_transaction_requests"("decided_by_operator_account_id");

ALTER TABLE "sponsored_transaction_requests"
ADD CONSTRAINT "sponsored_tx_requests_decided_by_operator_fkey"
FOREIGN KEY ("decided_by_operator_account_id")
REFERENCES "operator_accounts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
