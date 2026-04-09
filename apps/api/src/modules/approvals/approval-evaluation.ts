import type {
  ApprovalPolicyRecord,
  ApprovalPolicyStepRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord,
  DealVersionMilestoneRecord,
  DealVersionRecord,
  DraftDealRecord
} from "@blockchain-escrow/db";
import type {
  ApprovalPolicySummary,
  ApprovalRequestSummary,
  ApprovalRequirementSummary
} from "@blockchain-escrow/shared";

function compareIsoDescending(left: string, right: string): number {
  return new Date(right).getTime() - new Date(left).getTime();
}

function sumMilestoneAmounts(
  milestones: readonly DealVersionMilestoneRecord[]
): string {
  return milestones
    .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
    .toString();
}

export function selectApplicableApprovalPolicy(
  policies: readonly ApprovalPolicyRecord[],
  draft: DraftDealRecord,
  version: DealVersionRecord
): ApprovalPolicyRecord | null {
  const matchingPolicies = policies.filter((policy) => {
    if (!policy.active || policy.kind !== "DEAL_FUNDING") {
      return false;
    }

    if (policy.costCenterId && policy.costCenterId !== (draft.costCenterId ?? null)) {
      return false;
    }

    if (
      policy.settlementCurrency &&
      policy.settlementCurrency !== version.settlementCurrency
    ) {
      return false;
    }

    return true;
  });

  if (matchingPolicies.length === 0) {
    return null;
  }

  return [...matchingPolicies].sort((left, right) => {
    const leftSpecificity =
      (left.costCenterId ? 10 : 0) + (left.settlementCurrency ? 1 : 0);
    const rightSpecificity =
      (right.costCenterId ? 10 : 0) + (right.settlementCurrency ? 1 : 0);

    if (leftSpecificity !== rightSpecificity) {
      return rightSpecificity - leftSpecificity;
    }

    return compareIsoDescending(left.updatedAt, right.updatedAt);
  })[0] as ApprovalPolicyRecord;
}

export function toApprovalPolicySummary(
  policy: ApprovalPolicyRecord,
  steps: readonly ApprovalPolicyStepRecord[]
): ApprovalPolicySummary {
  return {
    active: policy.active,
    costCenterId: policy.costCenterId,
    createdAt: policy.createdAt,
    createdByUserId: policy.createdByUserId,
    description: policy.description,
    id: policy.id,
    kind: policy.kind,
    name: policy.name,
    organizationId: policy.organizationId,
    settlementCurrency: policy.settlementCurrency,
    steps: [...steps]
      .sort((left, right) => left.position - right.position)
      .map((step) => ({
        id: step.id,
        label: step.label,
        position: step.position,
        requiredRole: step.requiredRole
      })),
    updatedAt: policy.updatedAt
  };
}

export function toApprovalRequestSummary(
  request: ApprovalRequestRecord,
  steps: readonly ApprovalRequestStepRecord[]
): ApprovalRequestSummary {
  return {
    approvalPolicyId: request.approvalPolicyId,
    costCenterId: request.costCenterId,
    decidedAt: request.decidedAt,
    dealVersionId: request.dealVersionId,
    draftDealId: request.draftDealId,
    id: request.id,
    kind: request.kind,
    note: request.note,
    organizationId: request.organizationId,
    requestedAt: request.requestedAt,
    requestedByUserId: request.requestedByUserId,
    settlementCurrency: request.settlementCurrency,
    status: request.status,
    steps: [...steps]
      .sort((left, right) => left.position - right.position)
      .map((step) => ({
        decidedAt: step.decidedAt,
        decidedByUserId: step.decidedByUserId,
        id: step.id,
        label: step.label,
        note: step.note,
        position: step.position,
        requiredRole: step.requiredRole,
        status: step.status
      })),
    title: request.title,
    totalAmountMinor: request.totalAmountMinor
  };
}

export function buildApprovalRequirementSummary(input: {
  applicablePolicy: ApprovalPolicyRecord | null;
  applicablePolicySteps: readonly ApprovalPolicyStepRecord[];
  currentRequest: ApprovalRequestRecord | null;
  currentRequestSteps: readonly ApprovalRequestStepRecord[];
}): ApprovalRequirementSummary {
  if (!input.applicablePolicy) {
    return {
      applicablePolicy: null,
      currentRequest: null,
      required: false,
      status: "NOT_REQUIRED"
    };
  }

  const currentRequest = input.currentRequest
    ? toApprovalRequestSummary(input.currentRequest, input.currentRequestSteps)
    : null;

  let status: ApprovalRequirementSummary["status"] = "REQUIRED";

  if (input.currentRequest?.status === "APPROVED") {
    status = "APPROVED";
  } else if (input.currentRequest?.status === "REJECTED") {
    status = "REJECTED";
  } else if (input.currentRequest?.status === "PENDING") {
    status = "PENDING";
  }

  return {
    applicablePolicy: toApprovalPolicySummary(
      input.applicablePolicy,
      input.applicablePolicySteps
    ),
    currentRequest,
    required: true,
    status
  };
}

export function buildApprovalRequestRecord(input: {
  approvalPolicy: ApprovalPolicyRecord;
  draft: DraftDealRecord;
  milestones: readonly DealVersionMilestoneRecord[];
  now: string;
  note: string | null;
  requestedByUserId: string;
  requestId: string;
  version: DealVersionRecord;
}): ApprovalRequestRecord {
  return {
    approvalPolicyId: input.approvalPolicy.id,
    costCenterId: input.draft.costCenterId ?? null,
    decidedAt: null,
    dealVersionId: input.version.id,
    draftDealId: input.draft.id,
    id: input.requestId,
    kind: input.approvalPolicy.kind,
    note: input.note,
    organizationId: input.version.organizationId,
    requestedAt: input.now,
    requestedByUserId: input.requestedByUserId,
    settlementCurrency: input.version.settlementCurrency,
    status: "PENDING",
    title: input.version.title,
    totalAmountMinor: sumMilestoneAmounts(input.milestones)
  };
}
