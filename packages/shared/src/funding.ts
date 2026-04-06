import { z } from "zod";

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
  "ARBITRATOR_REGISTRY_NOT_CONFIGURED",
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
  "CONFIRMED",
  "MISMATCHED"
]);
export type FundingTransactionStatus = z.infer<
  typeof fundingTransactionStatusSchema
>;

export interface FundingPreparationTransaction {
  data: HexString;
  to: WalletAddress;
  value: "0";
}

export interface FundingPreparationSummary {
  agreementImplementationAddress: WalletAddress | null;
  arbitratorAddress: WalletAddress | null;
  blockers: FundingPreparationBlocker[];
  buyerAddress: WalletAddress | null;
  chainId: ChainId;
  counterpartyWalletAddress: WalletAddress | null;
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
  matchesTrackedVersion: boolean | null;
  organizationId: EntityId;
  status: FundingTransactionStatus;
  submittedAt: IsoTimestamp;
  submittedByUserId: EntityId;
  submittedWalletAddress: WalletAddress;
  transactionHash: HexString;
}

export interface CreateFundingTransactionResponse {
  fundingTransaction: FundingTransactionSummary;
}

export interface ListFundingTransactionsResponse {
  fundingTransactions: FundingTransactionSummary[];
}
