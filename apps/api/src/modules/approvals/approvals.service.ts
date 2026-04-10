import { randomUUID } from "node:crypto";

import type {
  CostCenterRecord,
  DealVersionRecord,
  DraftDealRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  Release9Repositories
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  approvalRequestParamsSchema,
  approvalRequestStepDecisionParamsSchema,
  approvalRequirementPreviewSchema,
  createApprovalPolicySchema,
  createActionApprovalRequestSchema,
  createApprovalRequestSchema,
  createCostCenterSchema,
  createFinanceExportSchema,
  createStatementSnapshotSchema,
  dealVersionApprovalRequestParamsSchema,
  decideApprovalStepSchema,
  draftDealParamsSchema,
  financeExportJobParamsSchema,
  listStatementSnapshotsParamsSchema,
  listApprovalRequestsParamsSchema,
  listFinanceExportsParamsSchema,
  listOrganizationStatementSnapshotsParamsSchema,
  organizationCostCenterParamsSchema,
  reportsDashboardParamsSchema,
  updateDraftCostCenterSchema,
  type ApprovalRequestDetailResponse,
  type ApprovalRequirementSummary,
  type CreateApprovalPolicyResponse,
  type CreateFinanceExportResponse,
  type CreateApprovalRequestResponse,
  type CreateCostCenterResponse,
  type CreateStatementSnapshotResponse,
  type DecideApprovalStepResponse,
  type FinanceExportJobDetailResponse,
  type GetCurrentApprovalRequestResponse,
  type JsonObject,
  type ListApprovalRequestsParams,
  type ListApprovalRequestsResponse,
  type ListApprovalPoliciesResponse,
  type ListCostCentersResponse,
  type ListFinanceExportsResponse,
  type ListStatementSnapshotsResponse,
  type PreviewApprovalRequirementResponse,
  type ReportingDashboardResponse,
  type StatementSnapshotSummary,
  type UpdateDraftCostCenterResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import {
  RELEASE1_REPOSITORIES,
  RELEASE9_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import { MilestonesService } from "../milestones/milestones.service";
import {
  toApprovalPolicySummary,
  toApprovalRequestSummary
} from "./approval-evaluation";
import {
  ApprovalRuntimeService,
  type ApprovalRuntimeContext
} from "./approval-runtime.service";

type OrganizationAccessContext = {
  actor: AuthenticatedSessionContext;
  membership: OrganizationMemberRecord;
  organization: OrganizationRecord;
};

type DealVersionAccessContext = OrganizationAccessContext & {
  draft: DraftDealRecord;
  version: DealVersionRecord;
};

function normalizeCostCenterCode(value: string): string {
  return value.trim().toUpperCase();
}

function toCostCenterSummary(record: CostCenterRecord) {
  return {
    code: record.code,
    createdAt: record.createdAt,
    description: record.description,
    id: record.id,
    name: record.name,
    organizationId: record.organizationId,
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function toStatementSnapshotSummary(
  record: {
    approvalRequestId: string | null;
    asOf: string;
    costCenterId: string | null;
    createdAt: string;
    createdByUserId: string;
    dealVersionId: string;
    draftDealId: string;
    id: string;
    kind: StatementSnapshotSummary["kind"];
    note: string | null;
    organizationId: string;
    payload: JsonObject;
  }
): StatementSnapshotSummary {
  return {
    approvalRequestId: record.approvalRequestId,
    asOf: record.asOf,
    costCenterId: record.costCenterId,
    createdAt: record.createdAt,
    createdByUserId: record.createdByUserId,
    dealVersionId: record.dealVersionId,
    draftDealId: record.draftDealId,
    id: record.id,
    kind: record.kind,
    note: record.note,
    organizationId: record.organizationId,
    payload: record.payload
  };
}

function toFinanceExportJobSummary(record: {
  createdAt: string;
  createdByUserId: string;
  failedAt: string | null;
  filters: JsonObject;
  id: string;
  organizationId: string;
  startedAt: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}) {
  return {
    createdAt: record.createdAt,
    createdByUserId: record.createdByUserId,
    failedAt: record.failedAt,
    filters: record.filters,
    id: record.id,
    organizationId: record.organizationId,
    readyArtifactCount: 0,
    startedAt: record.startedAt,
    status: record.status
  };
}

@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE9_REPOSITORIES)
    private readonly release9Repositories: Release9Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    private readonly approvalRuntimeService: ApprovalRuntimeService,
    private readonly milestonesService: MilestonesService
  ) {}

  async listCostCenters(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListCostCentersResponse> {
    const parsed = organizationCostCenterParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const costCenters = await this.release9Repositories.costCenters.listByOrganizationId(
      parsed.data.organizationId
    );

    return {
      costCenters: costCenters.map(toCostCenterSummary)
    };
  }

  async createCostCenter(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateCostCenterResponse> {
    const parsed = createCostCenterSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const normalizedCode = normalizeCostCenterCode(parsed.data.code);
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "COST_CENTER_CREATE",
      costCenterId: null,
      dealVersionId: null,
      dealVersionMilestoneId: null,
      draftDealId: null,
      input: {
        ...parsed.data,
        code: normalizedCode
      } as JsonObject,
      organizationId,
      settlementCurrency: null,
      subjectId: this.approvalRuntimeService.buildSubjectId({
        actionKind: "COST_CENTER_CREATE",
        organizationId,
        subjectType: "COST_CENTER",
        value: {
          code: normalizedCode,
          name: parsed.data.name
        }
      }),
      subjectLabel: parsed.data.name,
      subjectMetadata: null,
      subjectSnapshot: {
        organizationId
      } as JsonObject,
      subjectType: "COST_CENTER",
      title: parsed.data.name,
      totalAmountMinor: null
    });
    const existing =
      await this.release9Repositories.costCenters.findByOrganizationIdAndNormalizedCode(
        organizationId,
        normalizedCode
      );

    if (existing) {
      throw new ConflictException("cost center code already exists");
    }

    const now = new Date().toISOString();
    const costCenter = await this.release9Repositories.costCenters.create({
      code: normalizedCode,
      createdAt: now,
      createdByUserId: access.actor.user.id,
      description: parsed.data.description ?? null,
      id: randomUUID(),
      name: parsed.data.name,
      normalizedCode,
      organizationId,
      status: "ACTIVE",
      updatedAt: now
    });

    await this.release1Repositories.auditLogs.append({
      action: "COST_CENTER_CREATED",
      actorUserId: access.actor.user.id,
      entityId: costCenter.id,
      entityType: "COST_CENTER",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        code: costCenter.code,
        status: costCenter.status
      },
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      costCenter: toCostCenterSummary(costCenter)
    };
  }

  async updateDraftCostCenter(
    input: unknown,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdateDraftCostCenterResponse> {
    const parsedInput = draftDealParamsSchema.safeParse(input);
    const parsedBody = updateDraftCostCenterSchema.safeParse(body);

    if (!parsedInput.success) {
      throw new BadRequestException(parsedInput.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireDraftAccess(
      parsedInput.data.organizationId,
      parsedInput.data.draftDealId,
      requestMetadata,
      "ADMIN"
    );
    const costCenter = parsedBody.data.costCenterId
      ? await this.requireCostCenterInOrganization(
          parsedInput.data.organizationId,
          parsedBody.data.costCenterId
        )
      : null;
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "DRAFT_DEAL_COST_CENTER_UPDATE",
      costCenterId: costCenter?.id ?? null,
      dealVersionId: null,
      dealVersionMilestoneId: null,
      draftDealId: access.draft.id,
      input: parsedBody.data as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.draft.settlementCurrency,
      subjectId: access.draft.id,
      subjectLabel: access.draft.title,
      subjectMetadata: null,
      subjectSnapshot: {
        currentCostCenterId: access.draft.costCenterId ?? null,
        draftDealId: access.draft.id
      } as JsonObject,
      subjectType: "DRAFT_DEAL",
      title: access.draft.title,
      totalAmountMinor: null
    });
    const updated = await this.release1Repositories.draftDeals.updateCostCenter(
      access.draft.id,
      costCenter?.id ?? null,
      new Date().toISOString()
    );

    if (!updated) {
      throw new NotFoundException("draft deal not found");
    }

    return {
      costCenter: costCenter ? toCostCenterSummary(costCenter) : null,
      draftDealId: updated.id
    };
  }

  async listApprovalPolicies(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListApprovalPoliciesResponse> {
    const parsed = organizationCostCenterParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const policies = await this.release9Repositories.approvalPolicies.listByOrganizationId(
      parsed.data.organizationId
    );
    const approvalPolicies = await Promise.all(
      policies.map(async (policy) =>
        toApprovalPolicySummary(
          policy,
          await this.release9Repositories.approvalPolicySteps.listByApprovalPolicyId(
            policy.id
          )
        )
      )
    );

    return {
      approvalPolicies
    };
  }

  async createApprovalPolicy(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateApprovalPolicyResponse> {
    const parsed = createApprovalPolicySchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );

    if (parsed.data.costCenterId) {
      await this.requireCostCenterInOrganization(organizationId, parsed.data.costCenterId);
    }

    const now = new Date().toISOString();
    const approvalPolicy = await this.release9Repositories.approvalPolicies.create({
      active: parsed.data.active ?? true,
      costCenterId: parsed.data.costCenterId ?? null,
      createdAt: now,
      createdByUserId: access.actor.user.id,
      description: parsed.data.description ?? null,
      id: randomUUID(),
      kind: parsed.data.kind,
      name: parsed.data.name,
      organizationId,
      settlementCurrency: parsed.data.settlementCurrency ?? null,
      updatedAt: now
    });
    const approvalPolicySteps = await Promise.all(
      parsed.data.steps.map((step, index) =>
        this.release9Repositories.approvalPolicySteps.create({
          approvalPolicyId: approvalPolicy.id,
          id: randomUUID(),
          label: step.label,
          position: index + 1,
          requiredRole: step.requiredRole
        })
      )
    );

    await this.release1Repositories.auditLogs.append({
      action: "APPROVAL_POLICY_CREATED",
      actorUserId: access.actor.user.id,
      entityId: approvalPolicy.id,
      entityType: "APPROVAL_POLICY",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        active: approvalPolicy.active,
        costCenterId: approvalPolicy.costCenterId,
        kind: approvalPolicy.kind
      },
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      approvalPolicy: toApprovalPolicySummary(approvalPolicy, approvalPolicySteps)
    };
  }

  async getCurrentApproval(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<GetCurrentApprovalRequestResponse> {
    const parsed = dealVersionApprovalRequestParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireDealVersionAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );

    return {
      approval: await this.buildApprovalRequirement(access.draft, access.version)
    };
  }

  async previewApprovalRequirement(
    organizationId: string,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<PreviewApprovalRequirementResponse> {
    const parsed = approvalRequirementPreviewSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(organizationId, requestMetadata);
    const runtimeContext = this.toRuntimeContext(organizationId, parsed.data);

    return {
      approval: (await this.approvalRuntimeService.evaluateRequirement(runtimeContext)).approval
    };
  }

  async listApprovalRequests(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListApprovalRequestsResponse> {
    const parsed = listApprovalRequestsParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    return this.listApprovalRequestsForOrganization(parsed.data);
  }

  async listApprovalRequestsForOrganization(
    input: ListApprovalRequestsParams
  ): Promise<ListApprovalRequestsResponse> {
    const approvalRequests =
      await this.release9Repositories.approvalRequests.listByOrganizationId(
        input.organizationId
      );
    const filtered = approvalRequests.filter((record) => {
      if (input.actionKind && record.kind !== input.actionKind) {
        return false;
      }
      if (input.dealVersionId && record.dealVersionId !== input.dealVersionId) {
        return false;
      }
      if (input.draftDealId && record.draftDealId !== input.draftDealId) {
        return false;
      }
      if (input.status && record.status !== input.status) {
        return false;
      }
      if (input.subjectId && record.subjectId !== input.subjectId) {
        return false;
      }
      if (input.subjectType && record.subjectType !== input.subjectType) {
        return false;
      }
      return true;
    });

    return {
      approvalRequests: await Promise.all(
        filtered.map(async (record) =>
          toApprovalRequestSummary(
            record,
            await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
              record.id
            )
          )
        )
      )
    };
  }

  async getApprovalRequestDetail(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ApprovalRequestDetailResponse> {
    const parsed = approvalRequestParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    return this.getApprovalRequestDetailForOrganization(parsed.data);
  }

  async getApprovalRequestDetailForOrganization(input: {
    approvalRequestId: string;
    organizationId: string;
  }): Promise<ApprovalRequestDetailResponse> {
    const approvalRequest = await this.release9Repositories.approvalRequests.findById(
      input.approvalRequestId
    );

    if (!approvalRequest || approvalRequest.organizationId !== input.organizationId) {
      throw new NotFoundException("approval request not found");
    }

    return {
      approvalRequest: toApprovalRequestSummary(
        approvalRequest,
        await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
          approvalRequest.id
        )
      )
    };
  }

  async createActionApprovalRequest(
    organizationId: string,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateApprovalRequestResponse> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const access = await this.authorizeOrganizationActor(actor, organizationId, "ADMIN");
    return this.createActionApprovalRequestWithActor(
      access,
      organizationId,
      body,
      requestMetadata
    );
  }

  async createActionApprovalRequestWithActor(
    access: OrganizationAccessContext,
    organizationId: string,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateApprovalRequestResponse> {
    const parsed = createActionApprovalRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const runtimeContext = this.toRuntimeContext(organizationId, parsed.data);

    return {
      approvalRequest: await this.createApprovalRequestFromRuntimeContext(
        runtimeContext,
        parsed.data.note ?? null,
        access.actor.user.id,
        requestMetadata
      )
    };
  }

  async createApprovalRequest(
    input: unknown,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateApprovalRequestResponse> {
    const parsedInput = dealVersionApprovalRequestParamsSchema.safeParse(input);
    const parsedBody = createApprovalRequestSchema.safeParse(body);

    if (!parsedInput.success) {
      throw new BadRequestException(parsedInput.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireDealVersionAccess(
      parsedInput.data.organizationId,
      parsedInput.data.draftDealId,
      parsedInput.data.dealVersionId,
      requestMetadata,
      "ADMIN"
    );
    const runtimeContext = await this.buildFundingApprovalRuntimeContext(access);
    const created = await this.createApprovalRequestFromRuntimeContext(
      runtimeContext,
      parsedBody.data.note ?? null,
      access.actor.user.id,
      requestMetadata
    );

    return { approvalRequest: created };
  }

  async decideApprovalStep(
    input: unknown,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<DecideApprovalStepResponse> {
    const parsedInput = {
      body: decideApprovalStepSchema.safeParse(body),
      params: approvalRequestStepDecisionParamsSchema.safeParse(input)
    };

    if (!parsedInput.params.success) {
      throw new BadRequestException(parsedInput.params.error.flatten());
    }

    if (!parsedInput.body.success) {
      throw new BadRequestException(parsedInput.body.error.flatten());
    }

    const access = await this.requireOrganizationAccess(
      parsedInput.params.data.organizationId,
      requestMetadata
    );
    const approvalRequest = await this.release9Repositories.approvalRequests.findById(
      parsedInput.params.data.approvalRequestId
    );

    if (!approvalRequest || approvalRequest.organizationId !== access.organization.id) {
      throw new NotFoundException("approval request not found");
    }

    if (approvalRequest.status !== "PENDING") {
      throw new ConflictException("approval request is not pending");
    }

    const approvalRequestStep =
      await this.release9Repositories.approvalRequestSteps.findById(
        parsedInput.params.data.approvalStepId
      );

    if (
      !approvalRequestStep ||
      approvalRequestStep.approvalRequestId !== approvalRequest.id
    ) {
      throw new NotFoundException("approval step not found");
    }

    if (
      !hasMinimumOrganizationRole(
        access.membership.role,
        approvalRequestStep.requiredRole
      )
    ) {
      throw new ForbiddenException("insufficient role to decide this approval step");
    }

    const currentSteps =
      await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
        approvalRequest.id
      );
    const nextPendingStep =
      [...currentSteps]
        .sort((left, right) => left.position - right.position)
        .find((step) => step.status === "PENDING") ?? null;

    if (!nextPendingStep || nextPendingStep.id !== approvalRequestStep.id) {
      throw new ConflictException("approval step is not actionable");
    }

    const now = new Date().toISOString();
    const updatedStep = await this.release9Repositories.approvalRequestSteps.update(
      approvalRequestStep.id,
      {
        decidedAt: now,
        decidedByUserId: access.actor.user.id,
        note: parsedInput.body.data.note ?? null,
        status:
          parsedInput.body.data.decision === "APPROVED" ? "APPROVED" : "REJECTED"
      }
    );
    const updatedSteps = currentSteps.map((step) =>
      step.id === updatedStep.id ? updatedStep : step
    );
    const updatedRequest =
      parsedInput.body.data.decision === "REJECTED"
        ? await this.release9Repositories.approvalRequests.update(approvalRequest.id, {
            decidedAt: now,
            status: "REJECTED"
          })
        : updatedSteps.every((step) => step.status === "APPROVED")
          ? await this.release9Repositories.approvalRequests.update(approvalRequest.id, {
              decidedAt: now,
              status: "APPROVED"
            })
          : approvalRequest;

    await this.release1Repositories.auditLogs.append({
      action: "APPROVAL_STEP_DECIDED",
      actorUserId: access.actor.user.id,
      entityId: updatedStep.id,
      entityType: "APPROVAL_REQUEST_STEP",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        approvalRequestId: approvalRequest.id,
        decision: parsedInput.body.data.decision
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    return {
      approvalRequest: toApprovalRequestSummary(updatedRequest, updatedSteps),
      step: toApprovalRequestSummary(updatedRequest, updatedSteps).steps.find(
        (step) => step.id === updatedStep.id
      )!
    };
  }

  async listStatementSnapshots(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListStatementSnapshotsResponse> {
    const parsed = listStatementSnapshotsParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireDealVersionAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );
    const snapshots =
      await this.release9Repositories.statementSnapshots.listByDealVersionId(
        parsed.data.dealVersionId
      );

    return {
      snapshots: snapshots.map(toStatementSnapshotSummary)
    };
  }

  async listOrganizationStatementSnapshots(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListStatementSnapshotsResponse> {
    const parsed = listOrganizationStatementSnapshotsParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const snapshots =
      await this.release9Repositories.statementSnapshots.listByOrganizationId(
        parsed.data.organizationId
      );

    return {
      snapshots: snapshots
        .filter((record) => {
          if (parsed.data.costCenterId && record.costCenterId !== parsed.data.costCenterId) {
            return false;
          }
          if (parsed.data.dealVersionId && record.dealVersionId !== parsed.data.dealVersionId) {
            return false;
          }
          if (parsed.data.draftDealId && record.draftDealId !== parsed.data.draftDealId) {
            return false;
          }
          return true;
        })
        .map(toStatementSnapshotSummary)
    };
  }

  async createStatementSnapshot(
    input: unknown,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateStatementSnapshotResponse> {
    const parsedInput = listStatementSnapshotsParamsSchema.safeParse(input);
    const parsedBody = createStatementSnapshotSchema.safeParse(body);

    if (!parsedInput.success) {
      throw new BadRequestException(parsedInput.error.flatten());
    }

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    const access = await this.requireDealVersionAccess(
      parsedInput.data.organizationId,
      parsedInput.data.draftDealId,
      parsedInput.data.dealVersionId,
      requestMetadata,
      "ADMIN"
    );
    const milestones = await this.release1Repositories.dealVersionMilestones.listByDealVersionId(
      access.version.id
    );
    const totalAmountMinor = milestones
      .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
      .toString();
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "STATEMENT_SNAPSHOT_CREATE",
      costCenterId: access.draft.costCenterId ?? null,
      dealVersionId: access.version.id,
      dealVersionMilestoneId: null,
      draftDealId: access.draft.id,
      input: parsedBody.data as JsonObject,
      organizationId: access.organization.id,
      settlementCurrency: access.version.settlementCurrency,
      subjectId: access.version.id,
      subjectLabel: access.version.title,
      subjectMetadata: null,
      subjectSnapshot: {
        costCenterId: access.draft.costCenterId ?? null,
        draftDealId: access.draft.id,
        versionId: access.version.id
      } as JsonObject,
      subjectType: "DEAL_VERSION",
      title: access.version.title,
      totalAmountMinor
    });
    const [approvalRequests, settlementStatement] = await Promise.all([
      this.release9Repositories.approvalRequests.listByDealVersionId(access.version.id),
      this.milestonesService.getSettlementStatement(parsedInput.data, requestMetadata)
    ]);
    const approvalRequest =
      approvalRequests.find((record) => record.kind === "FUNDING_TRANSACTION_CREATE") ?? null;
    const now = new Date().toISOString();
    const snapshot = await this.release9Repositories.statementSnapshots.create({
      approvalRequestId: approvalRequest?.id ?? null,
      asOf: now,
      costCenterId: access.draft.costCenterId ?? null,
      createdAt: now,
      createdByUserId: access.actor.user.id,
      dealVersionId: access.version.id,
      draftDealId: access.draft.id,
      id: randomUUID(),
      kind: parsedBody.data.kind,
      note: parsedBody.data.note ?? null,
      organizationId: access.organization.id,
      payload: {
        milestones: settlementStatement.milestones,
        statement: settlementStatement.statement
      } as unknown as JsonObject
    });

    await this.release1Repositories.auditLogs.append({
      action: "STATEMENT_SNAPSHOT_CREATED",
      actorUserId: access.actor.user.id,
      entityId: snapshot.id,
      entityType: "STATEMENT_SNAPSHOT",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        approvalRequestId: snapshot.approvalRequestId,
        kind: snapshot.kind
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    return {
      snapshot: toStatementSnapshotSummary(snapshot)
    };
  }

  async getReportingDashboard(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ReportingDashboardResponse> {
    const parsed = reportsDashboardParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const [
      approvalRequests,
      settlementTransactions,
      statementSnapshots,
      exportJobs
    ] = await Promise.all([
      this.release9Repositories.approvalRequests.listByOrganizationId(
        parsed.data.organizationId
      ),
      this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
        84532
      ),
      this.release9Repositories.statementSnapshots.listByOrganizationId(
        parsed.data.organizationId
      ),
      this.release9Repositories.financeExportJobs.listByOrganizationId(
        parsed.data.organizationId
      )
    ]);
    const orgFundingTransactions = (
      await Promise.all(
        (
          await this.release1Repositories.draftDeals.listByOrganizationId(
            parsed.data.organizationId
          )
        ).map((draft) =>
          this.release1Repositories.fundingTransactions.listByDraftDealId(draft.id)
        )
      )
    ).flat();
    const orgSettlementTransactions = settlementTransactions.filter(
      (record) => record.organizationId === parsed.data.organizationId
    );
    const recentApprovalRequests = (
      await Promise.all(
        approvalRequests.slice(0, 10).map(async (record) =>
          toApprovalRequestSummary(
            record,
            await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
              record.id
            )
          )
        )
      )
    ).slice(0, 5);
    const recentFinanceExports = await Promise.all(
      exportJobs.slice(0, 5).map(async (job) => this.toFinanceExportJobSummary(job))
    );

    return {
      dashboard: {
        approvedApprovalRequestCount: approvalRequests.filter(
          (record) => record.status === "APPROVED"
        ).length,
        blockedApprovalRequestCount: approvalRequests.filter(
          (record) => record.status === "REJECTED"
        ).length,
        completedFinanceExportCount: exportJobs.filter(
          (record) => record.status === "COMPLETED"
        ).length,
        failedFinanceExportCount: exportJobs.filter(
          (record) => record.status === "FAILED"
        ).length,
        fundingTransactionCount: orgFundingTransactions.length,
        pendingApprovalRequestCount: approvalRequests.filter(
          (record) => record.status === "PENDING"
        ).length,
        pendingFinanceExportCount: exportJobs.filter(
          (record) => record.status === "PENDING" || record.status === "PROCESSING"
        ).length,
        refundedAmountMinor: "0",
        releasedAmountMinor: "0",
        settlementExecutionTransactionCount: orgSettlementTransactions.length,
        statementSnapshotCount: statementSnapshots.length
      },
      recentApprovalRequests,
      recentFinanceExports,
      recentStatementSnapshots: statementSnapshots
        .slice(0, 5)
        .map(toStatementSnapshotSummary)
    };
  }

  async listFinanceExports(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListFinanceExportsResponse> {
    const parsed = listFinanceExportsParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const exportJobs =
      await this.release9Repositories.financeExportJobs.listByOrganizationId(
        parsed.data.organizationId
      );

    return {
      exportJobs: await Promise.all(
        exportJobs
          .filter((record) => !parsed.data.status || record.status === parsed.data.status)
          .map((record) => this.toFinanceExportJobSummary(record))
      )
    };
  }

  async createFinanceExport(
    organizationId: string,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateFinanceExportResponse> {
    const parsed = createFinanceExportSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const access = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    await this.approvalRuntimeService.assertMutationApproved({
      actionKind: "FINANCE_EXPORT_CREATE",
      costCenterId: parsed.data.costCenterId ?? null,
      dealVersionId: parsed.data.dealVersionId ?? null,
      dealVersionMilestoneId: null,
      draftDealId: parsed.data.draftDealId ?? null,
      input: parsed.data as JsonObject,
      organizationId,
      settlementCurrency: null,
      subjectId: this.approvalRuntimeService.buildSubjectId({
        actionKind: "FINANCE_EXPORT_CREATE",
        organizationId,
        subjectType: "FINANCE_EXPORT_JOB",
        value: parsed.data
      }),
      subjectLabel: "Finance export",
      subjectMetadata: null,
      subjectSnapshot: {
        organizationId
      } as JsonObject,
      subjectType: "FINANCE_EXPORT_JOB",
      title: "Finance export",
      totalAmountMinor: null
    });
    const now = new Date().toISOString();
    const exportJob = await this.release9Repositories.financeExportJobs.create({
      createdAt: now,
      createdByUserId: access.actor.user.id,
      errorMessage: null,
      failedAt: null,
      filters: parsed.data as unknown as JsonObject,
      finishedAt: null,
      id: randomUUID(),
      organizationId,
      startedAt: null,
      status: "PENDING"
    });

    await this.release1Repositories.auditLogs.append({
      action: "FINANCE_EXPORT_CREATED",
      actorUserId: access.actor.user.id,
      entityId: exportJob.id,
      entityType: "FINANCE_EXPORT_JOB",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: exportJob.filters,
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      exportJob: await this.toFinanceExportJobSummary(exportJob)
    };
  }

  async getFinanceExportJob(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<FinanceExportJobDetailResponse> {
    const parsed = financeExportJobParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const exportJob = await this.release9Repositories.financeExportJobs.findById(
      parsed.data.exportJobId
    );

    if (!exportJob || exportJob.organizationId !== parsed.data.organizationId) {
      throw new NotFoundException("finance export job not found");
    }

    const artifacts =
      await this.release9Repositories.financeExportArtifacts.listByFinanceExportJobId(
        exportJob.id
      );

    return {
      exportJob: {
        ...(await this.toFinanceExportJobSummary(exportJob)),
        artifacts: artifacts.map((artifact) => ({
          body: artifact.body,
          createdAt: artifact.createdAt,
          filename: artifact.filename,
          format: artifact.format,
          id: artifact.id,
          mediaType: artifact.mediaType,
          sizeBytes: artifact.sizeBytes
        })),
        errorMessage: exportJob.errorMessage,
        finishedAt: exportJob.finishedAt
      }
    };
  }

  async buildApprovalRequirement(
    draft: DraftDealRecord,
    version: DealVersionRecord
  ): Promise<ApprovalRequirementSummary> {
    const runtimeContext = await this.buildFundingApprovalRuntimeContext({
      draft,
      version
    });
    return (await this.approvalRuntimeService.evaluateRequirement(runtimeContext)).approval;
  }

  private toRuntimeContext(
    organizationId: string,
    input: {
      actionKind: string;
      costCenterId?: string | undefined;
      dealMilestoneDisputeId?: string | undefined;
      dealVersionId?: string | undefined;
      dealVersionMilestoneId?: string | undefined;
      draftDealId?: string | undefined;
      input?: Record<string, unknown> | undefined;
      settlementCurrency?: "USDC" | undefined;
      subjectId?: string | undefined;
      subjectLabel?: string | undefined;
      subjectType: string;
      title?: string | undefined;
      totalAmountMinor?: string | undefined;
    }
  ): ApprovalRuntimeContext {
    const subjectId =
      input.subjectId ??
      this.approvalRuntimeService.buildSubjectId({
        actionKind: input.actionKind as ApprovalRuntimeContext["actionKind"],
        organizationId,
        subjectType: input.subjectType as ApprovalRuntimeContext["subjectType"],
        value: {
          dealMilestoneDisputeId: input.dealMilestoneDisputeId ?? null,
          dealVersionId: input.dealVersionId ?? null,
          dealVersionMilestoneId: input.dealVersionMilestoneId ?? null,
          draftDealId: input.draftDealId ?? null,
          input: input.input ?? null
        }
      });

    return {
      actionKind: input.actionKind as ApprovalRuntimeContext["actionKind"],
      costCenterId: input.costCenterId ?? null,
      dealMilestoneDisputeId: input.dealMilestoneDisputeId ?? null,
      dealVersionId: input.dealVersionId ?? null,
      dealVersionMilestoneId: input.dealVersionMilestoneId ?? null,
      draftDealId: input.draftDealId ?? null,
      input: (input.input ?? null) as JsonObject | null,
      organizationId,
      settlementCurrency: input.settlementCurrency ?? null,
      subjectId,
      subjectLabel: input.subjectLabel ?? null,
      subjectMetadata: {
        dealMilestoneDisputeId: input.dealMilestoneDisputeId ?? null
      } as JsonObject,
      subjectSnapshot: {
        costCenterId: input.costCenterId ?? null,
        dealVersionId: input.dealVersionId ?? null,
        dealVersionMilestoneId: input.dealVersionMilestoneId ?? null,
        draftDealId: input.draftDealId ?? null
      } as JsonObject,
      subjectType: input.subjectType as ApprovalRuntimeContext["subjectType"],
      title: input.title ?? input.subjectLabel ?? input.actionKind,
      totalAmountMinor: input.totalAmountMinor ?? null
    };
  }

  private async buildFundingApprovalRuntimeContext(input: {
    draft: DraftDealRecord;
    version: DealVersionRecord;
  }): Promise<ApprovalRuntimeContext> {
    const milestones = await this.release1Repositories.dealVersionMilestones.listByDealVersionId(
      input.version.id
    );
    const totalAmountMinor = milestones
      .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
      .toString();

    return {
      actionKind: "FUNDING_TRANSACTION_CREATE",
      costCenterId: input.draft.costCenterId ?? null,
      dealVersionId: input.version.id,
      dealVersionMilestoneId: null,
      draftDealId: input.draft.id,
      input: null,
      organizationId: input.version.organizationId,
      settlementCurrency: input.version.settlementCurrency,
      subjectId: input.version.id,
      subjectLabel: input.version.title,
      subjectMetadata: {
        versionNumber: input.version.versionNumber
      } as JsonObject,
      subjectSnapshot: {
        costCenterId: input.draft.costCenterId ?? null,
        settlementCurrency: input.version.settlementCurrency,
        versionId: input.version.id,
        versionNumber: input.version.versionNumber
      } as JsonObject,
      subjectType: "DEAL_VERSION",
      title: input.version.title,
      totalAmountMinor
    };
  }

  private async createApprovalRequestFromRuntimeContext(
    runtimeContext: ApprovalRuntimeContext,
    note: string | null,
    requestedByUserId: string,
    requestMetadata: RequestMetadata
  ) {
    const evaluation = await this.approvalRuntimeService.evaluateRequirement(runtimeContext);

    if (!evaluation.applicablePolicy) {
      throw new ConflictException("no applicable approval policy is configured");
    }

    if (evaluation.currentRequest) {
      throw new ConflictException("approval request already exists for this mutation");
    }

    const policySteps =
      await this.release9Repositories.approvalPolicySteps.listByApprovalPolicyId(
        evaluation.applicablePolicy.id
      );

    if (policySteps.length === 0) {
      throw new ConflictException("approval policy has no steps");
    }

    const now = new Date().toISOString();
    const approvalRequest = await this.release9Repositories.approvalRequests.create({
      approvalPolicyId: evaluation.applicablePolicy.id,
      costCenterId: runtimeContext.costCenterId,
      decidedAt: null,
      dealVersionId: runtimeContext.dealVersionId,
      dealVersionMilestoneId: runtimeContext.dealVersionMilestoneId,
      draftDealId: runtimeContext.draftDealId,
      id: randomUUID(),
      kind: runtimeContext.actionKind,
      metadata: runtimeContext.subjectMetadata,
      note,
      organizationId: runtimeContext.organizationId,
      requestedAt: now,
      requestedByUserId,
      settlementCurrency: runtimeContext.settlementCurrency,
      status: "PENDING",
      subjectFingerprint: evaluation.subjectFingerprint,
      subjectId: runtimeContext.subjectId,
      subjectLabel: runtimeContext.subjectLabel,
      subjectType: runtimeContext.subjectType,
      title: runtimeContext.title,
      totalAmountMinor: runtimeContext.totalAmountMinor
    });
    const approvalRequestSteps = await Promise.all(
      policySteps.map((step) =>
        this.release9Repositories.approvalRequestSteps.create({
          approvalRequestId: approvalRequest.id,
          decidedAt: null,
          decidedByUserId: null,
          id: randomUUID(),
          label: step.label,
          note: null,
          position: step.position,
          requiredRole: step.requiredRole,
          status: "PENDING"
        })
      )
    );

    await this.release1Repositories.auditLogs.append({
      action: "APPROVAL_REQUEST_CREATED",
      actorUserId: requestedByUserId,
      entityId: approvalRequest.id,
      entityType: "APPROVAL_REQUEST",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        actionKind: approvalRequest.kind,
        approvalPolicyId: approvalRequest.approvalPolicyId,
        subjectFingerprint: approvalRequest.subjectFingerprint,
        subjectId: approvalRequest.subjectId,
        subjectType: approvalRequest.subjectType
      },
      occurredAt: now,
      organizationId: approvalRequest.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return toApprovalRequestSummary(approvalRequest, approvalRequestSteps);
  }

  private async toFinanceExportJobSummary(record: {
    createdAt: string;
    createdByUserId: string;
    failedAt: string | null;
    filters: JsonObject;
    id: string;
    organizationId: string;
    startedAt: string | null;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  }) {
    const artifacts =
      await this.release9Repositories.financeExportArtifacts.listByFinanceExportJobId(
        record.id
      );
    return {
      ...toFinanceExportJobSummary(record),
      readyArtifactCount: artifacts.length
    };
  }

  private async requireCostCenterInOrganization(
    organizationId: string,
    costCenterId: string
  ): Promise<CostCenterRecord> {
    const costCenter = await this.release9Repositories.costCenters.findById(costCenterId);

    if (!costCenter || costCenter.organizationId !== organizationId) {
      throw new NotFoundException("cost center not found");
    }

    if (costCenter.status !== "ACTIVE") {
      throw new ConflictException("cost center is not active");
    }

    return costCenter;
  }

  private async requireDraftAccess(
    organizationId: string,
    draftDealId: string,
    requestMetadata: RequestMetadata,
    minimumRole: OrganizationMemberRecord["role"] = "MEMBER"
  ): Promise<OrganizationAccessContext & { draft: DraftDealRecord }> {
    const access = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      minimumRole
    );
    const draft = await this.release1Repositories.draftDeals.findById(draftDealId);

    if (!draft || draft.organizationId !== organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    return {
      ...access,
      draft
    };
  }

  private async requireDealVersionAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    requestMetadata: RequestMetadata,
    minimumRole: OrganizationMemberRecord["role"] = "MEMBER"
  ): Promise<DealVersionAccessContext> {
    const draftAccess = await this.requireDraftAccess(
      organizationId,
      draftDealId,
      requestMetadata,
      minimumRole
    );
    const version = await this.release1Repositories.dealVersions.findById(dealVersionId);

    if (!version || version.draftDealId !== draftAccess.draft.id) {
      throw new NotFoundException("deal version not found");
    }

    return {
      ...draftAccess,
      version
    };
  }

  private async requireOrganizationAccess(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole: OrganizationMemberRecord["role"] = "MEMBER"
  ): Promise<OrganizationAccessContext> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    return this.authorizeOrganizationActor(actor, organizationId, minimumRole);
  }

  async authorizeOrganizationActor(
    actor: AuthenticatedSessionContext,
    organizationId: string,
    minimumRole: OrganizationMemberRecord["role"] = "MEMBER"
  ): Promise<OrganizationAccessContext> {
    const [organization, membership] = await Promise.all([
      this.release1Repositories.organizations.findById(organizationId),
      this.release1Repositories.organizationMembers.findMembership(
        organizationId,
        actor.user.id
      )
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (!membership) {
      throw new ForbiddenException("organization membership is required");
    }

    if (!hasMinimumOrganizationRole(membership.role, minimumRole)) {
      throw new ForbiddenException("insufficient organization role");
    }

    return {
      actor,
      membership,
      organization
    };
  }
}
