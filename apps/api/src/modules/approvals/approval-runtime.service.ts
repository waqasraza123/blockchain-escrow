import { createHash } from "node:crypto";

import type {
  ApprovalPolicyRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord,
  Release9Repositories
} from "@blockchain-escrow/db";
import type {
  ApprovalPolicyKind,
  ApprovalRequirementSummary,
  ApprovalSubjectSummary,
  ApprovalSubjectType,
  JsonObject,
  SettlementCurrency
} from "@blockchain-escrow/shared";
import { ConflictException, Inject, Injectable } from "@nestjs/common";

import { RELEASE9_REPOSITORIES } from "../../infrastructure/tokens";
import {
  buildApprovalRequirementSummary,
  selectApplicableApprovalPolicy
} from "./approval-evaluation";

export interface ApprovalRuntimeContext {
  readonly actionKind: ApprovalPolicyKind;
  readonly costCenterId: string | null;
  readonly dealMilestoneDisputeId?: string | null;
  readonly dealVersionId: string | null;
  readonly dealVersionMilestoneId: string | null;
  readonly draftDealId: string | null;
  readonly input: JsonObject | null;
  readonly organizationId: string;
  readonly settlementCurrency: SettlementCurrency | null;
  readonly subjectId: string;
  readonly subjectLabel: string | null;
  readonly subjectMetadata: JsonObject | null;
  readonly subjectSnapshot: JsonObject | null;
  readonly subjectType: ApprovalSubjectType;
  readonly title: string;
  readonly totalAmountMinor: string | null;
}

export interface ApprovalRuntimeEvaluation {
  readonly applicablePolicy: ApprovalPolicyRecord | null;
  readonly approval: ApprovalRequirementSummary;
  readonly currentRequest: ApprovalRequestRecord | null;
  readonly currentRequestSteps: ApprovalRequestStepRecord[];
  readonly subjectFingerprint: string;
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJsonValue(child)])
    );
  }

  return value;
}

function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function hashFingerprint(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function toSubjectSummary(context: ApprovalRuntimeContext): ApprovalSubjectSummary {
  return {
    costCenterId: context.costCenterId,
    dealMilestoneDisputeId: context.dealMilestoneDisputeId ?? null,
    dealVersionId: context.dealVersionId,
    dealVersionMilestoneId: context.dealVersionMilestoneId,
    draftDealId: context.draftDealId,
    id: context.subjectId,
    label: context.subjectLabel,
    metadata: context.subjectMetadata,
    type: context.subjectType
  };
}

@Injectable()
export class ApprovalRuntimeService {
  constructor(
    @Inject(RELEASE9_REPOSITORIES)
    private readonly release9Repositories: Release9Repositories
  ) {}

  buildSubjectId(input: {
    actionKind: ApprovalPolicyKind;
    organizationId: string;
    subjectType: ApprovalSubjectType;
    value: unknown;
  }): string {
    return hashFingerprint(input);
  }

  async evaluateRequirement(
    context: ApprovalRuntimeContext
  ): Promise<ApprovalRuntimeEvaluation> {
    const activePolicies =
      await this.release9Repositories.approvalPolicies.listActiveByOrganizationId(
        context.organizationId
      );
    const applicablePolicy = selectApplicableApprovalPolicy({
      actionKind: context.actionKind,
      costCenterId: context.costCenterId,
      organizationId: context.organizationId,
      policies: activePolicies,
      settlementCurrency: context.settlementCurrency
    });
    const subjectFingerprint = hashFingerprint({
      actionKind: context.actionKind,
      input: context.input ?? null,
      subjectId: context.subjectId,
      subjectSnapshot: context.subjectSnapshot ?? null
    });
    const [applicablePolicySteps, currentRequest] = await Promise.all([
      applicablePolicy
        ? this.release9Repositories.approvalPolicySteps.listByApprovalPolicyId(
            applicablePolicy.id
          )
        : Promise.resolve([]),
      applicablePolicy
        ? this.release9Repositories.approvalRequests.findBySubjectFingerprint({
            kind: context.actionKind,
            organizationId: context.organizationId,
            subjectFingerprint,
            subjectId: context.subjectId,
            subjectType: context.subjectType
          })
        : Promise.resolve(null)
    ]);
    const currentRequestSteps = currentRequest
      ? await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
          currentRequest.id
        )
      : [];

    return {
      applicablePolicy,
      approval: buildApprovalRequirementSummary({
        applicablePolicy,
        applicablePolicySteps,
        currentRequest,
        currentRequestSteps,
        subject: toSubjectSummary(context)
      }),
      currentRequest,
      currentRequestSteps,
      subjectFingerprint
    };
  }

  async assertMutationApproved(
    context: ApprovalRuntimeContext
  ): Promise<ApprovalRuntimeEvaluation> {
    const evaluation = await this.evaluateRequirement(context);

    if (evaluation.approval.status !== "APPROVED" && evaluation.approval.required) {
      throw new ConflictException({
        approval: evaluation.approval,
        code: "APPROVAL_REQUIRED",
        message: `approval is required for ${context.actionKind.toLowerCase()}`
      });
    }

    return evaluation;
  }
}
