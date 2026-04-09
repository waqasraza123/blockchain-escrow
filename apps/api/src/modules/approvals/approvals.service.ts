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
  approvalRequestStepDecisionParamsSchema,
  createApprovalPolicySchema,
  createApprovalRequestSchema,
  createCostCenterSchema,
  createStatementSnapshotSchema,
  dealVersionApprovalRequestParamsSchema,
  decideApprovalStepSchema,
  draftDealParamsSchema,
  listStatementSnapshotsParamsSchema,
  organizationCostCenterParamsSchema,
  updateDraftCostCenterSchema,
  type ApprovalRequirementSummary,
  type CreateApprovalPolicyResponse,
  type CreateApprovalRequestResponse,
  type CreateCostCenterResponse,
  type CreateStatementSnapshotResponse,
  type DecideApprovalStepResponse,
  type GetCurrentApprovalRequestResponse,
  type JsonObject,
  type ListApprovalPoliciesResponse,
  type ListCostCentersResponse,
  type ListStatementSnapshotsResponse,
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
  buildApprovalRequestRecord,
  buildApprovalRequirementSummary,
  selectApplicableApprovalPolicy,
  toApprovalPolicySummary,
  toApprovalRequestSummary
} from "./approval-evaluation";

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

@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE9_REPOSITORIES)
    private readonly release9Repositories: Release9Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
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
    const latestVersion =
      await this.release1Repositories.dealVersions.findLatestByDraftDealId(access.draft.id);

    if (!latestVersion || latestVersion.id !== access.version.id) {
      throw new ConflictException("approval requests can only be created for the latest version");
    }

    const existing =
      await this.release9Repositories.approvalRequests.findByDealVersionIdAndKind(
        access.version.id,
        parsedBody.data.kind
      );

    if (existing) {
      throw new ConflictException("approval request already exists for this version");
    }

    const activePolicies =
      await this.release9Repositories.approvalPolicies.listActiveByOrganizationId(
        access.organization.id
      );
    const applicablePolicy = selectApplicableApprovalPolicy(
      activePolicies,
      access.draft,
      access.version
    );

    if (!applicablePolicy || applicablePolicy.kind !== parsedBody.data.kind) {
      throw new ConflictException("no applicable approval policy is configured");
    }

    const [policySteps, milestones] = await Promise.all([
      this.release9Repositories.approvalPolicySteps.listByApprovalPolicyId(
        applicablePolicy.id
      ),
      this.release1Repositories.dealVersionMilestones.listByDealVersionId(access.version.id)
    ]);

    if (policySteps.length === 0) {
      throw new ConflictException("approval policy has no steps");
    }

    const now = new Date().toISOString();
    const approvalRequest = await this.release9Repositories.approvalRequests.create(
      buildApprovalRequestRecord({
        approvalPolicy: applicablePolicy,
        draft: access.draft,
        milestones,
        now,
        note: parsedBody.data.note ?? null,
        requestedByUserId: access.actor.user.id,
        requestId: randomUUID(),
        version: access.version
      })
    );
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
      actorUserId: access.actor.user.id,
      entityId: approvalRequest.id,
      entityType: "APPROVAL_REQUEST",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        approvalPolicyId: approvalRequest.approvalPolicyId,
        kind: approvalRequest.kind,
        totalAmountMinor: approvalRequest.totalAmountMinor
      },
      occurredAt: now,
      organizationId: access.organization.id,
      userAgent: requestMetadata.userAgent
    });

    return {
      approvalRequest: toApprovalRequestSummary(
        approvalRequest,
        approvalRequestSteps
      )
    };
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
    const [approvalRequest, settlementStatement] = await Promise.all([
      this.release9Repositories.approvalRequests.findByDealVersionIdAndKind(
        access.version.id,
        "DEAL_FUNDING"
      ),
      this.milestonesService.getSettlementStatement(parsedInput.data, requestMetadata)
    ]);
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

  async buildApprovalRequirement(
    draft: DraftDealRecord,
    version: DealVersionRecord
  ): Promise<ApprovalRequirementSummary> {
    const activePolicies =
      await this.release9Repositories.approvalPolicies.listActiveByOrganizationId(
        version.organizationId
      );
    const applicablePolicy = selectApplicableApprovalPolicy(activePolicies, draft, version);
    const [applicablePolicySteps, currentRequest] = await Promise.all([
      applicablePolicy
        ? this.release9Repositories.approvalPolicySteps.listByApprovalPolicyId(
            applicablePolicy.id
          )
        : Promise.resolve([]),
      applicablePolicy
        ? this.release9Repositories.approvalRequests.findByDealVersionIdAndKind(
            version.id,
            applicablePolicy.kind
          )
        : Promise.resolve(null)
    ]);
    const currentRequestSteps = currentRequest
      ? await this.release9Repositories.approvalRequestSteps.listByApprovalRequestId(
          currentRequest.id
        )
      : [];

    return buildApprovalRequirementSummary({
      applicablePolicy,
      applicablePolicySteps,
      currentRequest,
      currentRequestSteps
    });
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
