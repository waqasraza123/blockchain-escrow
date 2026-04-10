import { z } from "zod";

import type { EntityId, IsoTimestamp, JsonObject } from "./primitives";
import { organizationRoleSchema } from "./organizations";

export const settlementCurrencyForApprovalsSchema = z.enum(["USDC"]);
export type SettlementCurrencyForApprovals = z.infer<
  typeof settlementCurrencyForApprovalsSchema
>;

export const costCenterStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type CostCenterStatus = z.infer<typeof costCenterStatusSchema>;

export const approvalPolicyKindSchema = z.enum([
  "ORGANIZATION_INVITE_CREATE",
  "ORGANIZATION_INVITE_REVOKE",
  "ORGANIZATION_MEMBER_REMOVE",
  "ORGANIZATION_MEMBER_ROLE_UPDATE",
  "COUNTERPARTY_CREATE",
  "FILE_CREATE",
  "TEMPLATE_CREATE",
  "DRAFT_DEAL_CREATE",
  "DEAL_VERSION_CREATE",
  "DEAL_VERSION_ACCEPT",
  "DRAFT_DEAL_COUNTERPARTY_WALLET_UPDATE",
  "DRAFT_DEAL_COST_CENTER_UPDATE",
  "COST_CENTER_CREATE",
  "APPROVAL_POLICY_CREATE",
  "APPROVAL_REQUEST_CREATE",
  "APPROVAL_STEP_DECISION",
  "STATEMENT_SNAPSHOT_CREATE",
  "FUNDING_TRANSACTION_CREATE",
  "DEAL_MILESTONE_SUBMISSION_CREATE",
  "DEAL_MILESTONE_REVIEW_CREATE",
  "DEAL_MILESTONE_SETTLEMENT_REQUEST_CREATE",
  "DEAL_MILESTONE_DISPUTE_CREATE",
  "DEAL_MILESTONE_DISPUTE_ASSIGN_ARBITRATOR",
  "DEAL_MILESTONE_DISPUTE_DECISION_CREATE",
  "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE",
  "FINANCE_EXPORT_CREATE"
]);
export type ApprovalPolicyKind = z.infer<typeof approvalPolicyKindSchema>;

export const approvalSubjectTypeSchema = z.enum([
  "ORGANIZATION",
  "ORGANIZATION_INVITE",
  "ORGANIZATION_MEMBER",
  "COUNTERPARTY",
  "FILE",
  "TEMPLATE",
  "DRAFT_DEAL",
  "DEAL_VERSION",
  "DEAL_VERSION_PARTY",
  "COST_CENTER",
  "APPROVAL_POLICY",
  "APPROVAL_REQUEST",
  "APPROVAL_REQUEST_STEP",
  "DEAL_VERSION_MILESTONE",
  "DEAL_MILESTONE_SUBMISSION",
  "DEAL_MILESTONE_REVIEW",
  "DEAL_MILESTONE_SETTLEMENT_REQUEST",
  "DEAL_MILESTONE_DISPUTE",
  "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
  "FINANCE_EXPORT_JOB"
]);
export type ApprovalSubjectType = z.infer<typeof approvalSubjectTypeSchema>;

export const approvalRequestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
]);
export type ApprovalRequestStatus = z.infer<typeof approvalRequestStatusSchema>;

export const approvalStepStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED"
]);
export type ApprovalStepStatus = z.infer<typeof approvalStepStatusSchema>;

export const approvalDecisionSchema = z.enum(["APPROVED", "REJECTED"]);
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

export const statementSnapshotKindSchema = z.enum(["DEAL_VERSION_SETTLEMENT"]);
export type StatementSnapshotKind = z.infer<typeof statementSnapshotKindSchema>;

export const financeExportJobStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED"
]);
export type FinanceExportJobStatus = z.infer<typeof financeExportJobStatusSchema>;

export const financeExportArtifactFormatSchema = z.enum(["CSV", "JSON"]);
export type FinanceExportArtifactFormat = z.infer<
  typeof financeExportArtifactFormatSchema
>;

