import type {
  ApprovalPolicyRecord,
  ApprovalPolicyStepRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord
} from "@blockchain-escrow/db";
import type {
  ApprovalPolicySummary,
  ApprovalRequestSummary,
  ApprovalRequirementSummary,
  ApprovalSubjectSummary
} from "@blockchain-escrow/shared";

function compareIsoDescending(left: string, right: string): number {
  return new Date(right).getTime() - new Date(left).getTime();
}

export function selectApplicableApprovalPolicy(input: {
  actionKind: ApprovalPolicyRecord["kind"];
  costCenterId: string | null;
  organizationId: string;
  policies: readonly ApprovalPolicyRecord[];
  settlementCurrency: ApprovalPolicyRecord["settlementCurrency"];
}): ApprovalPolicyRecord | null {
  const matchingPolicies = input.policies.filter((policy) => {
    if (!policy.active || policy.organizationId !== input.organizationId) {
      return false;
    }

    if (policy.kind !== input.actionKind) {
      return false;
    }

    if (policy.costCenterId && policy.costCenterId !== input.costCenterId) {
      return false;
    }

    if (
      policy.settlementCurrency &&
      policy.settlementCurrency !== input.settlementCurrency
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

export function toApprovalSubjectSummary(
  request: Pick<
    ApprovalRequestRecord,
    | "costCenterId"
    | "dealVersionId"
    | "dealVersionMilestoneId"
    | "draftDealId"
    | "metadata"
    | "subjectId"
    | "subjectLabel"
    | "subjectType"
  >
): ApprovalSubjectSummary {
  return {
    costCenterId: request.costCenterId,
    dealMilestoneDisputeId:
      typeof request.metadata?.dealMilestoneDisputeId === "string"
        ? request.metadata.dealMilestoneDisputeId
        : null,
    dealVersionId: request.dealVersionId,
    dealVersionMilestoneId: request.dealVersionMilestoneId,
    draftDealId: request.draftDealId,
    id: request.subjectId,
    label: request.subjectLabel,
    metadata: request.metadata,
    type: request.subjectType
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
    subject: toApprovalSubjectSummary(request),
    subjectFingerprint: request.subjectFingerprint,
    title: request.title,
    totalAmountMinor: request.totalAmountMinor
  };
}

export function buildApprovalRequirementSummary(input: {
  applicablePolicy: ApprovalPolicyRecord | null;
  applicablePolicySteps: readonly ApprovalPolicyStepRecord[];
  currentRequest: ApprovalRequestRecord | null;
  currentRequestSteps: readonly ApprovalRequestStepRecord[];
  subject: ApprovalSubjectSummary | null;
}): ApprovalRequirementSummary {
  if (!input.applicablePolicy) {
    return {
      applicablePolicy: null,
      currentRequest: null,
      required: false,
      status: "NOT_REQUIRED",
      subject: input.subject
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
    status,
    subject: input.subject
  };
}
