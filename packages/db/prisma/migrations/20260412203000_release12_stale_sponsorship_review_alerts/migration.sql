ALTER TYPE "OperatorAlertKind"
ADD VALUE IF NOT EXISTS 'SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW';

CREATE INDEX IF NOT EXISTS "sponsored_transaction_requests_pending_review_idx"
ON "sponsored_transaction_requests" ("status", "createdAt");
