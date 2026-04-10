CREATE TYPE "SponsoredTransactionKind" AS ENUM (
  'FUNDING_TRANSACTION_CREATE',
  'DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE'
);

CREATE TYPE "SponsoredTransactionStatus" AS ENUM (
  'APPROVED',
  'REJECTED',
  'SUBMITTED',
  'EXPIRED'
);

CREATE TABLE "wallet_profiles" (
  "walletId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "defaultOrganizationId" TEXT,
  "defaultGasPolicyId" TEXT,
  "sponsorTransactionsByDefault" BOOLEAN NOT NULL,
  "approvalNoteTemplate" TEXT,
  "reviewNoteTemplate" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "wallet_profiles_pkey" PRIMARY KEY ("walletId")
);

ALTER TABLE "wallet_profiles"
ADD CONSTRAINT "wallet_profiles_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gas_policies" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL,
  "allowedTransactionKinds" "SponsoredTransactionKind"[] NOT NULL,
  "allowedApprovalPolicyKinds" "ApprovalPolicyKind"[] NOT NULL,
  "allowedChainIds" INTEGER[] NOT NULL,
  "maxAmountMinor" TEXT,
  "maxRequestsPerDay" INTEGER NOT NULL,
  "sponsorWindowMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "gas_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gas_policies_organization_id_idx"
ON "gas_policies"("organizationId");
CREATE INDEX "gas_policies_created_by_user_id_idx"
ON "gas_policies"("createdByUserId");
CREATE INDEX "gas_policies_active_idx"
ON "gas_policies"("active");

ALTER TABLE "gas_policies"
ADD CONSTRAINT "gas_policies_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gas_policies"
ADD CONSTRAINT "gas_policies_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "sponsored_transaction_requests" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "gasPolicyId" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "kind" "SponsoredTransactionKind" NOT NULL,
  "status" "SponsoredTransactionStatus" NOT NULL,
  "reason" TEXT,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "draftDealId" TEXT,
  "dealVersionId" TEXT,
  "dealMilestoneSettlementRequestId" TEXT,
  "chainId" INTEGER NOT NULL,
  "toAddress" TEXT NOT NULL,
  "data" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "amountMinor" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "approvedAt" TIMESTAMPTZ(3),
  "rejectedAt" TIMESTAMPTZ(3),
  "submittedAt" TIMESTAMPTZ(3),
  "submittedTransactionHash" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "sponsored_transaction_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sponsored_transaction_requests_organization_id_idx"
ON "sponsored_transaction_requests"("organizationId");
CREATE INDEX "sponsored_transaction_requests_gas_policy_id_idx"
ON "sponsored_transaction_requests"("gasPolicyId");
CREATE INDEX "sponsored_transaction_requests_requested_by_user_id_idx"
ON "sponsored_transaction_requests"("requestedByUserId");
CREATE INDEX "sponsored_transaction_requests_wallet_id_idx"
ON "sponsored_transaction_requests"("walletId");
CREATE INDEX "sponsored_transaction_requests_status_idx"
ON "sponsored_transaction_requests"("status");
CREATE INDEX "sponsored_transaction_requests_subject_idx"
ON "sponsored_transaction_requests"("subjectType", "subjectId");
CREATE INDEX "sponsored_transaction_requests_created_at_idx"
ON "sponsored_transaction_requests"("createdAt");

ALTER TABLE "sponsored_transaction_requests"
ADD CONSTRAINT "sponsored_transaction_requests_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sponsored_transaction_requests"
ADD CONSTRAINT "sponsored_transaction_requests_gasPolicyId_fkey"
FOREIGN KEY ("gasPolicyId") REFERENCES "gas_policies"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sponsored_transaction_requests"
ADD CONSTRAINT "sponsored_transaction_requests_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sponsored_transaction_requests"
ADD CONSTRAINT "sponsored_transaction_requests_walletId_fkey"
FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
