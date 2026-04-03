import { randomUUID } from "node:crypto";

import type {
  CounterpartyRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  FileRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  TemplateRecord
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createDealVersionSchema,
  createDraftDealSchema,
  draftDealParamsSchema,
  organizationDraftDealsParamsSchema,
  type CreateDealVersionResponse,
  type CreateDraftDealResponse,
  type DealVersionDetail,
  type DealVersionMilestoneSnapshot,
  type DealVersionPartySnapshot,
  type DealVersionSummary,
  type DraftDealDetailResponse,
  type DraftDealListItem,
  type DraftDealPartySummary,
  type DraftDealSummary,
  type FileSummary,
  type ListDraftDealsResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";

import { RELEASE1_REPOSITORIES } from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";

function oppositeRole(role: DraftDealPartyRecord["role"]): DraftDealPartyRecord["role"] {
  return role === "BUYER" ? "SELLER" : "BUYER";
}

function toDraftSummary(draft: DraftDealRecord): DraftDealSummary {
  return {
    createdAt: draft.createdAt,
    createdByUserId: draft.createdByUserId,
    id: draft.id,
    organizationId: draft.organizationId,
    settlementCurrency: draft.settlementCurrency,
    state: draft.state,
    summary: draft.summary,
    templateId: draft.templateId,
    title: draft.title,
    updatedAt: draft.updatedAt
  };
}

function toDealVersionSummary(version: DealVersionRecord): DealVersionSummary {
  return {
    createdAt: version.createdAt,
    createdByUserId: version.createdByUserId,
    draftDealId: version.draftDealId,
    id: version.id,
    organizationId: version.organizationId,
    settlementCurrency: version.settlementCurrency,
    summary: version.summary,
    templateId: version.templateId,
    title: version.title,
    versionNumber: version.versionNumber
  };
}

function toFileSummary(file: FileRecord): FileSummary {
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
export class DraftsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService
  ) {}

  async listDrafts(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDraftDealsResponse> {
    const parsed = organizationDraftDealsParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await this.requireOrganizationAccess(parsed.data.organizationId, requestMetadata);
    const drafts = await this.repositories.draftDeals.listByOrganizationId(
      parsed.data.organizationId
    );
    const draftItems = await Promise.all(
      drafts.map((draft) => this.buildDraftListItem(draft))
    );

    return {
      drafts: draftItems
    };
  }

  async getDraft(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<DraftDealDetailResponse> {
    const parsed = draftDealParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const draft = await this.requireDraftAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      requestMetadata
    );

    return this.buildDraftDetailResponse(draft);
  }

  async createDraft(
    organizationId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDraftDealResponse> {
    const parsed = createDraftDealSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata,
      "ADMIN"
    );
    const counterparty = await this.requireCounterpartyInOrganization(
      organizationId,
      parsed.data.counterpartyId
    );
    const template = parsed.data.templateId
      ? await this.requireTemplateInOrganization(organizationId, parsed.data.templateId)
      : null;

    const now = new Date().toISOString();
    const draft = await this.repositories.draftDeals.create({
      createdAt: now,
      createdByUserId: authorized.actor.user.id,
      id: randomUUID(),
      organizationId,
      settlementCurrency: parsed.data.settlementCurrency,
      state: "DRAFT",
      summary: parsed.data.summary ?? null,
      templateId: template?.id ?? null,
      title: parsed.data.title,
      updatedAt: now
    });

    const organizationPartyRole = parsed.data.organizationRole;
    const counterpartyRole = oppositeRole(parsed.data.organizationRole);

    await this.repositories.draftDealParties.add({
      counterpartyId: null,
      createdAt: now,
      draftDealId: draft.id,
      id: randomUUID(),
      organizationId,
      role: organizationPartyRole,
      subjectType: "ORGANIZATION",
      updatedAt: now
    });
    await this.repositories.draftDealParties.add({
      counterpartyId: counterparty.id,
      createdAt: now,
      draftDealId: draft.id,
      id: randomUUID(),
      organizationId: null,
      role: counterpartyRole,
      subjectType: "COUNTERPARTY",
      updatedAt: now
    });

    await this.repositories.auditLogs.append({
      action: "DRAFT_DEAL_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: draft.id,
      entityType: "DRAFT_DEAL",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        counterpartyId: counterparty.id,
        settlementCurrency: draft.settlementCurrency,
        templateId: draft.templateId
      },
      occurredAt: now,
      organizationId,
      userAgent: requestMetadata.userAgent
    });

    return this.buildDraftDetailResponse(draft);
  }

  async createVersionSnapshot(
    draftInput: unknown,
    versionInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealVersionResponse> {
    const parsedDraft = draftDealParamsSchema.safeParse(draftInput);
    const parsedVersion = createDealVersionSchema.safeParse(versionInput);

    if (!parsedDraft.success) {
      throw new BadRequestException(parsedDraft.error.flatten());
    }

    if (!parsedVersion.success) {
      throw new BadRequestException(parsedVersion.error.flatten());
    }

    const authorized = await this.requireOrganizationAccess(
      parsedDraft.data.organizationId,
      requestMetadata,
      "ADMIN"
    );
    const draft = await this.repositories.draftDeals.findById(parsedDraft.data.draftDealId);

    if (!draft || draft.organizationId !== parsedDraft.data.organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    const duplicateFiles = parsedVersion.data.attachmentFileIds
      ? new Set(parsedVersion.data.attachmentFileIds).size !==
        parsedVersion.data.attachmentFileIds.length
      : false;

    if (duplicateFiles) {
      throw new BadRequestException("attachment file ids must be unique");
    }

    const templateId = parsedVersion.data.templateId ?? draft.templateId;
    const template = templateId
      ? await this.requireTemplateInOrganization(draft.organizationId, templateId)
      : null;
    const files = parsedVersion.data.attachmentFileIds
      ? await this.requireFilesInOrganization(
          draft.organizationId,
          parsedVersion.data.attachmentFileIds
        )
      : [];
    const draftParties = await this.repositories.draftDealParties.listByDraftDealId(draft.id);

    if (draftParties.length !== 2) {
      throw new ConflictException("draft deal must have exactly two parties");
    }

    const latestVersion = await this.repositories.dealVersions.findLatestByDraftDealId(
      draft.id
    );
    const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
    const now = new Date().toISOString();
    const version = await this.repositories.dealVersions.create({
      bodyMarkdown: parsedVersion.data.bodyMarkdown,
      createdAt: now,
      createdByUserId: authorized.actor.user.id,
      draftDealId: draft.id,
      id: randomUUID(),
      organizationId: draft.organizationId,
      settlementCurrency: draft.settlementCurrency,
      summary: parsedVersion.data.summary ?? draft.summary,
      templateId: template?.id ?? null,
      title: parsedVersion.data.title ?? draft.title,
      versionNumber
    });

    for (const party of draftParties) {
      await this.repositories.dealVersionParties.add(
        await this.buildVersionPartySnapshot(version.id, party, now)
      );
    }

    for (const [index, milestone] of parsedVersion.data.milestoneSnapshots.entries()) {
      await this.repositories.dealVersionMilestones.add({
        amountMinor: milestone.amountMinor,
        createdAt: now,
        dealVersionId: version.id,
        description: milestone.description ?? null,
        dueAt: milestone.dueAt ?? null,
        id: randomUUID(),
        position: index + 1,
        title: milestone.title
      });
    }

    for (const file of files) {
      await this.repositories.dealVersionFiles.add({
        createdAt: now,
        dealVersionId: version.id,
        fileId: file.id,
        id: randomUUID()
      });
    }

    await this.repositories.auditLogs.append({
      action: "DEAL_VERSION_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: version.id,
      entityType: "DEAL_VERSION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        draftDealId: draft.id,
        fileCount: files.length,
        templateId: version.templateId,
        versionNumber
      },
      occurredAt: now,
      organizationId: draft.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      version: await this.buildDealVersionDetail(version)
    };
  }

  private async buildDraftListItem(draft: DraftDealRecord): Promise<DraftDealListItem> {
    const [parties, latestVersion] = await Promise.all([
      this.buildDraftPartySummaries(draft.id),
      this.repositories.dealVersions.findLatestByDraftDealId(draft.id)
    ]);

    return {
      draft: toDraftSummary(draft),
      latestVersion: latestVersion ? toDealVersionSummary(latestVersion) : null,
      parties
    };
  }

  private async buildDraftDetailResponse(
    draft: DraftDealRecord
  ): Promise<DraftDealDetailResponse> {
    const [parties, versions] = await Promise.all([
      this.buildDraftPartySummaries(draft.id),
      this.repositories.dealVersions.listByDraftDealId(draft.id)
    ]);

    return {
      draft: toDraftSummary(draft),
      parties,
      versions: await Promise.all(
        versions.map((version) => this.buildDealVersionDetail(version))
      )
    };
  }

  private async buildDraftPartySummaries(
    draftDealId: string
  ): Promise<DraftDealPartySummary[]> {
    const parties = await this.repositories.draftDealParties.listByDraftDealId(draftDealId);

    return Promise.all(parties.map((party) => this.toDraftPartySummary(party)));
  }

  private async toDraftPartySummary(
    party: DraftDealPartyRecord
  ): Promise<DraftDealPartySummary> {
    return {
      counterpartyId: party.counterpartyId,
      createdAt: party.createdAt,
      displayName: await this.resolvePartyDisplayName(party),
      draftDealId: party.draftDealId,
      id: party.id,
      organizationId: party.organizationId,
      role: party.role,
      subjectType: party.subjectType,
      updatedAt: party.updatedAt
    };
  }

  private async buildDealVersionDetail(
    version: DealVersionRecord
  ): Promise<DealVersionDetail> {
    const [partySnapshots, milestoneSnapshots, fileLinks] = await Promise.all([
      this.repositories.dealVersionParties.listByDealVersionId(version.id),
      this.repositories.dealVersionMilestones.listByDealVersionId(version.id),
      this.repositories.dealVersionFiles.listByDealVersionId(version.id)
    ]);
    const files = await Promise.all(
      fileLinks.map(async (link) => {
        const file = await this.repositories.files.findById(link.fileId);

        if (!file) {
          throw new NotFoundException("linked file not found");
        }

        return toFileSummary(file);
      })
    );

    return {
      ...toDealVersionSummary(version),
      bodyMarkdown: version.bodyMarkdown,
      files,
      milestones: milestoneSnapshots.map((milestone) =>
        this.toMilestoneSnapshot(milestone)
      ),
      parties: partySnapshots.map((party) => this.toVersionPartySnapshot(party))
    };
  }

  private toVersionPartySnapshot(
    party: DealVersionPartyRecord
  ): DealVersionPartySnapshot {
    return {
      counterpartyId: party.counterpartyId,
      createdAt: party.createdAt,
      displayName: party.displayName,
      id: party.id,
      organizationId: party.organizationId,
      role: party.role,
      subjectType: party.subjectType
    };
  }

  private toMilestoneSnapshot(
    milestone: DealVersionMilestoneRecord
  ): DealVersionMilestoneSnapshot {
    return {
      amountMinor: milestone.amountMinor,
      description: milestone.description,
      dueAt: milestone.dueAt,
      id: milestone.id,
      position: milestone.position,
      title: milestone.title
    };
  }

  private async buildVersionPartySnapshot(
    dealVersionId: string,
    draftParty: DraftDealPartyRecord,
    createdAt: string
  ): Promise<DealVersionPartyRecord> {
    return {
      counterpartyId: draftParty.counterpartyId,
      createdAt,
      dealVersionId,
      displayName: await this.resolvePartyDisplayName(draftParty),
      id: randomUUID(),
      organizationId: draftParty.organizationId,
      role: draftParty.role,
      subjectType: draftParty.subjectType
    };
  }

  private async resolvePartyDisplayName(
    party: Pick<
      DraftDealPartyRecord,
      "counterpartyId" | "organizationId" | "subjectType"
    >
  ): Promise<string> {
    if (party.subjectType === "ORGANIZATION") {
      const organization = await this.repositories.organizations.findById(
        party.organizationId ?? ""
      );

      if (!organization) {
        throw new NotFoundException("organization not found");
      }

      return organization.name;
    }

    const counterparty = await this.repositories.counterparties.findById(
      party.counterpartyId ?? ""
    );

    if (!counterparty) {
      throw new NotFoundException("counterparty not found");
    }

    return counterparty.name;
  }

  private async requireCounterpartyInOrganization(
    organizationId: string,
    counterpartyId: string
  ): Promise<CounterpartyRecord> {
    const counterparty = await this.repositories.counterparties.findById(counterpartyId);

    if (!counterparty || counterparty.organizationId !== organizationId) {
      throw new NotFoundException("counterparty not found");
    }

    return counterparty;
  }

  private async requireTemplateInOrganization(
    organizationId: string,
    templateId: string
  ): Promise<TemplateRecord> {
    const template = await this.repositories.templates.findById(templateId);

    if (!template || template.organizationId !== organizationId) {
      throw new NotFoundException("template not found");
    }

    return template;
  }

  private async requireFilesInOrganization(
    organizationId: string,
    fileIds: string[]
  ): Promise<FileRecord[]> {
    const files = await Promise.all(
      fileIds.map((fileId) => this.repositories.files.findById(fileId))
    );
    const resolvedFiles: FileRecord[] = [];

    for (const file of files) {
      if (!file || file.organizationId !== organizationId) {
        throw new NotFoundException("file not found");
      }

      resolvedFiles.push(file);
    }

    return resolvedFiles;
  }

  private async requireDraftAccess(
    organizationId: string,
    draftDealId: string,
    requestMetadata: RequestMetadata
  ): Promise<DraftDealRecord> {
    await this.requireOrganizationAccess(organizationId, requestMetadata);
    const draft = await this.repositories.draftDeals.findById(draftDealId);

    if (!draft || draft.organizationId !== organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    return draft;
  }

  private async requireOrganizationAccess(
    organizationId: string,
    requestMetadata: RequestMetadata,
    minimumRole?: "OWNER" | "ADMIN" | "MEMBER"
  ): Promise<{
    actor: AuthenticatedSessionContext;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
  }> {
    const actor = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const [organization, membership] = await Promise.all([
      this.repositories.organizations.findById(organizationId),
      this.repositories.organizationMembers.findMembership(
        organizationId,
        actor.user.id
      )
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }

    if (!membership) {
      throw new ForbiddenException("organization access is required");
    }

    if (minimumRole && !hasMinimumOrganizationRole(membership.role, minimumRole)) {
      throw new ForbiddenException("organization role is insufficient");
    }

    return {
      actor,
      membership,
      organization
    };
  }
}
