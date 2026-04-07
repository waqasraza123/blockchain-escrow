import { z } from "zod";

import type { CounterpartySummary } from "./counterparties";
import type { FileSummary } from "./files";
import type {
  FundingTransactionIndexedExecutionStatus,
  FundingTransactionStalePendingEvaluation,
  FundingTransactionStatus,
  FundingTransactionSummary
} from "./funding";
import type {
  ChainId,
  EntityId,
  HexString,
  IsoTimestamp,
  WalletAddress
} from "./primitives";

export const dealStateSchema = z.enum([
  "DRAFT",
  "AWAITING_SELLER_ACCEPTANCE",
  "AWAITING_FUNDING",
  "ACTIVE",
  "UNDER_REVIEW",
  "DISPUTED",
  "PARTIALLY_RELEASED",
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
  "EXPIRED"
]);
export type DealState = z.infer<typeof dealStateSchema>;

export const dealPartyRoleSchema = z.enum(["BUYER", "SELLER"]);
export type DealPartyRole = z.infer<typeof dealPartyRoleSchema>;

export const dealPartySubjectTypeSchema = z.enum([
  "ORGANIZATION",
  "COUNTERPARTY"
]);
export type DealPartySubjectType = z.infer<typeof dealPartySubjectTypeSchema>;

export const settlementCurrencySchema = z.enum(["USDC"]);
export type SettlementCurrency = z.infer<typeof settlementCurrencySchema>;

export const createDraftDealSchema = z.object({
  counterpartyId: z.string().trim().min(1),
  organizationRole: dealPartyRoleSchema,
  settlementCurrency: settlementCurrencySchema,
  summary: z.string().trim().min(1).max(2000).optional(),
  templateId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200)
});
export type CreateDraftDealInput = z.infer<typeof createDraftDealSchema>;

export const updateDraftCounterpartyWalletSchema = z.object({
  walletAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/)
});
export type UpdateDraftCounterpartyWalletInput = z.infer<
  typeof updateDraftCounterpartyWalletSchema
>;

