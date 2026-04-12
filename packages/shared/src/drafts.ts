import { z } from "zod";

import type { ApprovalRequirementSummary } from "./approvals";
import type { CounterpartySummary } from "./counterparties";
import type { FileSummary } from "./files";
import type {
  FundingTransactionIndexedExecutionStatus,
  PreparedTransaction,
  FundingTransactionReconciledStatus,
  FundingTransactionStalePendingEvaluation,
  FundingTransactionStatus,
  FundingTransactionSummary
} from "./funding";
import type {
  ChainId,
  EntityId,
  HexString,
  IsoTimestamp,
  JsonObject,
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

export const custodyTrackedDealStates = [
  "ACTIVE",
  "PARTIALLY_RELEASED",
  "COMPLETED",
  "REFUNDED"
] as const satisfies readonly DealState[];

const custodyTrackedDealStateSet = new Set<DealState>(custodyTrackedDealStates);

export function isCustodyTrackedDealState(state: DealState): boolean {
  return custodyTrackedDealStateSet.has(state);
}

export const milestoneWorkflowOpenDealStates = [
  "ACTIVE",
  "PARTIALLY_RELEASED"
] as const satisfies readonly DealState[];

const milestoneWorkflowOpenDealStateSet = new Set<DealState>(
  milestoneWorkflowOpenDealStates
);

export function isMilestoneWorkflowOpenDealState(state: DealState): boolean {
  return milestoneWorkflowOpenDealStateSet.has(state);
}

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
  costCenterId: EntityId | null;
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

export const milestoneSettlementRequestSourceSchema = z.enum([
  "BUYER_REVIEW",
  "ARBITRATOR_DECISION"
]);
export type MilestoneSettlementRequestSource = z.infer<
  typeof milestoneSettlementRequestSourceSchema
>;

export const milestoneDisputeStatusSchema = z.enum(["OPEN", "RESOLVED"]);
export type MilestoneDisputeStatus = z.infer<typeof milestoneDisputeStatusSchema>;

export const milestoneReviewDeadlineStatusSchema = z.enum([
  "OPEN",
  "EXPIRED",
  "REVIEWED_ON_TIME",
  "REVIEWED_AFTER_DEADLINE"
]);
export type MilestoneReviewDeadlineStatus = z.infer<
  typeof milestoneReviewDeadlineStatusSchema
>;

export const milestoneTimelineEventKindSchema = z.enum([
  "SUBMISSION_CREATED",
  "REVIEW_APPROVED",
  "REVIEW_REJECTED",
  "REVIEW_DEADLINE_EXPIRED",
  "DISPUTE_OPENED",
  "DISPUTE_ARBITRATOR_ASSIGNED",
  "DISPUTE_DECISION_SUBMITTED",
  "RELEASE_REQUESTED",
  "REFUND_REQUESTED",
  "SETTLEMENT_PREPARED",
  "RELEASE_EXECUTED",
  "REFUND_EXECUTED"
]);
export type MilestoneTimelineEventKind = z.infer<
  typeof milestoneTimelineEventKindSchema
>;

export const milestoneSettlementExecutionStatusSchema = z.enum([
  "EXECUTED",
  "PENDING_PREPARATION",
  "PREPARED",
  "BLOCKED"
]);
export type MilestoneSettlementExecutionStatus = z.infer<
  typeof milestoneSettlementExecutionStatusSchema
>;

export const milestoneSettlementExecutionBlockerSchema = z.enum([
  "AGREEMENT_NOT_INDEXED",
  "AGREEMENT_MILESTONE_COUNT_MISMATCH",
  "NEWER_SUBMISSION_EXISTS",
  "SETTLEMENT_ALREADY_EXECUTED",
  "SETTLEMENT_EXECUTION_METHOD_UNAVAILABLE",
  "SETTLEMENT_PREPARATION_MISSING"
]);
export type MilestoneSettlementExecutionBlocker = z.infer<
  typeof milestoneSettlementExecutionBlockerSchema
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

export const prepareCounterpartyMilestoneSubmissionSchema = z.object({
  statementMarkdown: z.string().trim().min(1).max(10000)
});
export type PrepareCounterpartyMilestoneSubmissionInput = z.infer<
  typeof prepareCounterpartyMilestoneSubmissionSchema
>;

export const createCounterpartyMilestoneSubmissionSchema =
  prepareCounterpartyMilestoneSubmissionSchema.extend({
    signature: z.string().trim().regex(/^0x[a-fA-F0-9]+$/)
  });
export type CreateCounterpartyMilestoneSubmissionInput = z.infer<
  typeof createCounterpartyMilestoneSubmissionSchema
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

export const milestoneDisputeParamsSchema = milestoneSettlementRequestParamsSchema;
export type MilestoneDisputeParams = z.infer<typeof milestoneDisputeParamsSchema>;

export const dealVersionMilestoneDisputeParamsSchema = z.object({
  dealMilestoneDisputeId: z.string().trim().min(1),
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type DealVersionMilestoneDisputeParams = z.infer<
  typeof dealVersionMilestoneDisputeParamsSchema
>;

export const milestoneSettlementExecutionPlanParamsSchema = z.object({
  dealMilestoneSettlementRequestId: z.string().trim().min(1),
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type MilestoneSettlementExecutionPlanParams = z.infer<
  typeof milestoneSettlementExecutionPlanParamsSchema
>;

export const milestoneSettlementExecutionTransactionParamsSchema = z.object({
  dealMilestoneSettlementRequestId: z.string().trim().min(1),
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type MilestoneSettlementExecutionTransactionParams = z.infer<
  typeof milestoneSettlementExecutionTransactionParamsSchema
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

export const createMilestoneDisputeSchema = z
  .object({
    attachmentFileIds: z.array(z.string().trim().min(1)).max(50).optional(),
    statementMarkdown: z.string().trim().min(1).max(10000)
  })
  .superRefine((value, ctx) => {
    const attachmentFileIds = value.attachmentFileIds ?? [];

    if (new Set(attachmentFileIds).size !== attachmentFileIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "attachment file ids must be unique",
        path: ["attachmentFileIds"]
      });
    }
  });
export type CreateMilestoneDisputeInput = z.infer<
  typeof createMilestoneDisputeSchema
>;

export const assignMilestoneDisputeArbitratorSchema = z.object({
  arbitratorAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/)
});
export type AssignMilestoneDisputeArbitratorInput = z.infer<
  typeof assignMilestoneDisputeArbitratorSchema
>;

export const prepareMilestoneDisputeDecisionSchema = z.object({
  kind: milestoneSettlementRequestKindSchema,
  statementMarkdown: z.string().trim().min(1).max(10000)
});
export type PrepareMilestoneDisputeDecisionInput = z.infer<
  typeof prepareMilestoneDisputeDecisionSchema
>;

export const createMilestoneDisputeDecisionSchema =
  prepareMilestoneDisputeDecisionSchema.extend({
    signature: z.string().trim().regex(/^0x[a-fA-F0-9]+$/)
  });
export type CreateMilestoneDisputeDecisionInput = z.infer<
  typeof createMilestoneDisputeDecisionSchema
>;

export const createMilestoneSettlementExecutionTransactionSchema = z.object({
  transactionHash: z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/)
});
export type CreateMilestoneSettlementExecutionTransactionInput = z.infer<
  typeof createMilestoneSettlementExecutionTransactionSchema
>;

export interface DealMilestoneSettlementRequestSummary {
  dealMilestoneDisputeDecisionId: EntityId | null;
  dealMilestoneDisputeId: EntityId | null;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  executionPreparation: DealMilestoneSettlementPreparationSummary | null;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByArbitratorAddress: WalletAddress | null;
  requestedByUserId: EntityId | null;
  source: MilestoneSettlementRequestSource;
  statementMarkdown: string | null;
}

export interface DealMilestoneSettlementPreparationSummary {
  agreementAddress: WalletAddress;
  chainId: ChainId;
  dealId: HexString;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSettlementRequestId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionHash: HexString;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  milestoneAmountMinor: string;
  milestonePosition: number;
  organizationId: EntityId;
  preparedAt: IsoTimestamp;
  settlementTokenAddress: WalletAddress;
  totalAmount: string;
}

export interface DealMilestoneIndexedSettlementSummary {
  agreementAddress: WalletAddress;
  amount: string;
  beneficiaryAddress: WalletAddress;
  chainId: ChainId;
  dealId: HexString;
  dealVersionHash: HexString;
  kind: MilestoneSettlementRequestKind;
  milestonePosition: number;
  settledAt: IsoTimestamp;
  settledBlockNumber: string;
  settledByAddress: WalletAddress;
  settledTransactionHash: HexString;
}

export interface MilestoneReviewDeadlineSummary {
  deadlineAt: IsoTimestamp;
  expiredAt: IsoTimestamp | null;
  status: MilestoneReviewDeadlineStatus;
}

export interface CounterpartyDealMilestoneSubmissionChallenge {
  expectedWalletAddress: WalletAddress;
  typedData: JsonObject;
}

export interface DealMilestoneDisputeDecisionChallenge {
  expectedWalletAddress: WalletAddress;
  typedData: JsonObject;
}

export interface DealMilestoneDisputeEvidenceSummary {
  createdAt: IsoTimestamp;
  dealMilestoneDisputeId: EntityId;
  file: FileSummary;
  fileId: EntityId;
  id: EntityId;
}

export interface DealMilestoneDisputeAssignmentSummary {
  arbitratorAddress: WalletAddress;
  assignedAt: IsoTimestamp;
  assignedByUserId: EntityId;
  chainId: ChainId;
  dealMilestoneDisputeId: EntityId;
  id: EntityId;
}

export interface DealMilestoneDisputeDecisionSummary {
  assignmentId: EntityId;
  decidedAt: IsoTimestamp;
  dealMilestoneDisputeId: EntityId;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSettlementRequestId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  organizationId: EntityId;
  signature: HexString;
  signedByArbitratorAddress: WalletAddress;
  statementMarkdown: string;
  typedData: JsonObject;
}

export interface DealMilestoneDisputeSummary {
  attachmentFiles: DealMilestoneDisputeEvidenceSummary[];
  dealMilestoneReviewId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  latestAssignment: DealMilestoneDisputeAssignmentSummary | null;
  latestDecision: DealMilestoneDisputeDecisionSummary | null;
  openedAt: IsoTimestamp;
  openedByUserId: EntityId;
  organizationId: EntityId;
  statementMarkdown: string;
  status: MilestoneDisputeStatus;
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
  reviewDeadline: MilestoneReviewDeadlineSummary;
  statementMarkdown: string;
  submissionNumber: number;
  submittedAt: IsoTimestamp;
  submittedByCounterpartyId: EntityId | null;
  submittedByPartyRole: DealPartyRole;
  submittedByPartySubjectType: DealPartySubjectType;
  submittedByUserId: EntityId | null;
}

export interface DealVersionMilestoneWorkflow {
  currentDispute: DealMilestoneDisputeSummary | null;
  latestReviewDeadline: MilestoneReviewDeadlineSummary | null;
  latestReviewAt: IsoTimestamp | null;
  latestSubmissionAt: IsoTimestamp | null;
  milestone: DealVersionMilestoneSnapshot;
  state: MilestoneWorkflowState;
  submissions: DealMilestoneSubmissionSummary[];
}

export interface ListDealVersionMilestoneWorkflowsResponse {
  milestones: DealVersionMilestoneWorkflow[];
}

export interface DealMilestoneTimelineEvent {
  actorUserId: EntityId | null;
  attachmentFiles: FileSummary[];
  dealMilestoneDisputeDecisionId: EntityId | null;
  dealMilestoneDisputeId: EntityId | null;
  dealMilestoneReviewId: EntityId | null;
  dealMilestoneSettlementRequestId: EntityId | null;
  dealMilestoneSubmissionId: EntityId | null;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  indexedSettlement: DealMilestoneIndexedSettlementSummary | null;
  dispute: DealMilestoneDisputeSummary | null;
  kind: MilestoneTimelineEventKind;
  occurredAt: IsoTimestamp;
  organizationId: EntityId;
  reviewDeadline: MilestoneReviewDeadlineSummary | null;
  reviewDecision: MilestoneReviewDecision | null;
  settlementPreparation: DealMilestoneSettlementPreparationSummary | null;
  settlementKind: MilestoneSettlementRequestKind | null;
  statementMarkdown: string | null;
  submittedByCounterpartyId: EntityId | null;
  submittedByPartyRole: DealPartyRole | null;
  submittedByPartySubjectType: DealPartySubjectType | null;
}

export interface DealVersionMilestoneTimeline {
  latestOccurredAt: IsoTimestamp | null;
  milestone: DealVersionMilestoneSnapshot;
  events: DealMilestoneTimelineEvent[];
}

export interface ListDealVersionMilestoneTimelinesResponse {
  milestones: DealVersionMilestoneTimeline[];
}

export interface DealMilestoneSettlementExecutionSummary {
  blockers: MilestoneSettlementExecutionBlocker[];
  executionPreparation: DealMilestoneSettlementPreparationSummary | null;
  indexedSettlement: DealMilestoneIndexedSettlementSummary | null;
  milestone: DealVersionMilestoneSnapshot;
  review: DealMilestoneReviewSummary;
  settlementRequest: DealMilestoneSettlementRequestSummary;
  status: MilestoneSettlementExecutionStatus;
}

export interface ListDealVersionMilestoneSettlementExecutionsResponse {
  settlements: DealMilestoneSettlementExecutionSummary[];
}

export interface DealMilestoneDisputePacket {
  dispute: DealMilestoneDisputeSummary;
  indexedSettlement: DealMilestoneIndexedSettlementSummary | null;
  milestone: DealVersionMilestoneSnapshot;
  review: DealMilestoneReviewSummary;
  settlementRequest: DealMilestoneSettlementRequestSummary | null;
  submission: DealMilestoneSubmissionSummary;
}

export interface ListDealVersionMilestoneDisputesResponse {
  disputes: DealMilestoneDisputePacket[];
}

export interface DealVersionSettlementStatementSummary {
  agreementAddress: WalletAddress | null;
  chainId: ChainId | null;
  dealId: HexString | null;
  dealVersionHash: HexString | null;
  draftDealId: EntityId;
  draftState: DealState;
  latestSettledAt: IsoTimestamp | null;
  milestoneCount: number;
  organizationId: EntityId;
  pendingAmountMinor: string;
  pendingMilestoneCount: number;
  refundedAmountMinor: string;
  refundedMilestoneCount: number;
  releasedAmountMinor: string;
  releasedMilestoneCount: number;
  settlementTokenAddress: WalletAddress | null;
  totalAmountMinor: string;
}

export interface DealVersionMilestoneStatement {
  currentDispute: DealMilestoneDisputeSummary | null;
  indexedSettlement: DealMilestoneIndexedSettlementSummary | null;
  latestReview: DealMilestoneReviewSummary | null;
  latestReviewDeadline: MilestoneReviewDeadlineSummary | null;
  latestSettlementRequest: DealMilestoneSettlementRequestSummary | null;
  latestSubmission: DealMilestoneSubmissionSummary | null;
  milestone: DealVersionMilestoneSnapshot;
  state: MilestoneWorkflowState;
}

export interface GetDealVersionSettlementStatementResponse {
  milestones: DealVersionMilestoneStatement[];
  statement: DealVersionSettlementStatementSummary;
}

export interface MilestoneSettlementExecutionPlanSummary {
  agreementAddress: WalletAddress | null;
  blockers: MilestoneSettlementExecutionBlocker[];
  chainId: ChainId;
  contractVersion: number | null;
  dealId: HexString | null;
  dealVersionHash: HexString | null;
  executionPreparation: DealMilestoneSettlementPreparationSummary | null;
  executionTransaction: PreparedTransaction | null;
  executionTransactionMethod: "refundMilestone" | "releaseMilestone" | null;
  indexedSettlement: DealMilestoneIndexedSettlementSummary | null;
  milestone: DealVersionMilestoneSnapshot;
  network: string | null;
  ready: boolean;
  review: DealMilestoneReviewSummary;
  settlementRequest: DealMilestoneSettlementRequestSummary;
  settlementTokenAddress: WalletAddress | null;
  totalAmountMinor: string | null;
}

export interface GetMilestoneSettlementExecutionPlanResponse {
  plan: MilestoneSettlementExecutionPlanSummary;
}

export interface DealMilestoneSettlementExecutionTransactionSummary {
  agreementAddress: WalletAddress | null;
  chainId: ChainId;
  confirmedAt: IsoTimestamp | null;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSettlementRequestId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  indexedAt: IsoTimestamp | null;
  indexedBlockNumber: string | null;
  indexedExecutionStatus: FundingTransactionIndexedExecutionStatus | null;
  matchesTrackedAgreement: boolean | null;
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
  supersededByDealMilestoneSettlementExecutionTransactionId: EntityId | null;
  supersededByTransactionHash: HexString | null;
  transactionHash: HexString;
}

export interface CreateDealMilestoneSettlementExecutionTransactionResponse {
  executionTransaction: DealMilestoneSettlementExecutionTransactionSummary;
}

export interface ListDealMilestoneSettlementExecutionTransactionsResponse {
  executionTransactions: DealMilestoneSettlementExecutionTransactionSummary[];
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

export interface CreateDealMilestoneDisputeResponse {
  dispute: DealMilestoneDisputeSummary;
  milestone: DealVersionMilestoneWorkflow;
}

export interface AssignDealMilestoneDisputeArbitratorResponse {
  dispute: DealMilestoneDisputeSummary;
}

export interface PrepareDealMilestoneDisputeDecisionResponse {
  challenge: DealMilestoneDisputeDecisionChallenge;
  dispute: DealMilestoneDisputeSummary;
}

export interface CreateDealMilestoneDisputeDecisionResponse {
  dispute: DealMilestoneDisputeSummary;
  milestone: DealVersionMilestoneWorkflow;
  settlementRequest: DealMilestoneSettlementRequestSummary;
}

export interface PrepareCounterpartyDealMilestoneSubmissionResponse {
  challenge: CounterpartyDealMilestoneSubmissionChallenge;
}

export interface CreateCounterpartyDealMilestoneSubmissionResponse {
  milestone: DealVersionMilestoneWorkflow;
  submission: DealMilestoneSubmissionSummary;
}

export interface DealVersionDetail extends DealVersionSummary {
  approval: ApprovalRequirementSummary | null;
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
