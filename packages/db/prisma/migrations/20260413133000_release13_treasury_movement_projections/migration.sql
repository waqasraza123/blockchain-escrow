CREATE TABLE "treasury_movement_projections" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "feeVaultAddress" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "tokenAddress" TEXT,
  "treasuryAddress" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "occurredBlockNumber" BIGINT NOT NULL,
  "occurredBlockHash" TEXT NOT NULL,
  "occurredTransactionHash" TEXT NOT NULL,
  "occurredLogIndex" INTEGER NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "treasury_movement_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tmp_chain_tx_log_key"
  ON "treasury_movement_projections"("chainId", "occurredTransactionHash", "occurredLogIndex");

CREATE INDEX "tmp_chain_block_log_idx"
  ON "treasury_movement_projections"("chainId", "occurredBlockNumber", "occurredLogIndex");

CREATE INDEX "tmp_chain_fee_vault_block_idx"
  ON "treasury_movement_projections"("chainId", "feeVaultAddress", "occurredBlockNumber");
