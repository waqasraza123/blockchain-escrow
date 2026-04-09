CREATE TABLE "escrow_agreement_milestone_settlement_projections" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "agreementAddress" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealVersionHash" TEXT NOT NULL,
    "milestonePosition" INTEGER NOT NULL,
    "kind" "MilestoneSettlementRequestKind" NOT NULL,
    "amount" TEXT NOT NULL,
    "beneficiaryAddress" TEXT NOT NULL,
    "settledByAddress" TEXT NOT NULL,
    "settledBlockNumber" BIGINT NOT NULL,
    "settledBlockHash" TEXT NOT NULL,
    "settledTransactionHash" TEXT NOT NULL,
    "settledLogIndex" INTEGER NOT NULL,
    "settledAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "escrow_agreement_milestone_settlement_projections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "eamsp_chain_agreement_position_key"
ON "escrow_agreement_milestone_settlement_projections"("chainId", "agreementAddress", "milestonePosition");

CREATE INDEX "eamsp_chain_deal_id_idx"
ON "escrow_agreement_milestone_settlement_projections"("chainId", "dealId");

CREATE INDEX "eamsp_chain_agreement_idx"
ON "escrow_agreement_milestone_settlement_projections"("chainId", "agreementAddress");
