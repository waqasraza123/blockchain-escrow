ALTER TYPE "AuditAction"
ADD VALUE IF NOT EXISTS 'DEAL_MILESTONE_SETTLEMENT_EXEC_TX_RECONCILED';

ALTER TYPE "AuditAction"
ADD VALUE IF NOT EXISTS 'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_STALE_PENDING';

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD COLUMN "reconciledStatus" "FundingTransactionReconciledStatus",
ADD COLUMN "reconciledAgreementAddress" TEXT,
ADD COLUMN "reconciledAt" TIMESTAMPTZ(3),
ADD COLUMN "reconciledConfirmedAt" TIMESTAMPTZ(3),
ADD COLUMN "reconciledMatchesTrackedAgreement" BOOLEAN,
ADD COLUMN "stalePendingEscalatedAt" TIMESTAMPTZ(3);

CREATE INDEX "deal_milestone_settl_exec_txs_chain_id_idx"
ON "deal_milestone_settlement_execution_transactions"("chainId");