const optionalIdSchema = z.string().trim().min(1).optional();
const optionalIsoDateSchema = z.string().date().optional();
const amountMinorSchema = z.string().trim().regex(/^[0-9]+$/);
const optionalJsonObjectSchema = z.record(z.string(), z.unknown()).optional();

export const organizationCostCenterParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type OrganizationCostCenterParams = z.infer<
  typeof organizationCostCenterParamsSchema
>;

export const createCostCenterSchema = z.object({
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().min(1).max(2000).optional(),
  name: z.string().trim().min(1).max(160)
});
export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;

export const updateDraftCostCenterSchema = z.object({
  costCenterId: z.string().trim().min(1).nullable()
});
export type UpdateDraftCostCenterInput = z.infer<
  typeof updateDraftCostCenterSchema
>;

export const createApprovalPolicyStepSchema = z.object({
  label: z.string().trim().min(1).max(160),
  requiredRole: organizationRoleSchema
});
export type CreateApprovalPolicyStepInput = z.infer<
  typeof createApprovalPolicyStepSchema
>;

export const createApprovalPolicySchema = z.object({
  active: z.boolean().optional(),
  costCenterId: optionalIdSchema,
  description: z.string().trim().min(1).max(2000).optional(),
  kind: approvalPolicyKindSchema,
  name: z.string().trim().min(1).max(160),
  settlementCurrency: settlementCurrencyForApprovalsSchema.optional(),
  steps: z.array(createApprovalPolicyStepSchema).min(1).max(10)
});
export type CreateApprovalPolicyInput = z.infer<
  typeof createApprovalPolicySchema
>;

