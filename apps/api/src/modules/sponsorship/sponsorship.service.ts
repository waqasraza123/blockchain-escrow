import { randomUUID } from "node:crypto";

import type {
  GasPolicyRecord,
  Release1Repositories,
  Release12Repositories,
  SponsoredTransactionRequestRecord
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createGasPolicySchema,
  createSponsoredFundingRequestSchema,
  createSponsoredSettlementExecutionRequestSchema,
  gasPolicyIdParamsSchema,
  type CreateGasPolicyResponse,
  type CreateSponsoredTransactionRequestResponse,
  type GasPolicySummary,
  type ListGasPoliciesResponse,
  type ListSponsoredTransactionRequestsResponse,
  type SponsoredTransactionKind,
  type SponsoredTransactionRequestSummary,
  type UpdateGasPolicyResponse,
  updateGasPolicySchema
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
  RELEASE12_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";
import { FundingService } from "../funding/funding.service";
import { MilestonesService } from "../milestones/milestones.service";
import { buildSettlementExecutionPreparedTransaction } from "../milestones/settlement-execution-transaction";

function parseInput<T>(
  schema: {
    safeParse(input: unknown):
      | { success: true; data: T }
      | { success: false; error: { flatten(): unknown } };
  },
  input: unknown
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten());
  }

  return parsed.data;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutes(timestamp: string, minutes: number): string {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function toGasPolicySummary(record: GasPolicyRecord): GasPolicySummary {
  return record;
}

function serializeGasPolicy(record: GasPolicyRecord) {
  return {
    active: record.active,
    allowedApprovalPolicyKinds: record.allowedApprovalPolicyKinds,
    allowedChainIds: record.allowedChainIds,
    allowedTransactionKinds: record.allowedTransactionKinds,
    description: record.description,
    maxAmountMinor: record.maxAmountMinor,
    maxRequestsPerDay: record.maxRequestsPerDay,
    name: record.name,
    sponsorWindowMinutes: record.sponsorWindowMinutes
  };
}

function toSponsoredTransactionRequestSummary(
  record: SponsoredTransactionRequestRecord,
  evaluatedAt: string
): SponsoredTransactionRequestSummary {
  if (
    record.status === "APPROVED" &&
    record.submittedAt === null &&
    new Date(record.expiresAt).getTime() <= new Date(evaluatedAt).getTime()
  ) {
    return {
      ...record,
      status: "EXPIRED"
    } as SponsoredTransactionRequestSummary;
  }

  return record as SponsoredTransactionRequestSummary;
}

@Injectable()
export class SponsorshipService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE12_REPOSITORIES)
    private readonly release12Repositories: Release12Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    private readonly fundingService: FundingService,
    private readonly milestonesService: MilestonesService
  ) {}

  async listGasPolicies(
    organizationId: string,
    requestMetadata: RequestMetadata
  ): Promise<ListGasPoliciesResponse> {
    await this.requireOrganizationMembership(organizationId, requestMetadata, "MEMBER");
    const gasPolicies =
      await this.release12Repositories.gasPolicies.listByOrganizationId(organizationId);

    return {
      gasPolicies: gasPolicies.map(toGasPolicySummary)
    };
  }

  async createGasPolicy(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateGasPolicyResponse> {
    const body = parseInput(createGasPolicySchema, input);
    const actor = await this.requireOrganizationMembership(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const now = nowIso();

    const gasPolicy = await this.release12Repositories.gasPolicies.create({
      active: body.active ?? true,
      allowedApprovalPolicyKinds: body.allowedApprovalPolicyKinds ?? [],
      allowedChainIds: body.allowedChainIds,
      allowedTransactionKinds: body.allowedTransactionKinds,
      createdAt: now,
      createdByUserId: actor.user.id,
      description: body.description ?? null,
      id: randomUUID(),
      maxAmountMinor: body.maxAmountMinor ?? null,
      maxRequestsPerDay: body.maxRequestsPerDay,
      name: body.name,
      organizationId,
      sponsorWindowMinutes: body.sponsorWindowMinutes,
      updatedAt: now
    });
    await this.release1Repositories.auditLogs.append({
      action: "GAS_POLICY_CREATED",
      actorUserId: actor.user.id,
      entityId: gasPolicy.id,
      entityType: "GAS_POLICY",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: serializeGasPolicy(gasPolicy),
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      gasPolicy: toGasPolicySummary(gasPolicy)
    };
  }

  async updateGasPolicy(
    params: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdateGasPolicyResponse> {
    const parsedParams = parseInput(gasPolicyIdParamsSchema, params);
    const body = parseInput(updateGasPolicySchema, input);

    const actor = await this.requireOrganizationMembership(
      parsedParams.organizationId,
      requestMetadata,
      "ADMIN"
    );

    const gasPolicy =
      await this.release12Repositories.gasPolicies.findById(parsedParams.gasPolicyId);

    if (!gasPolicy || gasPolicy.organizationId !== parsedParams.organizationId) {
      throw new NotFoundException("gas policy not found");
    }

    const previousPolicy = { ...gasPolicy };
    const updated = await this.release12Repositories.gasPolicies.update(gasPolicy.id, {
      ...(body.active === undefined ? {} : { active: body.active }),
      ...(body.allowedApprovalPolicyKinds === undefined
        ? {}
        : { allowedApprovalPolicyKinds: body.allowedApprovalPolicyKinds }),
      ...(body.allowedChainIds === undefined ? {} : { allowedChainIds: body.allowedChainIds }),
      ...(body.allowedTransactionKinds === undefined
        ? {}
        : { allowedTransactionKinds: body.allowedTransactionKinds }),
      ...(body.description === undefined ? {} : { description: body.description ?? null }),
      ...(body.maxAmountMinor === undefined
        ? {}
        : { maxAmountMinor: body.maxAmountMinor ?? null }),
      ...(body.maxRequestsPerDay === undefined
        ? {}
        : { maxRequestsPerDay: body.maxRequestsPerDay }),
      ...(body.name === undefined ? {} : { name: body.name }),
      ...(body.sponsorWindowMinutes === undefined
        ? {}
        : { sponsorWindowMinutes: body.sponsorWindowMinutes }),
      updatedAt: nowIso()
    });
    await this.release1Repositories.auditLogs.append({
      action: "GAS_POLICY_UPDATED",
      actorUserId: actor.user.id,
      entityId: updated.id,
      entityType: "GAS_POLICY",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        nextPolicy: serializeGasPolicy(updated),
        previousPolicy: serializeGasPolicy(previousPolicy)
      },
      occurredAt: updated.updatedAt,
      organizationId: parsedParams.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      gasPolicy: toGasPolicySummary(updated)
    };
  }

  async listSponsoredTransactionRequests(
    organizationId: string,
    requestMetadata: RequestMetadata
  ): Promise<ListSponsoredTransactionRequestsResponse> {
    await this.requireOrganizationMembership(organizationId, requestMetadata, "MEMBER");
    const evaluatedAt = nowIso();
    const requests =
      await this.release12Repositories.sponsoredTransactionRequests.listByOrganizationId(
        organizationId
      );

    return {
      sponsoredTransactionRequests: requests.map((record) =>
        toSponsoredTransactionRequestSummary(record, evaluatedAt)
      )
    };
  }

  async createSponsoredFundingRequest(
    params: {
      dealVersionId: string;
      draftDealId: string;
      organizationId: string;
    },
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateSponsoredTransactionRequestResponse> {
    const body = parseInput(createSponsoredFundingRequestSchema, input);
    const actor = await this.requireOrganizationMembership(
      params.organizationId,
      requestMetadata,
      "MEMBER"
    );
    const preparation = await this.fundingService.getFundingPreparation(params, requestMetadata);
    const transaction = preparation.preparation.createAgreementTransaction;

    if (!preparation.preparation.ready || !transaction) {
      throw new ConflictException("funding preparation is not ready for sponsorship");
    }

    return this.createSponsoredRequestFromPolicy({
      actionKind: "FUNDING_TRANSACTION_CREATE",
      amountMinor: preparation.preparation.totalAmountMinor,
      chainId: preparation.preparation.chainId,
      data: transaction.data,
      gasPolicyId: body.gasPolicyId,
      kind: "FUNDING_TRANSACTION_CREATE",
      organizationId: params.organizationId,
      requestMetadata,
      subjectId: params.dealVersionId,
      subjectType: "DEAL_VERSION",
      toAddress: transaction.to,
      value: transaction.value,
      walletId: actor.wallet.id,
      walletAddress: actor.wallet.address,
      draftDealId: params.draftDealId,
      dealVersionId: params.dealVersionId,
      dealMilestoneSettlementRequestId: null,
      requestedByUserId: actor.user.id
    });
  }

  async createSponsoredSettlementExecutionRequest(
    params: {
      dealMilestoneSettlementRequestId: string;
      dealVersionId: string;
      draftDealId: string;
      organizationId: string;
    },
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateSponsoredTransactionRequestResponse> {
    const body = parseInput(createSponsoredSettlementExecutionRequestSchema, input);
    const actor = await this.requireOrganizationMembership(
      params.organizationId,
      requestMetadata,
      "ADMIN"
    );
    const plan = await this.milestonesService.getMilestoneSettlementExecutionPlan(
      params,
      requestMetadata
    );

    if (!plan.plan.ready || !plan.plan.executionPreparation || !plan.plan.agreementAddress) {
      throw new ConflictException("settlement execution is not ready for sponsorship");
    }

    const executionTransaction = buildSettlementExecutionPreparedTransaction({
      agreementAddress: plan.plan.agreementAddress,
      kind: plan.plan.executionPreparation.kind,
      milestoneAmountMinor: plan.plan.executionPreparation.milestoneAmountMinor,
      milestonePosition: plan.plan.executionPreparation.milestonePosition
    });

    return this.createSponsoredRequestFromPolicy({
      actionKind: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE",
      amountMinor: plan.plan.executionPreparation.milestoneAmountMinor,
      chainId: plan.plan.chainId,
      data: executionTransaction.transaction.data,
      gasPolicyId: body.gasPolicyId,
      kind: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE",
      organizationId: params.organizationId,
      requestMetadata,
      subjectId: params.dealMilestoneSettlementRequestId,
      subjectType: "DEAL_MILESTONE_SETTLEMENT_REQUEST",
      toAddress: executionTransaction.transaction.to,
      value: executionTransaction.transaction.value,
      walletId: actor.wallet.id,
      walletAddress: actor.wallet.address,
      draftDealId: params.draftDealId,
      dealVersionId: params.dealVersionId,
      dealMilestoneSettlementRequestId: params.dealMilestoneSettlementRequestId,
      requestedByUserId: actor.user.id
    });
  }

  private async createSponsoredRequestFromPolicy(input: {
    actionKind: string;
    amountMinor: string;
    chainId: number;
    data: `0x${string}`;
    dealMilestoneSettlementRequestId: string | null;
    dealVersionId: string | null;
    draftDealId: string | null;
    gasPolicyId: string | undefined;
    kind: SponsoredTransactionKind;
    organizationId: string;
    requestMetadata: RequestMetadata;
    requestedByUserId: string;
    subjectId: string;
    subjectType: "DEAL_VERSION" | "DEAL_MILESTONE_SETTLEMENT_REQUEST";
    toAddress: `0x${string}`;
    value: string;
    walletAddress: `0x${string}`;
    walletId: string;
  }): Promise<CreateSponsoredTransactionRequestResponse> {
    const now = nowIso();
    const gasPolicy = await this.resolveGasPolicy(
      input.organizationId,
      input.walletId,
      input.gasPolicyId
    );
    const existingApprovedRequest =
      await this.release12Repositories.sponsoredTransactionRequests.findLatestApprovedBySubjectAndWallet(
        {
          kind: input.kind,
          subjectId: input.subjectId,
          walletId: input.walletId
        }
      );

    if (existingApprovedRequest) {
      throw new ConflictException(
        "a sponsored transaction request is already approved and awaiting submission"
      );
    }

    if (!gasPolicy) {
      throw new ConflictException("no active gas policy is available");
    }

    const evaluation = await this.evaluateGasPolicy(gasPolicy, {
      actionKind: input.actionKind,
      amountMinor: input.amountMinor,
      chainId: input.chainId,
      kind: input.kind,
      organizationId: input.organizationId
    });
    const approved = evaluation.reason === null;

    const request =
      await this.release12Repositories.sponsoredTransactionRequests.create({
        amountMinor: input.amountMinor,
        approvedAt: approved ? now : null,
        chainId: input.chainId,
        createdAt: now,
        data: input.data,
        dealMilestoneSettlementRequestId: input.dealMilestoneSettlementRequestId,
        dealVersionId: input.dealVersionId,
        draftDealId: input.draftDealId,
        expiresAt: addMinutes(now, gasPolicy.sponsorWindowMinutes),
        gasPolicyId: gasPolicy.id,
        id: randomUUID(),
        kind: input.kind,
        organizationId: input.organizationId,
        reason: evaluation.reason,
        requestedByUserId: input.requestedByUserId,
        rejectedAt: approved ? null : now,
        status: approved ? "APPROVED" : "REJECTED",
        subjectId: input.subjectId,
        subjectType: input.subjectType,
        submittedAt: null,
        submittedTransactionHash: null,
        toAddress: input.toAddress,
        updatedAt: now,
        value: input.value,
        walletAddress: input.walletAddress,
        walletId: input.walletId
      });
    await this.release1Repositories.auditLogs.append({
      action: "SPONSORED_TRANSACTION_REQUEST_CREATED",
      actorUserId: input.requestedByUserId,
      entityId: request.id,
      entityType: "SPONSORED_TRANSACTION_REQUEST",
      id: randomUUID(),
      ipAddress: input.requestMetadata.ipAddress,
      metadata: {
        amountMinor: request.amountMinor,
        approved: approved,
        chainId: request.chainId,
        dealMilestoneSettlementRequestId: request.dealMilestoneSettlementRequestId,
        dealVersionId: request.dealVersionId,
        draftDealId: request.draftDealId,
        expiresAt: request.expiresAt,
        gasPolicyId: request.gasPolicyId,
        kind: request.kind,
        reason: request.reason,
        status: request.status,
        subjectId: request.subjectId,
        subjectType: request.subjectType,
        walletId: request.walletId
      },
      occurredAt: now,
      organizationId: input.organizationId,
      userAgent: input.requestMetadata.userAgent
    });

    return {
      sponsoredTransactionRequest: request as SponsoredTransactionRequestSummary
    };
  }

  private async evaluateGasPolicy(
    gasPolicy: GasPolicyRecord,
    input: {
      actionKind: string;
      amountMinor: string;
      chainId: number;
      kind: SponsoredTransactionKind;
      organizationId: string;
    }
  ): Promise<{ reason: string | null }> {
    if (!gasPolicy.active) {
      return { reason: "gas policy is disabled" };
    }

    if (!gasPolicy.allowedTransactionKinds.includes(input.kind)) {
      return { reason: "transaction kind is not allowed by gas policy" };
    }

    if (
      gasPolicy.allowedApprovalPolicyKinds.length > 0 &&
      !gasPolicy.allowedApprovalPolicyKinds.includes(
        input.actionKind as GasPolicyRecord["allowedApprovalPolicyKinds"][number]
      )
    ) {
      return { reason: "approval action is not allowed by gas policy" };
    }

    if (!gasPolicy.allowedChainIds.includes(input.chainId)) {
      return { reason: "chain is not allowed by gas policy" };
    }

    if (
      gasPolicy.maxAmountMinor &&
      BigInt(input.amountMinor) > BigInt(gasPolicy.maxAmountMinor)
    ) {
      return { reason: "requested amount exceeds gas policy limit" };
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const approvedToday =
      await this.release12Repositories.sponsoredTransactionRequests.countApprovedCreatedSince({
        gasPolicyId: gasPolicy.id,
        organizationId: input.organizationId,
        since: dayStart.toISOString()
      });

    if (approvedToday >= gasPolicy.maxRequestsPerDay) {
      return { reason: "gas policy daily request budget has been exhausted" };
    }

    return { reason: null };
  }

  private async resolveGasPolicy(
    organizationId: string,
    walletId: string,
    explicitGasPolicyId?: string
  ): Promise<GasPolicyRecord | null> {
    if (explicitGasPolicyId) {
      const record =
        await this.release12Repositories.gasPolicies.findById(explicitGasPolicyId);
      if (!record || record.organizationId !== organizationId || !record.active) {
        throw new NotFoundException("gas policy not found");
      }

      return record;
    }

    const profile = await this.release12Repositories.walletProfiles.findByWalletId(walletId);

    if (profile?.defaultGasPolicyId) {
      const record = await this.release12Repositories.gasPolicies.findById(
        profile.defaultGasPolicyId
      );

      if (record && record.organizationId === organizationId && record.active) {
        return record;
      }
    }

    const [firstActive] =
      await this.release12Repositories.gasPolicies.listActiveByOrganizationId(
        organizationId
      );
    return firstActive ?? null;
  }

  private async requireOrganizationMembership(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole: "MEMBER" | "ADMIN" | "OWNER"
  ) {
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
      membership,
      organization,
      user: actor.user,
      wallet: actor.wallet,
      profile:
        (await this.release12Repositories.walletProfiles.findByWalletId(actor.wallet.id)) ?? null
    };
  }
}
