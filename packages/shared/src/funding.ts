import { z } from "zod";

import type { ApprovalRequirementSummary } from "./approvals";
import type { ChainId, EntityId, HexString, IsoTimestamp, WalletAddress } from "./primitives";

export const fundingPreparationParamsSchema = z.object({
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type FundingPreparationParams = z.infer<
  typeof fundingPreparationParamsSchema
>;

export const fundingPreparationBlockerSchema = z.enum([
  "AGREEMENT_ALREADY_CREATED",
  "APPROVAL_REQUEST_MISSING",
  "APPROVAL_REQUEST_PENDING",
  "APPROVAL_REQUEST_REJECTED",
  "ARBITRATOR_REGISTRY_NOT_CONFIGURED",
  "BUYER_ALLOWANCE_INSUFFICIENT",
  "BUYER_ALLOWANCE_UNAVAILABLE",
  "COUNTERPARTY_ACCEPTANCE_MISSING",
  "COUNTERPARTY_WALLET_MISSING",
  "CREATE_ESCROW_PAUSED",
  "DEAL_VERSION_MISMATCH_WITH_EXISTING_AGREEMENT",
  "ESCROW_AGREEMENT_IMPLEMENTATION_NOT_DEPLOYED",
  "ESCROW_FACTORY_NOT_DEPLOYED",
  "FEE_VAULT_NOT_CONFIGURED",
  "FUNDING_PAUSED",
  "ORGANIZATION_ACCEPTANCE_MISSING",
  "PROTOCOL_CONFIG_NOT_DEPLOYED",
  "PROTOCOL_CONFIG_PROJECTION_MISSING",
  "SETTLEMENT_TOKEN_NOT_ALLOWED",
  "TOKEN_ALLOWLIST_NOT_CONFIGURED",
  "USDC_TOKEN_NOT_CONFIGURED",
  "VERSION_NOT_LATEST"
]);
export type FundingPreparationBlocker = z.infer<
  typeof fundingPreparationBlockerSchema
>;

export const createFundingTransactionSchema = z.object({
  transactionHash: z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/)
});
export type CreateFundingTransactionInput = z.infer<
  typeof createFundingTransactionSchema
>;

export const fundingTransactionStatusSchema = z.enum([
  "PENDING",
  "SUPERSEDED",
  "CONFIRMED",
  "FAILED",
  "MISMATCHED"
]);
export type FundingTransactionStatus = z.infer<
  typeof fundingTransactionStatusSchema
>;

export const fundingTransactionReconciledStatusSchema = z.enum([
  "CONFIRMED",
  "FAILED",
  "MISMATCHED"
]);
export type FundingTransactionReconciledStatus = z.infer<
  typeof fundingTransactionReconciledStatusSchema
>;

export const fundingTransactionIndexedExecutionStatusSchema = z.enum([
  "SUCCESS",
  "REVERTED"
]);
export type FundingTransactionIndexedExecutionStatus = z.infer<
  typeof fundingTransactionIndexedExecutionStatusSchema
>;

export const fundingTransactionStalePendingEvaluationSchema = z.enum([
  "READY",
  "INDEXER_CURSOR_MISSING",
  "INDEXER_CURSOR_STALE"
]);
export type FundingTransactionStalePendingEvaluation = z.infer<
  typeof fundingTransactionStalePendingEvaluationSchema
>;

export interface PreparedTransaction {
  data: HexString;
  to: WalletAddress;
  value: string;
}

export type FundingPreparationTransaction = PreparedTransaction;

export const fundingPreparationTransactionFunctionSchema = z.enum([
  "createAgreement",
  "createAndFundAgreement"
]);
export type FundingPreparationTransactionFunction = z.infer<
  typeof fundingPreparationTransactionFunctionSchema
>;

export interface FundingPreparationSummary {
  agreementImplementationAddress: WalletAddress | null;
  allowanceTargetAddress: WalletAddress | null;
  approval: ApprovalRequirementSummary | null;
  arbitratorAddress: WalletAddress | null;
  blockers: FundingPreparationBlocker[];
  buyerAllowanceMinor: string | null;
  buyerAddress: WalletAddress | null;
  chainId: ChainId;
  counterpartyWalletAddress: WalletAddress | null;
  createAgreementFunctionName: FundingPreparationTransactionFunction | null;
  createAgreementTransaction: FundingPreparationTransaction | null;
  dealId: HexString;
  dealVersionHash: HexString;
  escrowFactoryAddress: WalletAddress | null;
  linkedAgreementAddress: WalletAddress | null;
  milestoneCount: number;
  network: string;
  organizationSignerWalletAddress: WalletAddress | null;
  predictedAgreementAddress: WalletAddress | null;
  protocolConfigAddress: WalletAddress | null;
  ready: boolean;
  requiredBuyerAllowanceMinor: string | null;
  sellerAddress: WalletAddress | null;
  settlementTokenAddress: WalletAddress | null;
  totalAmountMinor: string;
}

export interface GetFundingPreparationResponse {
  preparation: FundingPreparationSummary;
}

export interface FundingTransactionSummary {
  agreementAddress: WalletAddress | null;
  chainId: ChainId;
  confirmedAt: IsoTimestamp | null;
  dealVersionId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  indexedAt: IsoTimestamp | null;
  indexedBlockNumber: string | null;
  indexedExecutionStatus: FundingTransactionIndexedExecutionStatus | null;
  matchesTrackedVersion: boolean | null;
  organizationId: EntityId;
  reconciledAt: IsoTimestamp | null;
  reconciledStatus: FundingTransactionReconciledStatus | null;
  stalePending: boolean | null;
  stalePendingAt: IsoTimestamp | null;
  stalePendingEscalatedAt: IsoTimestamp | null;
  stalePendingEvaluation: FundingTransactionStalePendingEvaluation | null;
  status: FundingTransactionStatus;
  submittedAt: IsoTimestamp;
  submittedByUserId: EntityId;
  submittedWalletAddress: WalletAddress;
  supersededAt: IsoTimestamp | null;
  supersededByFundingTransactionId: EntityId | null;
  supersededByTransactionHash: HexString | null;
  transactionHash: HexString;
}

export interface CreateFundingTransactionResponse {
  fundingTransaction: FundingTransactionSummary;
}

export interface ListFundingTransactionsResponse {
  fundingTransactions: FundingTransactionSummary[];
}