export const dealVersionApprovalRequestParamsSchema = z.object({
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type DealVersionApprovalRequestParams = z.infer<
  typeof dealVersionApprovalRequestParamsSchema
>;

export const approvalRequirementPreviewSchema = z.object({
  actionKind: approvalPolicyKindSchema,
  costCenterId: optionalIdSchema,
  dealMilestoneDisputeId: optionalIdSchema,
  dealVersionId: optionalIdSchema,
  dealVersionMilestoneId: optionalIdSchema,
  draftDealId: optionalIdSchema,
  input: optionalJsonObjectSchema,
  settlementCurrency: settlementCurrencyForApprovalsSchema.optional(),
  subjectId: optionalIdSchema,
  subjectLabel: z.string().trim().min(1).max(200).optional(),
  subjectType: approvalSubjectTypeSchema,
  title: z.string().trim().min(1).max(200).optional(),
  totalAmountMinor: amountMinorSchema.optional()
});
export type ApprovalRequirementPreviewInput = z.infer<
  typeof approvalRequirementPreviewSchema
>;

export const createApprovalRequestSchema = z.object({
  kind: approvalPolicyKindSchema,
  note: z.string().trim().min(1).max(4000).optional()
});
export type CreateApprovalRequestInput = z.infer<
  typeof createApprovalRequestSchema
>;

export const createActionApprovalRequestSchema = approvalRequirementPreviewSchema.extend({
  note: z.string().trim().min(1).max(4000).optional()
});
export type CreateActionApprovalRequestInput = z.infer<
  typeof createActionApprovalRequestSchema
>;

export const listApprovalRequestsParamsSchema = z.object({
  actionKind: approvalPolicyKindSchema.optional(),
  dealVersionId: optionalIdSchema,
  draftDealId: optionalIdSchema,
  organizationId: z.string().trim().min(1),
  status: approvalRequestStatusSchema.optional(),
  subjectId: optionalIdSchema,
  subjectType: approvalSubjectTypeSchema.optional()
});
export type ListApprovalRequestsParams = z.infer<
  typeof listApprovalRequestsParamsSchema
>;

export const approvalRequestParamsSchema = z.object({
  approvalRequestId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type ApprovalRequestParams = z.infer<typeof approvalRequestParamsSchema>;

export const approvalRequestStepDecisionParamsSchema = z.object({
  approvalRequestId: z.string().trim().min(1),
  approvalStepId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type ApprovalRequestStepDecisionParams = z.infer<
  typeof approvalRequestStepDecisionParamsSchema
>;

export const decideApprovalStepSchema = z
  .object({
    decision: approvalDecisionSchema,
    note: z.string().trim().min(1).max(4000).optional()
  })
  .superRefine((value, context) => {
    if (value.decision === "REJECTED" && !value.note) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejection note is required",
        path: ["note"]
      });
    }
  });
export type DecideApprovalStepInput = z.infer<typeof decideApprovalStepSchema>;

export const listStatementSnapshotsParamsSchema = z.object({
  dealVersionId: z.string().trim().min(1),
  draftDealId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type ListStatementSnapshotsParams = z.infer<
  typeof listStatementSnapshotsParamsSchema
>;

export const listOrganizationStatementSnapshotsParamsSchema = z.object({
  costCenterId: optionalIdSchema,
  dealVersionId: optionalIdSchema,
  draftDealId: optionalIdSchema,
  organizationId: z.string().trim().min(1)
});
export type ListOrganizationStatementSnapshotsParams = z.infer<
  typeof listOrganizationStatementSnapshotsParamsSchema
>;

export const createStatementSnapshotSchema = z.object({
  kind: statementSnapshotKindSchema,
  note: z.string().trim().min(1).max(4000).optional()
});
export type CreateStatementSnapshotInput = z.infer<
  typeof createStatementSnapshotSchema
>;

export const reportsDashboardParamsSchema = z.object({
  organizationId: z.string().trim().min(1)
});
export type ReportsDashboardParams = z.infer<typeof reportsDashboardParamsSchema>;

export const listFinanceExportsParamsSchema = z.object({
  organizationId: z.string().trim().min(1),
  status: financeExportJobStatusSchema.optional()
});
export type ListFinanceExportsParams = z.infer<
  typeof listFinanceExportsParamsSchema
>;

export const financeExportJobParamsSchema = z.object({
  exportJobId: z.string().trim().min(1),
  organizationId: z.string().trim().min(1)
});
export type FinanceExportJobParams = z.infer<typeof financeExportJobParamsSchema>;

export const createFinanceExportSchema = z.object({
  actionKinds: z.array(approvalPolicyKindSchema).max(50).optional(),
  costCenterId: optionalIdSchema,
  dateFrom: optionalIsoDateSchema,
  dateTo: optionalIsoDateSchema,
  dealVersionId: optionalIdSchema,
  draftDealId: optionalIdSchema,
  statuses: z.array(approvalRequestStatusSchema).max(10).optional()
});
export type CreateFinanceExportInput = z.infer<typeof createFinanceExportSchema>;

export interface CostCenterSummary {
  code: string;
  createdAt: IsoTimestamp;
  description: string | null;
  id: EntityId;
  name: string;
  organizationId: EntityId;
  status: CostCenterStatus;
  updatedAt: IsoTimestamp;
}

export interface ApprovalPolicyStepSummary {
  id: EntityId;
  label: string;
  position: number;
  requiredRole: z.infer<typeof organizationRoleSchema>;
}

export interface ApprovalPolicySummary {
  active: boolean;
  costCenterId: EntityId | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  description: string | null;
  id: EntityId;
  kind: ApprovalPolicyKind;
  name: string;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrencyForApprovals | null;
  steps: ApprovalPolicyStepSummary[];
  updatedAt: IsoTimestamp;
}

export interface ApprovalSubjectSummary {
  costCenterId: EntityId | null;
  dealMilestoneDisputeId: EntityId | null;
  dealVersionId: EntityId | null;
  dealVersionMilestoneId: EntityId | null;
  draftDealId: EntityId | null;
  id: EntityId;
  label: string | null;
  metadata: JsonObject | null;
  type: ApprovalSubjectType;
}

export interface ApprovalRequestStepSummary {
  decidedAt: IsoTimestamp | null;
  decidedByUserId: EntityId | null;
  id: EntityId;
  label: string;
  note: string | null;
  position: number;
  requiredRole: z.infer<typeof organizationRoleSchema>;
  status: ApprovalStepStatus;
}

export interface ApprovalRequestSummary {
  approvalPolicyId: EntityId;
  costCenterId: EntityId | null;
  decidedAt: IsoTimestamp | null;
  dealVersionId: EntityId | null;
  draftDealId: EntityId | null;
  id: EntityId;
  kind: ApprovalPolicyKind;
  note: string | null;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByUserId: EntityId;
  settlementCurrency: SettlementCurrencyForApprovals | null;
  status: ApprovalRequestStatus;
  steps: ApprovalRequestStepSummary[];
  subject: ApprovalSubjectSummary;
  subjectFingerprint: string;
  title: string;
  totalAmountMinor: string | null;
}

export interface ApprovalRequirementSummary {
  applicablePolicy: ApprovalPolicySummary | null;
  currentRequest: ApprovalRequestSummary | null;
  required: boolean;
  status: "NOT_REQUIRED" | "REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  subject: ApprovalSubjectSummary | null;
}

export interface StatementSnapshotSummary {
  approvalRequestId: EntityId | null;
  asOf: IsoTimestamp;
  costCenterId: EntityId | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  dealVersionId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: StatementSnapshotKind;
  note: string | null;
  organizationId: EntityId;
  payload: JsonObject;
}

export interface FinanceExportArtifactSummary {
  createdAt: IsoTimestamp;
  filename: string;
  format: FinanceExportArtifactFormat;
  id: EntityId;
  mediaType: string;
  sizeBytes: number;
}

export interface FinanceExportArtifactDetail extends FinanceExportArtifactSummary {
  body: string;
}

export interface FinanceExportJobSummary {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  failedAt: IsoTimestamp | null;
  filters: JsonObject;
  id: EntityId;
  organizationId: EntityId;
  readyArtifactCount: number;
  startedAt: IsoTimestamp | null;
  status: FinanceExportJobStatus;
}

export interface FinanceExportJobDetail extends FinanceExportJobSummary {
  artifacts: FinanceExportArtifactDetail[];
  errorMessage: string | null;
  finishedAt: IsoTimestamp | null;
}

export interface ReportingDashboardSummary {
  approvedApprovalRequestCount: number;
  blockedApprovalRequestCount: number;
  completedFinanceExportCount: number;
  failedFinanceExportCount: number;
  fundingTransactionCount: number;
  pendingApprovalRequestCount: number;
  pendingFinanceExportCount: number;
  refundedAmountMinor: string;
  releasedAmountMinor: string;
  settlementExecutionTransactionCount: number;
  statementSnapshotCount: number;
}

export interface ReportingDashboardResponse {
  dashboard: ReportingDashboardSummary;
  recentApprovalRequests: ApprovalRequestSummary[];
  recentFinanceExports: FinanceExportJobSummary[];
  recentStatementSnapshots: StatementSnapshotSummary[];
}

export interface ListCostCentersResponse {
  costCenters: CostCenterSummary[];
}

export interface CreateCostCenterResponse {
  costCenter: CostCenterSummary;
}

export interface UpdateDraftCostCenterResponse {
  costCenter: CostCenterSummary | null;
  draftDealId: EntityId;
}

export interface ListApprovalPoliciesResponse {
  approvalPolicies: ApprovalPolicySummary[];
}

export interface CreateApprovalPolicyResponse {
  approvalPolicy: ApprovalPolicySummary;
}

export interface GetCurrentApprovalRequestResponse {
  approval: ApprovalRequirementSummary;
}

export interface PreviewApprovalRequirementResponse {
  approval: ApprovalRequirementSummary;
}

export interface ListApprovalRequestsResponse {
  approvalRequests: ApprovalRequestSummary[];
}

export interface ApprovalRequestDetailResponse {
  approvalRequest: ApprovalRequestSummary;
}

export interface CreateApprovalRequestResponse {
  approvalRequest: ApprovalRequestSummary;
}

export interface DecideApprovalStepResponse {
  approvalRequest: ApprovalRequestSummary;
  step: ApprovalRequestStepSummary;
}

export interface ListStatementSnapshotsResponse {
  snapshots: StatementSnapshotSummary[];
}

export interface CreateStatementSnapshotResponse {
  snapshot: StatementSnapshotSummary;
}

export interface ListFinanceExportsResponse {
  exportJobs: FinanceExportJobSummary[];
}

export interface CreateFinanceExportResponse {
  exportJob: FinanceExportJobSummary;
}

export interface FinanceExportJobDetailResponse {
  exportJob: FinanceExportJobDetail;
}
