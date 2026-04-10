import { randomUUID } from "node:crypto";

import type { Release1Repositories, Release10Repositories } from "@blockchain-escrow/db";
import {
  createCounterpartyDealVersionAcceptanceSchema,
  createCounterpartyMilestoneSubmissionSchema,
  createFileSchema,
  hostedLaunchTokenParamsSchema,
  milestoneSubmissionParamsSchema,
  prepareCounterpartyMilestoneSubmissionSchema,
  type CreateCounterpartyDealVersionAcceptanceResponse,
  type CreateCounterpartyDealMilestoneSubmissionResponse,
  type CreateFileResponse,
  type HostedDisputeEvidenceLinkResponse,
  type HostedSessionContextResponse,
  type HostedSessionExchangeResponse,
  type HostedSessionStatusResponse,
  type PrepareCounterpartyDealMilestoneSubmissionResponse
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
import { DraftsService } from "../drafts/drafts.service";
import { MilestonesService } from "../milestones/milestones.service";
import { TenantService } from "../tenant/tenant.service";
import { PartnerAuthService } from "./partner-auth.service";
import { PartnerEventsService } from "./partner-events.service";

function parseDisputeEvidenceLinkInput(input: unknown): { fileId: string } {
  if (!input || typeof input !== "object") {
    throw new BadRequestException("fileId is required");
  }

  const fileId = (input as { fileId?: unknown }).fileId;

  if (typeof fileId !== "string" || !fileId.trim()) {
    throw new BadRequestException("fileId is required");
  }

  return { fileId: fileId.trim() };
}

function toFileSummary(file: Awaited<ReturnType<Release1Repositories["files"]["create"]>>) {
  return {
    byteSize: file.byteSize,
    category: file.category,
    createdAt: file.createdAt,
    createdByUserId: file.createdByUserId,
    id: file.id,
    mediaType: file.mediaType,
    organizationId: file.organizationId,
    originalFilename: file.originalFilename,
    sha256Hex: file.sha256Hex,
    storageKey: file.storageKey,
    updatedAt: file.updatedAt
  };
}

@Injectable()
export class PartnerHostedService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE10_REPOSITORIES)
    private readonly release10Repositories: Release10Repositories,
    private readonly draftsService: DraftsService,
    private readonly milestonesService: MilestonesService,
    private readonly tenantService: TenantService,
    private readonly partnerAuthService: PartnerAuthService,
    private readonly partnerEventsService: PartnerEventsService
  ) {}

  async getLaunchSession(launchToken: string) {
    const parsed = hostedLaunchTokenParamsSchema.safeParse({ launchToken });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.release10Repositories.partnerHostedSessions.findByLaunchTokenHash(
      this.partnerAuthService.hashLaunchToken(parsed.data.launchToken)
    );
  }

  async exchange(
    launchToken: string,
    requestMetadata: RequestMetadata
  ): Promise<HostedSessionExchangeResponse> {
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

    const now = new Date().toISOString();

    if (new Date(hostedSession.expiresAt).getTime() <= Date.now()) {
      await this.expireHostedSession(hostedSession.id);
      throw new ConflictException("hosted session has expired");
    }

    const activated =
      hostedSession.status === "PENDING"
        ? await this.release10Repositories.partnerHostedSessions.update(hostedSession.id, {
            activatedAt: hostedSession.activatedAt ?? now,
            status: "ACTIVE",
            updatedAt: now
          })
        : hostedSession;

    return {
      expiresAt: activated.expiresAt,
      sessionToken: this.partnerAuthService.buildHostedSessionToken(activated)
    };
  }

  async getSession(requestMetadata: RequestMetadata): Promise<HostedSessionStatusResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);

    return {
      hostedSession: {
        completedAt: context.hostedSession.completedAt,
        createdAt: context.hostedSession.createdAt,
        dealMilestoneDisputeId: context.hostedSession.dealMilestoneDisputeId,
        dealVersionId: context.hostedSession.dealVersionId,
        dealVersionMilestoneId: context.hostedSession.dealVersionMilestoneId,
        draftDealId: context.hostedSession.draftDealId,
        expiresAt: context.hostedSession.expiresAt,
        id: context.hostedSession.id,
        partnerOrganizationLinkId: context.hostedSession.partnerOrganizationLinkId,
        partnerReferenceId: context.hostedSession.partnerReferenceId,
        status: context.hostedSession.status,
        type: context.hostedSession.type,
        updatedAt: context.hostedSession.updatedAt
      }
    };
  }

  async getContext(requestMetadata: RequestMetadata): Promise<HostedSessionContextResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);

    switch (context.hostedSession.type) {
      case "COUNTERPARTY_VERSION_ACCEPTANCE":
        return {
          acceptance: await this.draftsService.getCounterpartyAcceptance({
            dealVersionId: context.hostedSession.dealVersionId,
            draftDealId: context.hostedSession.draftDealId,
            organizationId: context.link.organizationId
          }),
          draft: await this.draftsService.getDraftForOrganization(
            context.link.organizationId,
            context.hostedSession.draftDealId!
          ),
          dispute: null,
          hostedSession: (await this.getSession(requestMetadata)).hostedSession,
          settlementStatement: context.hostedSession.dealVersionId
            ? await this.milestonesService.getSettlementStatementForOrganization(
                context.link.organizationId,
                context.hostedSession.draftDealId!,
                context.hostedSession.dealVersionId
              )
            : null
        };
      case "COUNTERPARTY_MILESTONE_SUBMISSION":
        return {
          acceptance: null,
          draft: await this.draftsService.getDraftForOrganization(
            context.link.organizationId,
            context.hostedSession.draftDealId!
          ),
          dispute: null,
          hostedSession: (await this.getSession(requestMetadata)).hostedSession,
          settlementStatement: await this.milestonesService.getSettlementStatementForOrganization(
            context.link.organizationId,
            context.hostedSession.draftDealId!,
            context.hostedSession.dealVersionId!
          )
        };
      case "DISPUTE_EVIDENCE_UPLOAD":
      case "DEAL_STATUS_REVIEW":
        return {
          acceptance: null,
          draft: context.hostedSession.draftDealId
            ? await this.draftsService.getDraftForOrganization(
                context.link.organizationId,
                context.hostedSession.draftDealId
              )
            : null,
          dispute: null,
          hostedSession: (await this.getSession(requestMetadata)).hostedSession,
          settlementStatement:
            context.hostedSession.draftDealId && context.hostedSession.dealVersionId
              ? await this.milestonesService.getSettlementStatementForOrganization(
                  context.link.organizationId,
                  context.hostedSession.draftDealId,
                  context.hostedSession.dealVersionId
                )
              : null
        };
    }
  }

  async createVersionAcceptance(
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateCounterpartyDealVersionAcceptanceResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);
    const parsed = createCounterpartyDealVersionAcceptanceSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (context.hostedSession.type !== "COUNTERPARTY_VERSION_ACCEPTANCE") {
      throw new ConflictException("hosted session does not allow version acceptance");
    }

    const response = await this.draftsService.createCounterpartyAcceptance(
      {
        dealVersionId: context.hostedSession.dealVersionId,
        draftDealId: context.hostedSession.draftDealId,
        organizationId: context.link.organizationId
      },
      parsed.data
    );

    await this.completeHostedSession(context.hostedSession.id);

    return response;
  }

  async prepareMilestoneSubmission(
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<PrepareCounterpartyDealMilestoneSubmissionResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);
    const parsed = prepareCounterpartyMilestoneSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (context.hostedSession.type !== "COUNTERPARTY_MILESTONE_SUBMISSION") {
      throw new ConflictException("hosted session does not allow milestone submission");
    }

    return this.milestonesService.prepareCounterpartyMilestoneSubmission(
      {
        dealVersionId: context.hostedSession.dealVersionId,
        dealVersionMilestoneId: context.hostedSession.dealVersionMilestoneId,
        draftDealId: context.hostedSession.draftDealId,
        organizationId: context.link.organizationId
      },
      parsed.data
    );
  }

  async createMilestoneSubmission(
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateCounterpartyDealMilestoneSubmissionResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);
    const parsed = createCounterpartyMilestoneSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (context.hostedSession.type !== "COUNTERPARTY_MILESTONE_SUBMISSION") {
      throw new ConflictException("hosted session does not allow milestone submission");
    }

    const response = await this.milestonesService.createCounterpartyMilestoneSubmission(
      {
        dealVersionId: context.hostedSession.dealVersionId,
        dealVersionMilestoneId: context.hostedSession.dealVersionMilestoneId,
        draftDealId: context.hostedSession.draftDealId,
        organizationId: context.link.organizationId
      },
      parsed.data
    );

    await this.completeHostedSession(context.hostedSession.id);

    return response;
  }

  async createFile(
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateFileResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);
    const parsed = createFileSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    if (context.hostedSession.type !== "DISPUTE_EVIDENCE_UPLOAD") {
      throw new ConflictException("hosted session does not allow file upload");
    }

    const existing = await this.release1Repositories.files.findByOrganizationIdAndStorageKey(
      context.link.organizationId,
      parsed.data.storageKey
    );

    if (existing) {
      throw new ConflictException("file storage key already exists");
    }

    const now = new Date().toISOString();
    const file = await this.release1Repositories.files.create({
      byteSize: parsed.data.byteSize,
      category: parsed.data.category,
      createdAt: now,
      createdByUserId: context.actor.user.id,
      id: randomUUID(),
      mediaType: parsed.data.mediaType,
      organizationId: context.link.organizationId,
      originalFilename: parsed.data.originalFilename,
      sha256Hex: parsed.data.sha256Hex,
      storageKey: parsed.data.storageKey,
      updatedAt: now
    });

    await this.release1Repositories.auditLogs.append({
      action: "FILE_CREATED",
      actorUserId: context.actor.user.id,
      entityId: file.id,
      entityType: "FILE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        hostedSessionId: context.hostedSession.id,
        mediaType: file.mediaType,
        originalFilename: file.originalFilename
      },
      occurredAt: now,
      organizationId: context.link.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      file: toFileSummary(file)
    };
  }

  async linkDisputeEvidence(
    body: unknown,
    requestMetadata: RequestMetadata
  ): Promise<HostedDisputeEvidenceLinkResponse> {
    const context = await this.partnerAuthService.requireHostedSessionContext(requestMetadata);
    const parsed = parseDisputeEvidenceLinkInput(body);

    if (
      context.hostedSession.type !== "DISPUTE_EVIDENCE_UPLOAD" ||
      !context.hostedSession.dealMilestoneDisputeId
    ) {
      throw new ConflictException("hosted session does not allow dispute evidence linkage");
    }

    const file = await this.release1Repositories.files.findById(parsed.fileId);

    if (!file || file.organizationId !== context.link.organizationId) {
      throw new NotFoundException("file not found");
    }

    const existingEvidence =
      await this.release1Repositories.dealMilestoneDisputeEvidence.listByDealMilestoneDisputeId(
        context.hostedSession.dealMilestoneDisputeId
      );
    const existing = existingEvidence.find((record) => record.fileId === file.id) ?? null;

    if (!existing) {
      await this.release1Repositories.dealMilestoneDisputeEvidence.add({
        createdAt: new Date().toISOString(),
        dealMilestoneDisputeId: context.hostedSession.dealMilestoneDisputeId,
        fileId: file.id,
        id: randomUUID()
      });
    }

    await this.completeHostedSession(context.hostedSession.id);

    return {
      file: toFileSummary(file)
    };
  }

  private async completeHostedSession(hostedSessionId: string): Promise<void> {
    const now = new Date().toISOString();
    const hostedSession =
      await this.release10Repositories.partnerHostedSessions.update(hostedSessionId, {
        completedAt: now,
        status: "COMPLETED",
        updatedAt: now
      });
    const link =
      await this.release10Repositories.partnerOrganizationLinks.findById(
        hostedSession.partnerOrganizationLinkId
      );

    if (!link) {
      return;
    }

    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_HOSTED_SESSION_COMPLETED",
      actorUserId: link.actingUserId,
      entityId: hostedSession.id,
      entityType: "PARTNER_HOSTED_SESSION",
      id: randomUUID(),
      ipAddress: null,
      metadata: {
        type: hostedSession.type
      },
      occurredAt: now,
      organizationId: link.organizationId,
      userAgent: "hosted-session"
    });
    await this.partnerEventsService.emitEvent({
      eventType: "hosted.session.completed",
      hostedSessionId: hostedSession.id,
      organizationId: link.organizationId,
      partnerOrganizationLinkId: hostedSession.partnerOrganizationLinkId,
      payload: {
        hostedSessionId: hostedSession.id,
        type: hostedSession.type
      }
    });
    await this.tenantService.recordUsageEvent({
      externalKey: `partner-hosted-completed:${hostedSession.id}`,
      metric: "PARTNER_HOSTED_SESSION_COMPLETED",
      organizationId: link.organizationId,
      partnerAccountId: link.partnerAccountId,
      partnerOrganizationLinkId: link.id
    });
  }

  private async expireHostedSession(hostedSessionId: string): Promise<void> {
    const now = new Date().toISOString();
    const hostedSession =
      await this.release10Repositories.partnerHostedSessions.update(hostedSessionId, {
        status: "EXPIRED",
        updatedAt: now
      });
    const link =
      await this.release10Repositories.partnerOrganizationLinks.findById(
        hostedSession.partnerOrganizationLinkId
      );

    if (!link) {
      return;
    }

    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_HOSTED_SESSION_EXPIRED",
      actorUserId: link.actingUserId,
      entityId: hostedSession.id,
      entityType: "PARTNER_HOSTED_SESSION",
      id: randomUUID(),
      ipAddress: null,
      metadata: {
        type: hostedSession.type
      },
      occurredAt: now,
      organizationId: link.organizationId,
      userAgent: "hosted-session"
    });
    await this.partnerEventsService.emitEvent({
      eventType: "hosted.session.expired",
      hostedSessionId: hostedSession.id,
      organizationId: link.organizationId,
      partnerOrganizationLinkId: hostedSession.partnerOrganizationLinkId,
      payload: {
        hostedSessionId: hostedSession.id,
        type: hostedSession.type
      }
    });
  }
}
