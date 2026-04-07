ALTER TYPE "AuditAction" ADD VALUE 'FUNDING_TRANSACTION_STALE_PENDING';

ALTER TABLE "funding_transactions"
ADD COLUMN "stalePendingEscalatedAt" TIMESTAMPTZ(3);

CREATE INDEX "funding_transactions_chain_id_idx"
ON "funding_transactions"("chainId");
