CREATE TYPE "FundingTransactionReconciledStatus" AS ENUM ('CONFIRMED', 'FAILED', 'MISMATCHED');

ALTER TYPE "AuditAction" ADD VALUE 'FUNDING_TRANSACTION_RECONCILIATION_UPDATED';

ALTER TABLE "funding_transactions"
ADD COLUMN "reconciledStatus" "FundingTransactionReconciledStatus",
ADD COLUMN "reconciledAgreementAddress" TEXT,
ADD COLUMN "reconciledAt" TIMESTAMPTZ(3),
ADD COLUMN "reconciledConfirmedAt" TIMESTAMPTZ(3),
ADD COLUMN "reconciledMatchesTrackedVersion" BOOLEAN;
