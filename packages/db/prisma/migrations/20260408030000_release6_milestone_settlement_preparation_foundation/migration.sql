ALTER TYPE "AuditAction"
ADD VALUE 'DEAL_MILESTONE_SETTLEMENT_EXECUTION_PREPARED';

CREATE TABLE "deal_milestone_settlement_preparations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT NOT NULL,
  "dealVersionId" TEXT NOT NULL,
  "dealVersionMilestoneId" TEXT NOT NULL,
  "dealMilestoneSubmissionId" TEXT NOT NULL,
  "dealMilestoneReviewId" TEXT NOT NULL,
  "dealMilestoneSettlementRequestId" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "agreementAddress" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "dealVersionHash" TEXT NOT NULL,
  "kind" "MilestoneSettlementRequestKind" NOT NULL,
  "milestonePosition" INTEGER NOT NULL,
  "milestoneAmountMinor" TEXT NOT NULL,
  "settlementTokenAddress" TEXT NOT NULL,
  "totalAmount" TEXT NOT NULL,
  "preparedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "deal_milestone_settlement_preparations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deal_milestone_settlement_preparations_dealMilestoneReviewId_key"
ON "deal_milestone_settlement_preparations"("dealMilestoneReviewId");

CREATE UNIQUE INDEX "deal_milestone_settlement_preparations_dealMilestoneSettlementRequestId_key"
ON "deal_milestone_settlement_preparations"("dealMilestoneSettlementRequestId");

CREATE INDEX "deal_milestone_settlement_preparations_organization_id_idx"
ON "deal_milestone_settlement_preparations"("organizationId");

CREATE INDEX "deal_milestone_settlement_preparations_draft_deal_id_idx"
ON "deal_milestone_settlement_preparations"("draftDealId");

CREATE INDEX "deal_milestone_settlement_preparations_deal_version_id_idx"
ON "deal_milestone_settlement_preparations"("dealVersionId");

CREATE INDEX "deal_milestone_settlement_preparations_milestone_id_idx"
ON "deal_milestone_settlement_preparations"("dealVersionMilestoneId");

CREATE INDEX "deal_milestone_settlement_preparations_submission_id_idx"
ON "deal_milestone_settlement_preparations"("dealMilestoneSubmissionId");

CREATE INDEX "deal_milestone_settlement_preparations_chain_agreement_idx"
ON "deal_milestone_settlement_preparations"("chainId", "agreementAddress");

CREATE INDEX "deal_milestone_settlement_preparations_milestone_prep_at_idx"
ON "deal_milestone_settlement_preparations"("dealVersionMilestoneId", "preparedAt");

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_draftDealId_fkey"
FOREIGN KEY ("draftDealId") REFERENCES "draft_deals"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_dealVersionId_fkey"
FOREIGN KEY ("dealVersionId") REFERENCES "deal_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_dealVersionMilestoneId_fkey"
FOREIGN KEY ("dealVersionMilestoneId") REFERENCES "deal_version_milestones"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_dealMilestoneSubmissionId_fkey"
FOREIGN KEY ("dealMilestoneSubmissionId") REFERENCES "deal_milestone_submissions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_dealMilestoneReviewId_fkey"
FOREIGN KEY ("dealMilestoneReviewId") REFERENCES "deal_milestone_reviews"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deal_milestone_settlement_preparations"
ADD CONSTRAINT "deal_milestone_settlement_preparations_dealMilestoneSettlementRequestId_fkey"
FOREIGN KEY ("dealMilestoneSettlementRequestId") REFERENCES "deal_milestone_settlement_requests"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
