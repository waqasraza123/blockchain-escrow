import { randomBytes, randomUUID, createHash } from "node:crypto";

import type {
  PartnerAccountRecord,
  PartnerApiKeyRecord,
  PartnerHostedSessionRecord,
  PartnerOrganizationLinkRecord,
  Release1Repositories,
  Release10Repositories
} from "@blockchain-escrow/db";
import {
  createActionApprovalRequestSchema,
  createDealVersionAcceptanceSchema,
  createDealVersionSchema,
  createDraftDealSchema,
  createFundingTransactionSchema,
  createMilestoneDisputeSchema,
  createMilestoneReviewSchema,
  createMilestoneSettlementRequestSchema,
  createPartnerHostedSessionSchema,
  createPartnerWebhookSubscriptionSchema,
  fundingPreparationParamsSchema,
  hostedLaunchTokenParamsSchema,
  listApprovalRequestsParamsSchema,
  partnerAccountParamsSchema,
  partnerHostedSessionParamsSchema,
  partnerWebhookDeliveryStatusSchema,
  partnerWriteReferenceSchema,
  type ApprovalRequestDetailResponse,
  type CreateApprovalRequestResponse,
  type CreateDealVersionAcceptanceResponse,
  type CreateDealVersionResponse,
  type CreateDraftDealResponse,
  type CreateFundingTransactionResponse,
  type CreatePartnerHostedSessionResponse,
  type CreateDealMilestoneDisputeResponse,
  type CreateDealMilestoneReviewResponse,
  type CreateDealMilestoneSettlementRequestResponse,
  type DraftDealDetailResponse,
  type GetDealVersionSettlementStatementResponse,
  type GetFundingPreparationResponse,
  type JsonObject,
  type ListApprovalRequestsResponse,
  type ListDraftDealsResponse,
  type ListPartnerHostedSessionsResponse,
  type OrganizationPartnerOverviewResponse,
  type PartnerAccountDetailResponse,
  type PartnerApiKeySummary,
  type PartnerApiKeyWithSecret,
  type PartnerCreateApprovalRequestResponse,
  type PartnerHostedSessionDetail,
  type PartnerHostedSessionResponse,
  type PartnerHostedSessionSummary,
  type PartnerOrganizationLinkSummary,
  type PartnerPublicAccountResponse,
  type PartnerSettlementStatementResponse,
  type PartnerWebhookDeliveryDetail,
  type PartnerWebhookDeliverySummary,
  type PartnerWebhookSubscriptionSummary
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import {
  RELEASE1_REPOSITORIES,
  RELEASE10_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";
import { ApprovalsService } from "../approvals/approvals.service";
import { DraftsService } from "../drafts/drafts.service";
import { FundingService } from "../funding/funding.service";
import { MilestonesService } from "../milestones/milestones.service";
import { PartnerAuthService, type PartnerApiContext } from "./partner-auth.service";
import { PartnerEventsService } from "./partner-events.service";
import {
  PARTNER_CONFIGURATION,
  type PartnerConfiguration
} from "./partner.tokens";

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | null {
  const value = headers[name];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
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

function hashRequest(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function toJsonObject(value: unknown): JsonObject {
  return value as JsonObject;
}

function mapPartnerAccount(record: PartnerAccountRecord) {
  return {
    createdAt: record.createdAt,
    id: record.id,
    metadata: record.metadata,
    name: record.name,
    slug: record.slug,
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function mapPartnerLink(record: PartnerOrganizationLinkRecord): PartnerOrganizationLinkSummary {
  return {
    actingUserId: record.actingUserId,
    actingWalletId: record.actingWalletId,
    createdAt: record.createdAt,
    externalReference: record.externalReference,
    id: record.id,
    organizationId: record.organizationId,
    partnerAccountId: record.partnerAccountId,
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function mapPartnerApiKey(record: PartnerApiKeyRecord): PartnerApiKeySummary {
  return {
    createdAt: record.createdAt,
    displayName: record.displayName,
    expiresAt: record.expiresAt,
    id: record.id,
    keyPrefix: record.keyPrefix,
    lastUsedAt: record.lastUsedAt,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    revokedAt: record.revokedAt,
    scopes: record.scopes,
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function mapHostedSession(
  record: PartnerHostedSessionRecord
): PartnerHostedSessionSummary {
  return {
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    dealMilestoneDisputeId: record.dealMilestoneDisputeId,
    dealVersionId: record.dealVersionId,
    dealVersionMilestoneId: record.dealVersionMilestoneId,
    draftDealId: record.draftDealId,
    expiresAt: record.expiresAt,
    id: record.id,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    partnerReferenceId: record.partnerReferenceId,
    status: record.status,
    type: record.type,
    updatedAt: record.updatedAt
  };
}

function mapSubscription(
  record: Awaited<
    ReturnType<Release10Repositories["partnerWebhookSubscriptions"]["findById"]>
  > extends infer T
    ? T extends null
      ? never
      : T
    : never
): PartnerWebhookSubscriptionSummary {
  return {
    createdAt: record.createdAt,
    displayName: record.displayName,
    endpointUrl: record.endpointUrl,
    eventTypes: record.eventTypes,
    id: record.id,
    lastDeliveryAt: record.lastDeliveryAt,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function requireIdempotencyKey(
  headers: Record<string, string | string[] | undefined>
): string {
  const value =
    readHeader(headers, "idempotency-key") ?? readHeader(headers, "Idempotency-Key");

  if (!value?.trim()) {
    throw new BadRequestException("Idempotency-Key header is required");
  }

  return value.trim();
}

@Injectable()
export class PartnerService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE10_REPOSITORIES)
    private readonly release10Repositories: Release10Repositories,
    @Inject(PARTNER_CONFIGURATION)
    private readonly configuration: PartnerConfiguration,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    private readonly approvalsService: ApprovalsService,
    private readonly draftsService: DraftsService,
    private readonly fundingService: FundingService,
    private readonly milestonesService: MilestonesService,
    private readonly partnerAuthService: PartnerAuthService,
    private readonly partnerEventsService: PartnerEventsService
  ) {}

  async getPartnerAccount(
    headers: Record<string, string | string[] | undefined>
  ): Promise<PartnerPublicAccountResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);

    return {
      account: mapPartnerAccount(context.account),
      apiKey: mapPartnerApiKey(context.apiKey),
      link: mapPartnerLink(context.link)
    };
  }

  async listDrafts(
    headers: Record<string, string | string[] | undefined>
  ): Promise<ListDraftDealsResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);

    return this.draftsService.listDraftsForOrganization(context.link.organizationId);
  }

  async createDraft(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDraftDealResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createDraftDealSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      "/partner/v1/drafts",
      parsed,
      async () => {
        const authorized = await this.draftsService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId,
          "ADMIN"
        );
        const response = await this.draftsService.createDraftWithActor(
          authorized,
          context.link.organizationId,
          parsed,
          requestMetadata
        );

        await this.recordPartnerReference(
          context.link.id,
          "DRAFT_DEAL",
          response.draft.id,
          parsed.partnerReferenceId
        );
        await this.partnerEventsService.emitEvent({
          draftDealId: response.draft.id,
          eventType: "draft.deal.created",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            draft: response.draft,
            partnerReferenceId: parsed.partnerReferenceId ?? null
          }
        });

        return response;
      }
    );
  }

  async getDraft(
    headers: Record<string, string | string[] | undefined>,
    draftDealId: string
  ): Promise<DraftDealDetailResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    return this.draftsService.getDraftForOrganization(
      context.link.organizationId,
      draftDealId
    );
  }

  async getVersion(
    headers: Record<string, string | string[] | undefined>,
    draftDealId: string,
    dealVersionId: string
  ): Promise<CreateDealVersionResponse> {
    const detail = await this.getDraft(headers, draftDealId);
    const version = detail.versions.find((entry) => entry.id === dealVersionId) ?? null;

    if (!version) {
      throw new NotFoundException("deal version not found");
    }

    return { version };
  }

  async createVersionSnapshot(
    headers: Record<string, string | string[] | undefined>,
    draftDealId: string,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealVersionResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createDealVersionSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      `/partner/v1/drafts/${draftDealId}/version-snapshots`,
      parsed,
      async () => {
        const authorized = await this.draftsService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId,
          "ADMIN"
        );
        const response = await this.draftsService.createVersionSnapshotWithActor(
          authorized,
          {
            draftDealId,
            organizationId: context.link.organizationId
          },
          parsed,
          requestMetadata
        );

        await this.recordPartnerReference(
          context.link.id,
          "DEAL_VERSION",
          response.version.id,
          parsed.partnerReferenceId
        );
        await this.partnerEventsService.emitEvent({
          draftDealId,
          eventType: "deal.version.created",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            partnerReferenceId: parsed.partnerReferenceId ?? null,
            version: response.version
          }
        });

        return response;
      }
    );
  }

  async createVersionAcceptance(
    headers: Record<string, string | string[] | undefined>,
    draftDealId: string,
    dealVersionId: string,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealVersionAcceptanceResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsed = createDealVersionAcceptanceSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      `/partner/v1/drafts/${draftDealId}/versions/${dealVersionId}/acceptances`,
      parsed.data,
      async () => {
        const authorized = await this.draftsService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId
        );
        const response = await this.draftsService.createVersionAcceptanceWithActor(
          authorized,
          {
            dealVersionId,
            draftDealId,
            organizationId: context.link.organizationId
          },
          parsed.data,
          requestMetadata
        );

        await this.partnerEventsService.emitEvent({
          draftDealId,
          eventType: "deal.version.accepted",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            acceptance: response.acceptance
          }
        });

        return response;
      }
    );
  }

  async getFundingPreparation(
    headers: Record<string, string | string[] | undefined>,
    params: {
      dealVersionId: string;
      draftDealId: string;
    }
  ): Promise<GetFundingPreparationResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const authorized = await this.fundingService.authorizeOrganizationActor(
      context.actor,
      context.link.organizationId
    );

    return this.fundingService.getFundingPreparationWithActor(authorized, {
      ...params,
      organizationId: context.link.organizationId
    });
  }

  async createFundingTransaction(
    headers: Record<string, string | string[] | undefined>,
    params: {
      dealVersionId: string;
      draftDealId: string;
    },
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateFundingTransactionResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createFundingTransactionSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      `/partner/v1/drafts/${params.draftDealId}/versions/${params.dealVersionId}/funding-transactions`,
      parsed,
      async () => {
        const authorized = await this.fundingService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId,
          "ADMIN"
        );
        const response = await this.fundingService.createFundingTransactionWithActor(
          authorized,
          {
            ...params,
            organizationId: context.link.organizationId
          },
          parsed,
          requestMetadata
        );

        await this.partnerEventsService.emitEvent({
          draftDealId: params.draftDealId,
          eventType: "funding.transaction.updated",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            fundingTransaction: response.fundingTransaction
          }
        });

        return response;
      }
    );
  }

  async getSettlementStatement(
    headers: Record<string, string | string[] | undefined>,
    params: {
      dealVersionId: string;
      draftDealId: string;
    }
  ): Promise<PartnerSettlementStatementResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);

    return this.milestonesService.getSettlementStatementForOrganization(
      context.link.organizationId,
      params.draftDealId,
      params.dealVersionId
    );
  }

  async createMilestoneReview(
    headers: Record<string, string | string[] | undefined>,
    params: {
      dealMilestoneSubmissionId: string;
      dealVersionId: string;
      dealVersionMilestoneId: string;
      draftDealId: string;
    },
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneReviewResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createMilestoneReviewSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      `/partner/v1/drafts/${params.draftDealId}/versions/${params.dealVersionId}/milestones/${params.dealVersionMilestoneId}/reviews`,
      parsed,
      async () => {
        const authorized = await this.milestonesService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId
        );
        const response = await this.milestonesService.createMilestoneReviewWithActor(
          authorized,
          {
            ...params,
            organizationId: context.link.organizationId
          },
          parsed,
          requestMetadata
        );

        await this.partnerEventsService.emitEvent({
          draftDealId: params.draftDealId,
          eventType: "milestone.review.created",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            review: response.review
          }
        });

        return response;
      }
    );
  }

  async createMilestoneSettlementRequest(
    headers: Record<string, string | string[] | undefined>,
    params: {
      dealMilestoneReviewId: string;
      dealMilestoneSubmissionId: string;
      dealVersionId: string;
      dealVersionMilestoneId: string;
      draftDealId: string;
    },
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneSettlementRequestResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createMilestoneSettlementRequestSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      `/partner/v1/drafts/${params.draftDealId}/versions/${params.dealVersionId}/milestones/${params.dealVersionMilestoneId}/settlement-requests`,
      parsed,
      async () => {
        const authorized = await this.milestonesService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId
        );
        const response =
          await this.milestonesService.createMilestoneSettlementRequestWithActor(
            authorized,
            {
              ...params,
              organizationId: context.link.organizationId
            },
            parsed,
            requestMetadata
          );

        await this.partnerEventsService.emitEvent({
          draftDealId: params.draftDealId,
          eventType: "milestone.settlement_requested",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            settlementRequest: response.settlementRequest
          }
        });

        return response;
      }
    );
  }

  async createMilestoneDispute(
    headers: Record<string, string | string[] | undefined>,
    params: {
      dealMilestoneReviewId: string;
      dealMilestoneSubmissionId: string;
      dealVersionId: string;
      dealVersionMilestoneId: string;
      draftDealId: string;
    },
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealMilestoneDisputeResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createMilestoneDisputeSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      `/partner/v1/drafts/${params.draftDealId}/versions/${params.dealVersionId}/milestones/${params.dealVersionMilestoneId}/disputes`,
      parsed,
      async () => {
        const authorized = await this.milestonesService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId
        );
        const response = await this.milestonesService.createMilestoneDisputeWithActor(
          authorized,
          {
            ...params,
            organizationId: context.link.organizationId
          },
          parsed,
          requestMetadata
        );

        await this.partnerEventsService.emitEvent({
          draftDealId: params.draftDealId,
          eventType: "milestone.dispute.opened",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            dispute: response.dispute
          }
        });

        return response;
      }
    );
  }

  async listApprovalRequests(
    headers: Record<string, string | string[] | undefined>,
    query: unknown
  ): Promise<ListApprovalRequestsResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsed = listApprovalRequestsParamsSchema.safeParse({
      ...(typeof query === "object" && query ? query : {}),
      organizationId: context.link.organizationId
    });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.approvalsService.listApprovalRequestsForOrganization(parsed.data);
  }

  async getApprovalRequestDetail(
    headers: Record<string, string | string[] | undefined>,
    approvalRequestId: string
  ): Promise<ApprovalRequestDetailResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);

    return this.approvalsService.getApprovalRequestDetailForOrganization({
      approvalRequestId,
      organizationId: context.link.organizationId
    });
  }

  async createApprovalRequest(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<PartnerCreateApprovalRequestResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsedBody = createActionApprovalRequestSchema.safeParse(body);
    const parsedReference = partnerWriteReferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(parsedBody.error.flatten());
    }

    if (!parsedReference.success) {
      throw new BadRequestException(parsedReference.error.flatten());
    }

    const parsed = { ...parsedBody.data, ...parsedReference.data };

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      "/partner/v1/approval-requests",
      parsed,
      async () => {
        const authorized = await this.approvalsService.authorizeOrganizationActor(
          context.actor,
          context.link.organizationId,
          "ADMIN"
        );
        const response = await this.approvalsService.createActionApprovalRequestWithActor(
          authorized,
          context.link.organizationId,
          parsed,
          requestMetadata
        );

        await this.recordPartnerReference(
          context.link.id,
          "APPROVAL_REQUEST",
          response.approvalRequest.id,
          parsed.partnerReferenceId
        );
        await this.partnerEventsService.emitEvent({
          eventType: "approval.request.updated",
          organizationId: context.link.organizationId,
          partnerOrganizationLinkId: context.link.id,
          payload: {
            approvalRequest: response.approvalRequest,
            partnerReferenceId: parsed.partnerReferenceId ?? null
          }
        });

        return response;
      }
    );
  }

  async createHostedSession(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreatePartnerHostedSessionResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const parsed = createPartnerHostedSessionSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.withIdempotency(
      context,
      requireIdempotencyKey(headers),
      "POST",
      "/partner/v1/hosted-sessions",
      parsed.data,
      async () => {
        const now = new Date().toISOString();
        const expiresAt =
          parsed.data.expiresAt ??
          new Date(
            Date.now() +
              (parsed.data.expiresInSeconds ??
                this.configuration.hostedSessionTtlSeconds) *
                1000
          ).toISOString();
        const launchToken = randomBytes(24).toString("hex");
        const hostedSession =
          await this.release10Repositories.partnerHostedSessions.create({
            activatedAt: null,
            completedAt: null,
            createdAt: now,
            dealMilestoneDisputeId: parsed.data.dealMilestoneDisputeId ?? null,
            dealVersionId: parsed.data.dealVersionId ?? null,
            dealVersionMilestoneId: parsed.data.dealVersionMilestoneId ?? null,
            draftDealId: parsed.data.draftDealId ?? null,
            expiresAt,
            id: randomUUID(),
            launchTokenHash: this.partnerAuthService.hashLaunchToken(launchToken),
            partnerApiKeyId: context.apiKey.id,
            partnerOrganizationLinkId: context.link.id,
            partnerReferenceId: parsed.data.partnerReferenceId ?? null,
            status: "PENDING",
            type: parsed.data.type,
            updatedAt: now
          });

        await this.recordPartnerReference(
          context.link.id,
          "PARTNER_HOSTED_SESSION",
          hostedSession.id,
          parsed.data.partnerReferenceId
        );
        await this.release1Repositories.auditLogs.append({
          action: "PARTNER_HOSTED_SESSION_CREATED",
          actorUserId: context.actor.user.id,
          entityId: hostedSession.id,
          entityType: "PARTNER_HOSTED_SESSION",
          id: randomUUID(),
          ipAddress: requestMetadata.ipAddress,
          metadata: {
            type: hostedSession.type
          },
          occurredAt: now,
          organizationId: context.link.organizationId,
          userAgent: requestMetadata.userAgent
        });

        return {
          hostedSession: {
            ...mapHostedSession(hostedSession),
            launchUrl: `${this.configuration.hostedBaseUrl}/hosted/${launchToken}`
          }
        };
      }
    );
  }

  async listHostedSessions(
    headers: Record<string, string | string[] | undefined>
  ): Promise<ListPartnerHostedSessionsResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const hostedSessions =
      await this.release10Repositories.partnerHostedSessions.listByPartnerOrganizationLinkId(
        context.link.id
      );

    return {
      hostedSessions: hostedSessions.map(mapHostedSession)
    };
  }

  async getHostedSession(
    headers: Record<string, string | string[] | undefined>,
    hostedSessionId: string
  ): Promise<PartnerHostedSessionResponse> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const hostedSession =
      await this.release10Repositories.partnerHostedSessions.findById(hostedSessionId);

    if (
      !hostedSession ||
      hostedSession.partnerOrganizationLinkId !== context.link.id
    ) {
      throw new NotFoundException("partner hosted session not found");
    }

    return {
      hostedSession: {
        ...mapHostedSession(hostedSession),
        launchUrl: null
      }
    };
  }

  async listWebhookSubscriptions(
    headers: Record<string, string | string[] | undefined>
  ): Promise<{ subscriptions: PartnerWebhookSubscriptionSummary[] }> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const subscriptions =
      await this.release10Repositories.partnerWebhookSubscriptions.listByPartnerOrganizationLinkId(
        context.link.id
      );

    return {
      subscriptions: subscriptions.map((subscription) => mapSubscription(subscription))
    };
  }

  async listWebhookDeliveries(
    headers: Record<string, string | string[] | undefined>
  ): Promise<{ deliveries: PartnerWebhookDeliverySummary[] }> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const deliveries =
      await this.release10Repositories.partnerWebhookDeliveries.listByPartnerOrganizationLinkId(
        context.link.id
      );

    return {
      deliveries: await Promise.all(
        deliveries.map((delivery) => this.buildWebhookDeliverySummary(delivery.id))
      )
    };
  }

  async getWebhookDelivery(
    headers: Record<string, string | string[] | undefined>,
    deliveryId: string
  ): Promise<{ delivery: PartnerWebhookDeliveryDetail }> {
    const context = await this.partnerAuthService.requirePartnerContext(headers);
    const delivery =
      await this.release10Repositories.partnerWebhookDeliveries.findById(deliveryId);

    if (!delivery || delivery.partnerOrganizationLinkId !== context.link.id) {
      throw new NotFoundException("partner webhook delivery not found");
    }

    return {
      delivery: await this.buildWebhookDeliveryDetail(delivery.id)
    };
  }

  async getOrganizationOverview(
    organizationId: string,
    requestMetadata: RequestMetadata
  ): Promise<OrganizationPartnerOverviewResponse> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const membership = await this.release1Repositories.organizationMembers.findMembership(
      organizationId,
      actor.user.id
    );

    if (!membership) {
      throw new NotFoundException("organization not found");
    }

    const [links, deliveries, hostedSessions] = await Promise.all([
      this.release10Repositories.partnerOrganizationLinks.listByOrganizationId(organizationId),
      this.release10Repositories.partnerWebhookDeliveries.listByPartnerOrganizationLinkIds(
        (
          await this.release10Repositories.partnerOrganizationLinks.listByOrganizationId(
            organizationId
          )
        ).map((link) => link.id)
      ),
      this.release10Repositories.partnerHostedSessions.listByOrganizationId(organizationId)
    ]);
    const [accounts, apiKeys, subscriptions] = await Promise.all([
      Promise.all(
        links.map((link) =>
          this.release10Repositories.partnerAccounts.findById(link.partnerAccountId)
        )
      ),
      Promise.all(
        links.map((link) =>
          this.release10Repositories.partnerApiKeys.listByPartnerOrganizationLinkId(link.id)
        )
      ),
      this.release10Repositories.partnerWebhookSubscriptions.listByPartnerOrganizationLinkIds(
        links.map((link) => link.id)
      )
    ]);

    return {
      apiKeys: apiKeys.flat().map(mapPartnerApiKey),
      hostedSessions: hostedSessions.map(mapHostedSession),
      partners: accounts.filter((record): record is PartnerAccountRecord => Boolean(record)).map(
        mapPartnerAccount
      ),
      recentDeliveries: await Promise.all(
        deliveries.slice(0, 20).map((delivery) => this.buildWebhookDeliverySummary(delivery.id))
      ),
      subscriptions: subscriptions.map((subscription) => mapSubscription(subscription))
    };
  }

  async getLaunchSession(launchToken: string): Promise<PartnerHostedSessionResponse> {
    const parsed = hostedLaunchTokenParamsSchema.safeParse({ launchToken });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const hostedSession =
      await this.release10Repositories.partnerHostedSessions.findByLaunchTokenHash(
        this.partnerAuthService.hashLaunchToken(parsed.data.launchToken)
      );

    if (!hostedSession) {
      throw new NotFoundException("hosted session not found");
    }

    return {
      hostedSession: {
        ...mapHostedSession(hostedSession),
        launchUrl: null
      }
    };
  }

  async exchangeLaunchSession(
    launchToken: string,
    requestMetadata: RequestMetadata
  ): Promise<{ expiresAt: string; sessionToken: string }> {
    const hostedSession =
      await this.release10Repositories.partnerHostedSessions.findByLaunchTokenHash(
        this.partnerAuthService.hashLaunchToken(launchToken)
      );

    if (!hostedSession) {
      throw new NotFoundException("hosted session not found");
    }

    const now = new Date().toISOString();

    if (new Date(hostedSession.expiresAt).getTime() <= Date.now()) {
      await this.release10Repositories.partnerHostedSessions.update(hostedSession.id, {
        status: "EXPIRED",
        updatedAt: now
      });
      await this.partnerEventsService.emitEvent({
        eventType: "hosted.session.expired",
        hostedSessionId: hostedSession.id,
        organizationId: (
          await this.release10Repositories.partnerOrganizationLinks.findById(
            hostedSession.partnerOrganizationLinkId
          )
        )?.organizationId ?? "",
        partnerOrganizationLinkId: hostedSession.partnerOrganizationLinkId,
        payload: {
          hostedSessionId: hostedSession.id
        }
      });
      throw new ConflictException("hosted session has expired");
    }

    const nextStatus =
      hostedSession.status === "PENDING" ? "ACTIVE" : hostedSession.status;

    const updated = await this.release10Repositories.partnerHostedSessions.update(
      hostedSession.id,
      {
        activatedAt: hostedSession.activatedAt ?? now,
        status: nextStatus,
        updatedAt: now
      }
    );

    return {
      expiresAt: updated.expiresAt,
      sessionToken: this.partnerAuthService.buildHostedSessionToken(updated)
    };
  }

  private async buildWebhookDeliverySummary(
    deliveryId: string
  ): Promise<PartnerWebhookDeliverySummary> {
    const delivery =
      await this.release10Repositories.partnerWebhookDeliveries.findById(deliveryId);

    if (!delivery) {
      throw new NotFoundException("partner webhook delivery not found");
    }

    const event = await this.release10Repositories.partnerWebhookEvents.findById(
      delivery.partnerWebhookEventId
    );

    if (!event) {
      throw new NotFoundException("partner webhook event not found");
    }

    return {
      createdAt: delivery.createdAt,
      deliveredAt: delivery.deliveredAt,
      errorMessage: delivery.errorMessage,
      eventType: event.eventType,
      id: delivery.id,
      lastAttemptAt: delivery.lastAttemptAt,
      nextAttemptAt: delivery.nextAttemptAt,
      partnerOrganizationLinkId: delivery.partnerOrganizationLinkId,
      partnerWebhookSubscriptionId: delivery.partnerWebhookSubscriptionId,
      status: delivery.status
    };
  }

  private async buildWebhookDeliveryDetail(
    deliveryId: string
  ): Promise<PartnerWebhookDeliveryDetail> {
    const delivery =
      await this.release10Repositories.partnerWebhookDeliveries.findById(deliveryId);

    if (!delivery) {
      throw new NotFoundException("partner webhook delivery not found");
    }

    const [attempts, event, subscription] = await Promise.all([
      this.release10Repositories.partnerWebhookDeliveryAttempts.listByPartnerWebhookDeliveryId(
        delivery.id
      ),
      this.release10Repositories.partnerWebhookEvents.findById(
        delivery.partnerWebhookEventId
      ),
      this.release10Repositories.partnerWebhookSubscriptions.findById(
        delivery.partnerWebhookSubscriptionId
      )
    ]);

    if (!event || !subscription) {
      throw new NotFoundException("partner webhook delivery detail not found");
    }

    return {
      ...(await this.buildWebhookDeliverySummary(delivery.id)),
      attempts: attempts.map((attempt) => ({
        attemptedAt: attempt.attemptedAt,
        durationMs: attempt.durationMs,
        errorMessage: attempt.errorMessage,
        finishedAt: attempt.finishedAt,
        id: attempt.id,
        nextRetryAt: attempt.nextRetryAt,
        responseStatusCode: attempt.responseStatusCode
      })),
      payload: event.payload,
      subscription: mapSubscription(subscription)
    };
  }

  private async recordPartnerReference(
    partnerOrganizationLinkId: string,
    resourceType: "DRAFT_DEAL" | "DEAL_VERSION" | "APPROVAL_REQUEST" | "PARTNER_HOSTED_SESSION",
    resourceId: string,
    partnerReferenceId: string | undefined
  ): Promise<void> {
    if (!partnerReferenceId) {
      return;
    }

    const existing =
      await this.release10Repositories.partnerResourceReferences.findByPartnerReferenceId(
        {
          partnerOrganizationLinkId,
          partnerReferenceId
        }
      );

    if (existing && existing.resourceId !== resourceId) {
      throw new ConflictException("partner reference id already exists");
    }

    if (!existing) {
      await this.release10Repositories.partnerResourceReferences.create({
        createdAt: new Date().toISOString(),
        id: randomUUID(),
        partnerOrganizationLinkId,
        partnerReferenceId,
        resourceId,
        resourceType
      });
    }
  }

  private async withIdempotency<T>(
    context: PartnerApiContext,
    requestKey: string,
    requestMethod: string,
    requestPath: string,
    requestBody: unknown,
    factory: () => Promise<T>
  ): Promise<T> {
    const requestHash = hashRequest(requestBody);
    const existing =
      await this.release10Repositories.partnerIdempotencyKeys.findByScope({
        partnerApiKeyId: context.apiKey.id,
        requestKey,
        requestMethod,
        requestPath
      });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException("idempotency key was already used for a different payload");
      }

      return existing.responseBody as T;
    }

    const response = await factory();

    await this.release10Repositories.partnerIdempotencyKeys.create({
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      partnerApiKeyId: context.apiKey.id,
      requestHash,
      requestKey,
      requestMethod,
      requestPath,
      responseBody: toJsonObject(response),
      responseStatusCode: 200
    });

    return response;
  }
}
