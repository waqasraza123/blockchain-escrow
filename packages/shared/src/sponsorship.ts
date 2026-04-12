import { z } from "zod";

import type {
  ChainId,
  EntityId,
  HexString,
  IsoTimestamp,
  WalletAddress
} from "./primitives";
import { approvalPolicyKindSchema } from "./approvals";

const amountMinorSchema = z.string().trim().regex(/^[0-9]+$/);

export const sponsoredTransactionKindSchema = z.enum([
  "FUNDING_TRANSACTION_CREATE",
  "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE"
]);
export type SponsoredTransactionKind = z.infer<
  typeof sponsoredTransactionKindSchema
>;

export const sponsoredTransactionStatusSchema = z.enum([
  "APPROVED",
  "REJECTED",
  "SUBMITTED",
  "EXPIRED"
]);
export type SponsoredTransactionStatus = z.infer<
  typeof sponsoredTransactionStatusSchema
>;

export const gasPolicyIdParamsSchema = z.object({
  gasPolicyId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type GasPolicyIdParams = z.infer<typeof gasPolicyIdParamsSchema>;

export const sponsoredTransactionRequestIdParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
  sponsoredTransactionRequestId: z.string().trim().min(1)
});
export type SponsoredTransactionRequestIdParams = z.infer<
  typeof sponsoredTransactionRequestIdParamsSchema
>;

export const createGasPolicySchema = z.object({
  active: z.boolean().optional(),
  allowedApprovalPolicyKinds: z.array(approvalPolicyKindSchema).max(50).optional(),
  allowedChainIds: z.array(z.number().int().positive()).min(1).max(10),
  allowedTransactionKinds: z.array(sponsoredTransactionKindSchema).min(1).max(10),
  description: z.string().trim().min(1).max(2000).optional(),
  maxAmountMinor: amountMinorSchema.optional(),
  maxRequestsPerDay: z.number().int().positive().max(500),
  name: z.string().trim().min(1).max(160),
  sponsorWindowMinutes: z.number().int().positive().max(24 * 60)
});
export type CreateGasPolicyInput = z.infer<typeof createGasPolicySchema>;

export const updateGasPolicySchema = z
  .object({
    active: z.boolean().optional(),
    allowedApprovalPolicyKinds: z.array(approvalPolicyKindSchema).max(50).optional(),
    allowedChainIds: z.array(z.number().int().positive()).min(1).max(10).optional(),
    allowedTransactionKinds: z.array(sponsoredTransactionKindSchema).min(1).max(10).optional(),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    maxAmountMinor: amountMinorSchema.nullable().optional(),
    maxRequestsPerDay: z.number().int().positive().max(500).optional(),
    name: z.string().trim().min(1).max(160).optional(),
    sponsorWindowMinutes: z.number().int().positive().max(24 * 60).optional()
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "at least one field must be provided"
      });
    }
  });
export type UpdateGasPolicyInput = z.infer<typeof updateGasPolicySchema>;

export const upsertWalletProfileSchema = z.object({
  approvalNoteTemplate: z.string().trim().min(1).max(4000).nullable().optional(),
  defaultGasPolicyId: z.string().trim().min(1).nullable().optional(),
  defaultOrganizationId: z.string().trim().min(1).nullable().optional(),
  displayName: z.string().trim().min(1).max(120),
  reviewNoteTemplate: z.string().trim().min(1).max(4000).nullable().optional(),
  sponsorTransactionsByDefault: z.boolean().optional()
});
export type UpsertWalletProfileInput = z.infer<typeof upsertWalletProfileSchema>;

export const createSponsoredFundingRequestSchema = z.object({
  gasPolicyId: z.string().trim().min(1).optional()
});
export type CreateSponsoredFundingRequestInput = z.infer<
  typeof createSponsoredFundingRequestSchema
>;

export const createSponsoredSettlementExecutionRequestSchema = z.object({
  gasPolicyId: z.string().trim().min(1).optional()
});
export type CreateSponsoredSettlementExecutionRequestInput = z.infer<
  typeof createSponsoredSettlementExecutionRequestSchema
>;

export interface WalletProfileSummary {
  approvalNoteTemplate: string | null;
  createdAt: IsoTimestamp;
  defaultGasPolicyId: EntityId | null;
  defaultOrganizationId: EntityId | null;
  displayName: string;
  reviewNoteTemplate: string | null;
  sponsorTransactionsByDefault: boolean;
  updatedAt: IsoTimestamp;
  walletId: EntityId;
}

export interface GasPolicySummary {
  active: boolean;
  allowedApprovalPolicyKinds: string[];
  allowedChainIds: ChainId[];
  allowedTransactionKinds: SponsoredTransactionKind[];
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  description: string | null;
  id: EntityId;
  maxAmountMinor: string | null;
  maxRequestsPerDay: number;
  name: string;
  organizationId: EntityId;
  sponsorWindowMinutes: number;
  updatedAt: IsoTimestamp;
}

export interface SponsoredTransactionRequestSummary {
  amountMinor: string;
  approvedAt: IsoTimestamp | null;
  chainId: ChainId;
  createdAt: IsoTimestamp;
  data: HexString;
  dealMilestoneSettlementRequestId: EntityId | null;
  dealVersionId: EntityId | null;
  draftDealId: EntityId | null;
  expiresAt: IsoTimestamp;
  gasPolicyId: EntityId | null;
  id: EntityId;
  kind: SponsoredTransactionKind;
  organizationId: EntityId;
  reason: string | null;
  requestedByUserId: EntityId;
  rejectedAt: IsoTimestamp | null;
  status: SponsoredTransactionStatus;
  subjectId: EntityId;
  subjectType: "DEAL_VERSION" | "DEAL_MILESTONE_SETTLEMENT_REQUEST";
  submittedAt: IsoTimestamp | null;
  submittedTransactionHash: HexString | null;
  toAddress: WalletAddress;
  updatedAt: IsoTimestamp;
  value: string;
  walletAddress: WalletAddress;
  walletId: EntityId;
}

export interface UpsertWalletProfileResponse {
  profile: WalletProfileSummary;
}

export interface CreateGasPolicyResponse {
  gasPolicy: GasPolicySummary;
}

export interface UpdateGasPolicyResponse {
  gasPolicy: GasPolicySummary;
}

export interface ListGasPoliciesResponse {
  gasPolicies: GasPolicySummary[];
}

export interface CreateSponsoredTransactionRequestResponse {
  sponsoredTransactionRequest: SponsoredTransactionRequestSummary;
}

export interface ListSponsoredTransactionRequestsResponse {
  sponsoredTransactionRequests: SponsoredTransactionRequestSummary[];
}
