ALTER TYPE "AuditAction"
ADD VALUE IF NOT EXISTS 'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_SUBMITTED';

ALTER TYPE "AuditAction"
ADD VALUE IF NOT EXISTS 'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_SUPERSEDED';

ALTER TYPE "AuditEntityType"
ADD VALUE IF NOT EXISTS 'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION';

CREATE TABLE "deal_milestone_settlement_execution_transactions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "dealMilestoneReviewId" TEXT NOT NULL,
  "dealMilestoneSettlementRequestId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "submittedWalletId" TEXT NOT NULL,
  "submittedWalletAddress" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL,
  "supersededAt" TIMESTAMPTZ(3),
  "supersededByDealMilestoneSettlementExecutionTransactionId" TEXT,

  CONSTRAINT "deal_milestone_settlement_execution_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_settl_exec_txs_chain_id_transaction_hash_key"
ON "deal_milestone_settlement_execution_transactions"("chainId", "transactionHash");

CREATE INDEX "deal_milestone_settl_exec_txs_organization_id_idx"
ON "deal_milestone_settlement_execution_transactions"("organizationId");

CREATE INDEX "deal_milestone_settl_exec_txs_draft_deal_id_idx"
ON "deal_milestone_settlement_execution_transactions"("draftDealId");

CREATE INDEX "deal_milestone_settl_exec_txs_deal_version_id_idx"
ON "deal_milestone_settlement_execution_transactions"("dealVersionId");

CREATE INDEX "deal_milestone_settl_exec_txs_milestone_id_idx"
ON "deal_milestone_settlement_execution_transactions"("dealVersionMilestoneId");

CREATE INDEX "deal_milestone_settl_exec_txs_request_id_idx"
ON "deal_milestone_settlement_execution_transactions"("dealMilestoneSettlementRequestId");

CREATE INDEX "deal_milestone_settl_exec_txs_request_submitted_at_idx"
ON "deal_milestone_settlement_execution_transactions"("dealMilestoneSettlementRequestId", "submittedAt");

CREATE INDEX "deal_milestone_settl_exec_txs_superseded_by_id_idx"
ON "deal_milestone_settlement_execution_transactions"("supersededByDealMilestoneSettlementExecutionTransactionId");

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_organization_id_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_draft_deal_id_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_deal_version_id_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_milestone_id_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_submission_id_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_review_id_fkey"
FOREIGN KEY ("dealMilestoneReviewId") REFERENCES "deal_milestone_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_request_id_fkey"
FOREIGN KEY ("dealMilestoneSettlementRequestId") REFERENCES "deal_milestone_settlement_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_submitted_by_user_id_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_submitted_wallet_id_fkey"
FOREIGN KEY ("submittedWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_execution_transactions"
ADD CONSTRAINT "deal_milestone_settl_exec_txs_superseded_by_id_fkey"
FOREIGN KEY ("supersededByDealMilestoneSettlementExecutionTransactionId")
REFERENCES "deal_milestone_settlement_execution_transactions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