export const draftDealParamsSchema = z.object({
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type DraftDealParams = z.infer<typeof draftDealParamsSchema>;

export const organizationDraftDealsParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type OrganizationDraftDealsParams = z.infer<
  typeof organizationDraftDealsParamsSchema
>;

export const draftDealMilestoneInputSchema = z.object({
  amountMinor: z.string().trim().regex(/^[0-9]+$/),
  description: z.string().trim().min(1).max(2000).optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().trim().min(1).max(200)
});
export type DraftDealMilestoneInput = z.infer<typeof draftDealMilestoneInputSchema>;

export const createDealVersionSchema = z.object({
  attachmentFileIds: z.array(z.string().trim().min(1)).max(50).optional(),
  bodyMarkdown: z.string().trim().min(1).max(50000),
  milestoneSnapshots: z.array(draftDealMilestoneInputSchema).min(1).max(100),
  summary: z.string().trim().min(1).max(2000).optional(),
  templateId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200).optional()
});
export type CreateDealVersionInput = z.infer<typeof createDealVersionSchema>;

export interface DraftDealSummary {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  escrow: DraftDealEscrowSummary | null;
  funding: DraftDealFundingProgressSummary;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  state: DealState;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  updatedAt: IsoTimestamp;
}

export interface DraftDealEscrowSummary {
  agreementAddress: WalletAddress;
  chainId: ChainId;
  createdAt: IsoTimestamp;
  dealId: HexString;
  dealVersionHash: HexString;
}

export interface DraftDealFundingProgressSummary {
  latestIndexedAt: IsoTimestamp | null;
  latestIndexedBlockNumber: string | null;
  latestIndexedExecutionStatus: FundingTransactionIndexedExecutionStatus | null;
  latestStalePending: boolean | null;
  latestStalePendingAt: IsoTimestamp | null;
  latestStalePendingEvaluation: FundingTransactionStalePendingEvaluation | null;
  latestSubmittedAt: IsoTimestamp | null;
  latestStatus: FundingTransactionStatus | null;
  stalePendingTransactionCount: number;
  trackedTransactionCount: number;
}

export interface DraftDealPartySummary {
  counterpartyId: CounterpartySummary["id"] | null;
  createdAt: IsoTimestamp;
  displayName: string;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
  updatedAt: IsoTimestamp;
  walletAddress: WalletAddress | null;
}

export interface DealVersionSummary {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  versionNumber: number;
}

export interface DealVersionPartySnapshot {
  counterpartyId: CounterpartySummary["id"] | null;
  createdAt: IsoTimestamp;
  displayName: string;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
}

export interface DealVersionMilestoneSnapshot {
  amountMinor: string;
  description: string | null;
  dueAt: IsoTimestamp | null;
  id: EntityId;
  position: number;
  title: string;
}

export const milestoneWorkflowStateSchema = z.enum([
  "PENDING",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "DISPUTED",
  "RELEASED",
  "REFUNDED"
]);
export type MilestoneWorkflowState = z.infer<typeof milestoneWorkflowStateSchema>;

export const milestoneReviewDecisionSchema = z.enum(["APPROVED", "REJECTED"]);
export type MilestoneReviewDecision = z.infer<typeof milestoneReviewDecisionSchema>;

export const milestoneSettlementRequestKindSchema = z.enum(["RELEASE", "REFUND"]);
export type MilestoneSettlementRequestKind = z.infer<
  typeof milestoneSettlementRequestKindSchema
>;

export const milestoneSubmissionParamsSchema = z.object({
  dealVersionId: z.string().trim().min(1),
  dealVersionMilestoneId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type MilestoneSubmissionParams = z.infer<
  typeof milestoneSubmissionParamsSchema
>;

export const dealVersionMilestoneWorkflowParamsSchema = z.object({
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type DealVersionMilestoneWorkflowParams = z.infer<
  typeof dealVersionMilestoneWorkflowParamsSchema
>;

export const createMilestoneSubmissionSchema = z.object({
  attachmentFileIds: z.array(z.string().trim().min(1)).max(50).optional(),
  statementMarkdown: z.string().trim().min(1).max(10000)
});
export type CreateMilestoneSubmissionInput = z.infer<
  typeof createMilestoneSubmissionSchema
>;

export const milestoneReviewParamsSchema = z.object({
  dealMilestoneSubmissionId: z.string().trim().min(1),
  dealVersionId: z.string().trim().min(1),
  dealVersionMilestoneId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type MilestoneReviewParams = z.infer<typeof milestoneReviewParamsSchema>;

export const milestoneSettlementRequestParamsSchema = z.object({
  dealMilestoneReviewId: z.string().trim().min(1),
  dealMilestoneSubmissionId: z.string().trim().min(1),
  dealVersionId: z.string().trim().min(1),
  dealVersionMilestoneId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type MilestoneSettlementRequestParams = z.infer<
  typeof milestoneSettlementRequestParamsSchema
>;

export const createMilestoneReviewSchema = z
  .object({
    decision: milestoneReviewDecisionSchema,
    statementMarkdown: z.string().trim().min(1).max(10000).optional()
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECTED" && !value.statementMarkdown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejection statement is required",
        path: ["statementMarkdown"]
      });
    }
  });
export type CreateMilestoneReviewInput = z.infer<
  typeof createMilestoneReviewSchema
>;

export const createMilestoneSettlementRequestSchema = z.object({
  kind: milestoneSettlementRequestKindSchema,
  statementMarkdown: z.string().trim().min(1).max(10000).optional()
});
export type CreateMilestoneSettlementRequestInput = z.infer<
  typeof createMilestoneSettlementRequestSchema
>;

export interface DealMilestoneSettlementRequestSummary {
  dealMilestoneReviewId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByUserId: EntityId;
  statementMarkdown: string | null;
}

export interface DealMilestoneReviewSummary {
  decision: MilestoneReviewDecision;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  reviewedAt: IsoTimestamp;
  reviewedByUserId: EntityId;
  settlementRequest: DealMilestoneSettlementRequestSummary | null;
  statementMarkdown: string | null;
}

export interface DealMilestoneSubmissionSummary {
  attachmentFiles: FileSummary[];
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  review: DealMilestoneReviewSummary | null;
  statementMarkdown: string;
  submissionNumber: number;
  submittedAt: IsoTimestamp;
  submittedByCounterpartyId: EntityId | null;
  submittedByPartyRole: DealPartyRole;
  submittedByPartySubjectType: DealPartySubjectType;
  submittedByUserId: EntityId | null;
}

export interface DealVersionMilestoneWorkflow {
  latestReviewAt: IsoTimestamp | null;
  latestSubmissionAt: IsoTimestamp | null;
  milestone: DealVersionMilestoneSnapshot;
  state: MilestoneWorkflowState;
  submissions: DealMilestoneSubmissionSummary[];
}

export interface ListDealVersionMilestoneWorkflowsResponse {
  milestones: DealVersionMilestoneWorkflow[];
}

export interface CreateDealMilestoneSubmissionResponse {
  milestone: DealVersionMilestoneWorkflow;
  submission: DealMilestoneSubmissionSummary;
}

export interface CreateDealMilestoneReviewResponse {
  milestone: DealVersionMilestoneWorkflow;
  review: DealMilestoneReviewSummary;
}

export interface CreateDealMilestoneSettlementRequestResponse {
  milestone: DealVersionMilestoneWorkflow;
  settlementRequest: DealMilestoneSettlementRequestSummary;
}

export interface DealVersionDetail extends DealVersionSummary {
  bodyMarkdown: string;
  files: FileSummary[];
  fundingTransactions: FundingTransactionSummary[];
  milestones: DealVersionMilestoneSnapshot[];
  parties: DealVersionPartySnapshot[];
}

export interface DraftDealListItem {
  draft: DraftDealSummary;
  latestVersion: DealVersionSummary | null;
  parties: DraftDealPartySummary[];
}

export interface ListDraftDealsResponse {
  drafts: DraftDealListItem[];
}

export interface DraftDealDetailResponse {
  draft: DraftDealSummary;
  parties: DraftDealPartySummary[];
  versions: DealVersionDetail[];
}

export type CreateDraftDealResponse = DraftDealDetailResponse;

export interface CreateDealVersionResponse {
  version: DealVersionDetail;
}

export interface UpdateDraftCounterpartyWalletResponse {
  party: DraftDealPartySummary;
}
