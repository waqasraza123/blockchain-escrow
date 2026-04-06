ALTER TYPE "AuditAction" ADD VALUE 'FUNDING_TRANSACTION_SUPERSEDED';

ALTER TABLE "funding_transactions"
ADD COLUMN "supersededAt" TIMESTAMPTZ(3),
ADD COLUMN "supersededByFundingTransactionId" TEXT;

CREATE INDEX "funding_transactions_superseded_by_funding_transaction_id_idx"
ON "funding_transactions"("supersededByFundingTransactionId");

ALTER TABLE "funding_transactions"
ADD CONSTRAINT "funding_transactions_supersededByFundingTransactionId_fkey"
FOREIGN KEY ("supersededByFundingTransactionId")
REFERENCES "funding_transactions"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
