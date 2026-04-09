import { z } from "zod";

import type {
  EntityId,
  IsoTimestamp,
  JsonObject
} from "./primitives";
import { organizationRoleSchema } from "./organizations";

export const settlementCurrencyForApprovalsSchema = z.enum(["USDC"]);
export type SettlementCurrencyForApprovals = z.infer<
  typeof settlementCurrencyForApprovalsSchema
>;

export const costCenterStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type CostCenterStatus = z.infer<typeof costCenterStatusSchema>;

export const approvalPolicyKindSchema = z.enum(["DEAL_FUNDING"]);
export type ApprovalPolicyKind = z.infer<typeof approvalPolicyKindSchema>;

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
  costCenterId: z.string().trim().min(1).optional(),
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

export const createApprovalRequestSchema = z.object({
  kind: approvalPolicyKindSchema,
  note: z.string().trim().min(1).max(4000).optional()
});
export type CreateApprovalRequestInput = z.infer<
  typeof createApprovalRequestSchema
>;

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

export const createStatementSnapshotSchema = z.object({
  kind: statementSnapshotKindSchema,
  note: z.string().trim().min(1).max(4000).optional()
});
export type CreateStatementSnapshotInput = z.infer<
  typeof createStatementSnapshotSchema
>;

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
  dealVersionId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: ApprovalPolicyKind;
  note: string | null;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByUserId: EntityId;
  settlementCurrency: SettlementCurrencyForApprovals;
  status: ApprovalRequestStatus;
  steps: ApprovalRequestStepSummary[];
  title: string;
  totalAmountMinor: string;
}

export interface ApprovalRequirementSummary {
  applicablePolicy: ApprovalPolicySummary | null;
  currentRequest: ApprovalRequestSummary | null;
  required: boolean;
  status: "NOT_REQUIRED" | "REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
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
