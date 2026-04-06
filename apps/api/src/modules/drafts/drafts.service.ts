import { randomUUID } from "node:crypto";

import type {
  CounterpartyRecord,
  CounterpartyDealVersionAcceptanceRecord,
  DealVersionAcceptanceRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  EscrowAgreementRecord,
  FileRecord,
  FundingTransactionRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  Release1Repositories,
  Release4Repositories,
  TemplateRecord
} from "@blockchain-escrow/db";
import { hasMinimumOrganizationRole } from "@blockchain-escrow/security";
import {
  createCounterpartyDealVersionAcceptanceSchema,
  createDealVersionAcceptanceSchema,
  createDealVersionSchema,
  createDraftDealSchema,
  dealVersionAcceptanceParamsSchema,
  draftDealParamsSchema,
  organizationDraftDealsParamsSchema,
  updateDraftCounterpartyWalletSchema,
  type CreateDealVersionAcceptanceResponse,
  type CreateCounterpartyDealVersionAcceptanceResponse,
  type CreateDealVersionResponse,
  type CreateDraftDealResponse,
  type CounterpartyDealVersionAcceptanceChallenge,
  type CounterpartyDealVersionAcceptanceDetail,
  type DealVersionAcceptanceSummary,
  type DealVersionAcceptanceDetail,
  type DealVersionDetail,
  type DealVersionMilestoneSnapshot,
  type DealVersionPartySnapshot,
  type DealVersionSummary,
  type DraftDealDetailResponse,
  type DraftDealEscrowSummary,
  type DraftDealFundingProgressSummary,
  type DraftDealListItem,
  type DraftDealPartySummary,
  type DraftDealSummary,
  type FundingTransactionSummary,
  type FileSummary,
  type GetCounterpartyDealVersionAcceptanceResponse,
  type ListDealVersionAcceptancesResponse,
  type ListDraftDealsResponse,
  type UpdateDraftCounterpartyWalletResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  getAddress,
  verifyTypedData
} from "viem";

import {
  RELEASE1_REPOSITORIES,
  RELEASE4_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import {
  AuthenticatedSessionService,
  type AuthenticatedSessionContext
} from "../auth/authenticated-session.service";
import {
  buildCanonicalDealId,
  buildCanonicalDealVersionHash,
  buildCounterpartyAcceptanceTypedData,
  counterpartyAcceptancePrimaryType,
  counterpartyAcceptanceTypes,
  normalizeApiChainId
} from "./deal-identity";

function oppositeRole(role: DraftDealPartyRecord["role"]): DraftDealPartyRecord["role"] {
  return role === "BUYER" ? "SELLER" : "BUYER";
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

function toDealVersionAcceptanceSummary(
  acceptance: DealVersionAcceptanceRecord
): DealVersionAcceptanceSummary {
  return {
    acceptedAt: acceptance.acceptedAt,
    acceptedByUserId: acceptance.acceptedByUserId,
    dealVersionId: acceptance.dealVersionId,
    id: acceptance.id,
    organizationId: acceptance.organizationId,
    partyId: acceptance.dealVersionPartyId,
    scheme: acceptance.scheme,
    signature: acceptance.signature,
    signerWalletAddress: acceptance.signerWalletAddress,
    signerWalletId: acceptance.signerWalletId,
    typedData: acceptance.typedData
  };
}

function toCounterpartyDealVersionAcceptanceSummary(
  acceptance: CounterpartyDealVersionAcceptanceRecord
) {
  return {
    acceptedAt: acceptance.acceptedAt,
    dealVersionId: acceptance.dealVersionId,
    id: acceptance.id,
    partyId: acceptance.dealVersionPartyId,
    scheme: acceptance.scheme,
    signature: acceptance.signature,
    signerWalletAddress: acceptance.signerWalletAddress,
    typedData: acceptance.typedData
  };
}

interface DraftProjectionContext {
  agreements: EscrowAgreementRecord[];
  chainId: number;
  dealId: `0x${string}`;
  fundingTransactions: FundingTransactionRecord[];
  linkedAgreement: EscrowAgreementRecord | null;
}

@Injectable()
export class DraftsService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly repositories: Release1Repositories,
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
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
    const now = new Date().toISOString();
    const draftItems = await Promise.all(drafts.map((draft) => this.buildDraftListItem(draft, now)));

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
    const syncedDraft = (await this.syncDraftFundingState(draft.id, new Date().toISOString())) ?? draft;

    return this.buildDraftDetailResponse(syncedDraft);
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
      updatedAt: now,
      walletAddress: null
    });
    await this.repositories.draftDealParties.add({
      counterpartyId: counterparty.id,
      createdAt: now,
      draftDealId: draft.id,
      id: randomUUID(),
      organizationId: null,
      role: counterpartyRole,
      subjectType: "COUNTERPARTY",
      updatedAt: now,
      walletAddress: null
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

    const now = new Date().toISOString();
    await this.assertDraftIsMutable(draft, now);

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

    await this.syncDraftFundingState(draft.id, now);

    return {
      version: await this.buildDealVersionDetail(draft, version)
    };
  }

  async listVersionAcceptances(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListDealVersionAcceptancesResponse> {
    const parsed = dealVersionAcceptanceParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { version } = await this.requireDealVersionAccess(
      parsed.data.organizationId,
      parsed.data.draftDealId,
      parsed.data.dealVersionId,
      requestMetadata
    );

    return {
      acceptances: await this.buildAcceptanceDetails(version.id)
    };
  }

  async createVersionAcceptance(
    versionInput: unknown,
    acceptanceInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateDealVersionAcceptanceResponse> {
    const parsedVersion = dealVersionAcceptanceParamsSchema.safeParse(versionInput);
    const parsedAcceptance = createDealVersionAcceptanceSchema.safeParse(
      acceptanceInput
    );

    if (!parsedVersion.success) {
      throw new BadRequestException(parsedVersion.error.flatten());
    }

    if (!parsedAcceptance.success) {
      throw new BadRequestException(parsedAcceptance.error.flatten());
    }

    const authorized = await this.requireDealVersionAccess(
      parsedVersion.data.organizationId,
      parsedVersion.data.draftDealId,
      parsedVersion.data.dealVersionId,
      requestMetadata
    );
    const organizationParty = await this.requireOrganizationVersionParty(
      authorized.version.id,
      authorized.organization.id
    );
    const existing = await this.repositories.dealVersionAcceptances.findByDealVersionPartyId(
      organizationParty.id
    );

    if (existing) {
      throw new ConflictException("deal version acceptance already exists");
    }

    const now = new Date().toISOString();
    const acceptance = await this.repositories.dealVersionAcceptances.create({
      acceptedAt: now,
      acceptedByUserId: authorized.actor.user.id,
      dealVersionId: authorized.version.id,
      dealVersionPartyId: organizationParty.id,
      id: randomUUID(),
      organizationId: authorized.organization.id,
      scheme: parsedAcceptance.data.scheme,
      signature: parsedAcceptance.data.signature,
      signerWalletAddress: authorized.actor.wallet.address,
      signerWalletId: authorized.actor.wallet.id,
      typedData: parsedAcceptance.data.typedData
    });

    await this.repositories.auditLogs.append({
      action: "DEAL_VERSION_ACCEPTANCE_CREATED",
      actorUserId: authorized.actor.user.id,
      entityId: acceptance.id,
      entityType: "DEAL_VERSION_ACCEPTANCE",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        dealVersionId: acceptance.dealVersionId,
        dealVersionPartyId: acceptance.dealVersionPartyId,
        scheme: acceptance.scheme,
        signerWalletId: acceptance.signerWalletId
      },
      occurredAt: now,
      organizationId: authorized.organization.id,
      userAgent: requestMetadata.userAgent
    });

    await this.syncDraftFundingState(authorized.draft.id, now);

    return {
      acceptance: this.toAcceptanceDetail(acceptance, organizationParty)
    };
  }

  async getCounterpartyAcceptance(
    input: unknown
  ): Promise<GetCounterpartyDealVersionAcceptanceResponse> {
    const { counterpartyParty, typedData, versionCounterpartyParty } =
      await this.requireCounterpartyAcceptanceContext(input);
    const acceptance =
      await this.repositories.counterpartyDealVersionAcceptances.findByDealVersionPartyId(
        versionCounterpartyParty.id
      );

    return {
      acceptance: acceptance
        ? this.toCounterpartyAcceptanceDetail(
            acceptance,
            versionCounterpartyParty
          )
        : null,
      challenge: {
        expectedWalletAddress: counterpartyParty.walletAddress!,
        typedData
      }
    };
  }

  async createCounterpartyAcceptance(
    versionInput: unknown,
    acceptanceInput: unknown
  ): Promise<CreateCounterpartyDealVersionAcceptanceResponse> {
    const parsedAcceptance = createCounterpartyDealVersionAcceptanceSchema.safeParse(
      acceptanceInput
    );

    if (!parsedAcceptance.success) {
      throw new BadRequestException(parsedAcceptance.error.flatten());
    }

    const { counterpartyParty, draft, typedData, version, versionCounterpartyParty } =
      await this.requireCounterpartyAcceptanceContext(versionInput);
    const existing =
      await this.repositories.counterpartyDealVersionAcceptances.findByDealVersionPartyId(
        versionCounterpartyParty.id
      );

    if (existing) {
      throw new ConflictException("counterparty deal version acceptance already exists");
    }

    const isValid = await verifyTypedData({
      address: getAddress(counterpartyParty.walletAddress!),
      domain: typedData.domain as {
        chainId: number;
        name: string;
        version: string;
      },
      message: typedData.message as {
        dealId: `0x${string}`;
        dealVersionHash: `0x${string}`;
        dealVersionId: string;
        draftDealId: string;
        intent: string;
        organizationId: string;
      },
      primaryType: counterpartyAcceptancePrimaryType,
      signature: parsedAcceptance.data.signature as `0x${string}`,
      types: counterpartyAcceptanceTypes
    });

    if (!isValid) {
      throw new UnauthorizedException("invalid counterparty acceptance signature");
    }

    const now = new Date().toISOString();
    const acceptance =
      await this.repositories.counterpartyDealVersionAcceptances.create({
        acceptedAt: now,
        dealVersionId: version.id,
        dealVersionPartyId: versionCounterpartyParty.id,
        id: randomUUID(),
        scheme: "EIP712",
        signature: parsedAcceptance.data.signature,
        signerWalletAddress: counterpartyParty.walletAddress!,
        typedData
      });

    await this.repositories.auditLogs.append({
      action: "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE_CREATED",
      actorUserId: null,
      entityId: acceptance.id,
      entityType: "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE",
      id: randomUUID(),
      ipAddress: null,
      metadata: {
        dealVersionId: acceptance.dealVersionId,
        dealVersionPartyId: acceptance.dealVersionPartyId,
        signerWalletAddress: acceptance.signerWalletAddress
      },
      occurredAt: now,
      organizationId: draft.organizationId,
      userAgent: null
    });

    await this.syncDraftFundingState(draft.id, now);

    return {
      acceptance: this.toCounterpartyAcceptanceDetail(
        acceptance,
        versionCounterpartyParty
      )
    };
  }

  async updateCounterpartyWallet(
    draftInput: unknown,
    walletInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdateDraftCounterpartyWalletResponse> {
    const parsedDraft = draftDealParamsSchema.safeParse(draftInput);
    const parsedWallet = updateDraftCounterpartyWalletSchema.safeParse(walletInput);

    if (!parsedDraft.success) {
      throw new BadRequestException(parsedDraft.error.flatten());
    }

    if (!parsedWallet.success) {
      throw new BadRequestException(parsedWallet.error.flatten());
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

    await this.assertDraftIsMutable(draft, new Date().toISOString());

    const parties = await this.repositories.draftDealParties.listByDraftDealId(draft.id);
    const counterpartyParties = parties.filter(
      (party) => party.subjectType === "COUNTERPARTY"
    );

    if (counterpartyParties.length !== 1) {
      throw new ConflictException("draft deal must have exactly one counterparty party");
    }

    const counterpartyParty = counterpartyParties[0] as DraftDealPartyRecord;
    const now = new Date().toISOString();
    const updated = await this.repositories.draftDealParties.updateWalletAddress(
      counterpartyParty.id,
      parsedWallet.data.walletAddress.toLowerCase() as DraftDealPartyRecord["walletAddress"],
      now
    );

    if (!updated) {
      throw new NotFoundException("draft deal party not found");
    }

    await this.repositories.auditLogs.append({
      action: "DRAFT_DEAL_COUNTERPARTY_WALLET_UPDATED",
      actorUserId: authorized.actor.user.id,
      entityId: draft.id,
      entityType: "DRAFT_DEAL",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        draftDealPartyId: updated.id,
        walletAddress: updated.walletAddress
      },
      occurredAt: now,
      organizationId: draft.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      party: await this.toDraftPartySummary(updated)
    };
  }

  private async buildDraftListItem(
    draft: DraftDealRecord,
    syncedAt: string
  ): Promise<DraftDealListItem> {
    const syncedDraft = (await this.syncDraftFundingState(draft.id, syncedAt)) ?? draft;
    const projectionContext = await this.buildDraftProjectionContext(syncedDraft);
    const [parties, latestVersion] = await Promise.all([
      this.buildDraftPartySummaries(syncedDraft.id),
      this.repositories.dealVersions.findLatestByDraftDealId(syncedDraft.id)
    ]);

    return {
      draft: this.toDraftSummary(syncedDraft, projectionContext),
      latestVersion: latestVersion ? toDealVersionSummary(latestVersion) : null,
      parties
    };
  }

  private async buildDraftDetailResponse(
    draft: DraftDealRecord
  ): Promise<DraftDealDetailResponse> {
    const syncedDraft =
      (await this.syncDraftFundingState(draft.id, new Date().toISOString())) ?? draft;
    const projectionContext = await this.buildDraftProjectionContext(syncedDraft);
    const [parties, versions] = await Promise.all([
      this.buildDraftPartySummaries(syncedDraft.id),
      this.repositories.dealVersions.listByDraftDealId(syncedDraft.id)
    ]);

    return {
      draft: this.toDraftSummary(syncedDraft, projectionContext),
      parties,
      versions: await Promise.all(
        versions.map((version) =>
          this.buildDealVersionDetail(syncedDraft, version, projectionContext)
        )
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
      updatedAt: party.updatedAt,
      walletAddress: party.walletAddress
    };
  }

  private async buildDealVersionDetail(
    draft: DraftDealRecord,
    version: DealVersionRecord,
    projectionContext?: DraftProjectionContext
  ): Promise<DealVersionDetail> {
    const [partySnapshots, milestoneSnapshots, fileLinks] = await Promise.all([
      this.repositories.dealVersionParties.listByDealVersionId(version.id),
      this.repositories.dealVersionMilestones.listByDealVersionId(version.id),
      this.repositories.dealVersionFiles.listByDealVersionId(version.id)
    ]);
    const filesForHash = await Promise.all(
      fileLinks.map(async (link) => {
        const file = await this.repositories.files.findById(link.fileId);

        if (!file) {
          throw new NotFoundException("linked file not found");
        }

        return file;
      })
    );
    const files = filesForHash.map(toFileSummary);
    const draftContext =
      projectionContext ?? (await this.buildDraftProjectionContext(draft));
    const versionFundingTransactions = draftContext.fundingTransactions.filter(
      (transaction) => transaction.dealVersionId === version.id
    );
    const dealVersionHash = buildCanonicalDealVersionHash(
      draft,
      version,
      partySnapshots,
      milestoneSnapshots,
      filesForHash
    );

    return {
      ...toDealVersionSummary(version),
      bodyMarkdown: version.bodyMarkdown,
      files,
      fundingTransactions: versionFundingTransactions.map((transaction) =>
        this.toFundingTransactionSummary(
          transaction,
          draftContext.dealId,
          dealVersionHash,
          draftContext.agreements
        )
      ),
      milestones: milestoneSnapshots.map((milestone) =>
        this.toMilestoneSnapshot(milestone)
      ),
      parties: partySnapshots.map((party) => this.toVersionPartySnapshot(party))
    };
  }

  private async buildAcceptanceDetails(
    dealVersionId: string
  ): Promise<DealVersionAcceptanceDetail[]> {
    const [acceptances, parties] = await Promise.all([
      this.repositories.dealVersionAcceptances.listByDealVersionId(dealVersionId),
      this.repositories.dealVersionParties.listByDealVersionId(dealVersionId)
    ]);
    const partiesById = new Map(parties.map((party) => [party.id, party]));

    return acceptances.map((acceptance) => {
      const party = partiesById.get(acceptance.dealVersionPartyId);

      if (!party) {
        throw new NotFoundException("deal version party not found");
      }

      return this.toAcceptanceDetail(acceptance, party);
    });
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

  private toAcceptanceDetail(
    acceptance: DealVersionAcceptanceRecord,
    party: DealVersionPartyRecord
  ): DealVersionAcceptanceDetail {
    return {
      ...toDealVersionAcceptanceSummary(acceptance),
      party: this.toVersionPartySnapshot(party)
    };
  }

  private toCounterpartyAcceptanceDetail(
    acceptance: CounterpartyDealVersionAcceptanceRecord,
    party: DealVersionPartyRecord
  ): CounterpartyDealVersionAcceptanceDetail {
    return {
      ...toCounterpartyDealVersionAcceptanceSummary(acceptance),
      party: this.toVersionPartySnapshot(party)
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

  private async buildDraftProjectionContext(
    draft: DraftDealRecord
  ): Promise<DraftProjectionContext> {
    const chainId = normalizeApiChainId();
    const dealId = buildCanonicalDealId(draft.organizationId, draft.id);
    const agreements = await this.release4Repositories.escrowAgreements.listByChainId(
      chainId
    );

    return {
      agreements,
      chainId,
      dealId,
      fundingTransactions: await this.repositories.fundingTransactions.listByDraftDealId(
        draft.id
      ),
      linkedAgreement: agreements.find((agreement) => agreement.dealId === dealId) ?? null
    };
  }

  private toDraftSummary(
    draft: DraftDealRecord,
    projectionContext: DraftProjectionContext
  ): DraftDealSummary {
    return {
      createdAt: draft.createdAt,
      createdByUserId: draft.createdByUserId,
      escrow: this.toDraftEscrowSummary(projectionContext),
      funding: this.toDraftFundingProgressSummary(projectionContext),
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

  private toDraftEscrowSummary(
    projectionContext: DraftProjectionContext
  ): DraftDealEscrowSummary | null {
    const linkedAgreement = projectionContext.linkedAgreement;

    if (!linkedAgreement) {
      return null;
    }

    return {
      agreementAddress: linkedAgreement.agreementAddress,
      chainId: projectionContext.chainId,
      createdAt: linkedAgreement.initializedTimestamp,
      dealId: linkedAgreement.dealId,
      dealVersionHash: linkedAgreement.dealVersionHash
    };
  }

  private toDraftFundingProgressSummary(
    projectionContext: DraftProjectionContext
  ): DraftDealFundingProgressSummary {
    const latestTransaction = projectionContext.fundingTransactions[0] ?? null;

    return {
      latestStatus: latestTransaction
        ? this.toDraftLevelFundingTransactionStatus(
            latestTransaction,
            projectionContext.dealId,
            projectionContext.agreements
          )
        : null,
      latestSubmittedAt: latestTransaction?.submittedAt ?? null,
      trackedTransactionCount: projectionContext.fundingTransactions.length
    };
  }

  private toDraftLevelFundingTransactionStatus(
    transaction: FundingTransactionRecord,
    dealId: `0x${string}`,
    agreements: readonly EscrowAgreementRecord[]
  ): FundingTransactionSummary["status"] {
    const observedAgreement = agreements.find(
      (agreement) => agreement.createdTransactionHash === transaction.transactionHash
    );

    if (!observedAgreement) {
      return "PENDING";
    }

    return observedAgreement.dealId === dealId ? "CONFIRMED" : "MISMATCHED";
  }

  private toFundingTransactionSummary(
    transaction: FundingTransactionRecord,
    dealId: `0x${string}`,
    dealVersionHash: `0x${string}`,
    agreements: readonly EscrowAgreementRecord[]
  ): FundingTransactionSummary {
    const observedAgreement = agreements.find(
      (agreement) => agreement.createdTransactionHash === transaction.transactionHash
    );

    if (!observedAgreement) {
      return {
        agreementAddress: null,
        chainId: transaction.chainId,
        confirmedAt: null,
        dealVersionId: transaction.dealVersionId,
        draftDealId: transaction.draftDealId,
        id: transaction.id,
        matchesTrackedVersion: null,
        organizationId: transaction.organizationId,
        status: "PENDING",
        submittedAt: transaction.submittedAt,
        submittedByUserId: transaction.submittedByUserId,
        submittedWalletAddress: transaction.submittedWalletAddress,
        transactionHash: transaction.transactionHash
      };
    }

    if (observedAgreement.dealId !== dealId) {
      return {
        agreementAddress: null,
        chainId: transaction.chainId,
        confirmedAt: null,
        dealVersionId: transaction.dealVersionId,
        draftDealId: transaction.draftDealId,
        id: transaction.id,
        matchesTrackedVersion: false,
        organizationId: transaction.organizationId,
        status: "MISMATCHED",
        submittedAt: transaction.submittedAt,
        submittedByUserId: transaction.submittedByUserId,
        submittedWalletAddress: transaction.submittedWalletAddress,
        transactionHash: transaction.transactionHash
      };
    }

    return {
      agreementAddress: observedAgreement.agreementAddress,
      chainId: transaction.chainId,
      confirmedAt: observedAgreement.updatedAt,
      dealVersionId: transaction.dealVersionId,
      draftDealId: transaction.draftDealId,
      id: transaction.id,
      matchesTrackedVersion: observedAgreement.dealVersionHash === dealVersionHash,
      organizationId: transaction.organizationId,
      status: "CONFIRMED",
      submittedAt: transaction.submittedAt,
      submittedByUserId: transaction.submittedByUserId,
      submittedWalletAddress: transaction.submittedWalletAddress,
      transactionHash: transaction.transactionHash
    };
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

  private async requireCounterpartyAcceptanceContext(input: unknown): Promise<{
    counterpartyParty: DraftDealPartyRecord;
    draft: DraftDealRecord;
    typedData: CounterpartyDealVersionAcceptanceChallenge["typedData"];
    version: DealVersionRecord;
    versionCounterpartyParty: DealVersionPartyRecord;
  }> {
    const parsed = dealVersionAcceptanceParamsSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const draft = await this.repositories.draftDeals.findById(parsed.data.draftDealId);
    const version = await this.repositories.dealVersions.findById(parsed.data.dealVersionId);

    if (!draft || draft.organizationId !== parsed.data.organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    if (
      !version ||
      version.organizationId !== parsed.data.organizationId ||
      version.draftDealId !== draft.id
    ) {
      throw new NotFoundException("deal version not found");
    }

    const [draftParties, versionParties, fileLinks, milestones] = await Promise.all([
      this.repositories.draftDealParties.listByDraftDealId(draft.id),
      this.repositories.dealVersionParties.listByDealVersionId(version.id),
      this.repositories.dealVersionFiles.listByDealVersionId(version.id),
      this.repositories.dealVersionMilestones.listByDealVersionId(version.id)
    ]);
    const files = await Promise.all(
      fileLinks.map(async (link) => {
        const file = await this.repositories.files.findById(link.fileId);

        if (!file) {
          throw new NotFoundException("linked file not found");
        }

        return file;
      })
    );

    const counterpartyParties = draftParties.filter(
      (party) => party.subjectType === "COUNTERPARTY"
    );
    if (counterpartyParties.length !== 1) {
      throw new ConflictException("draft deal must have exactly one counterparty party");
    }

    const versionCounterpartyParties = versionParties.filter(
      (party) => party.subjectType === "COUNTERPARTY"
    );
    if (versionCounterpartyParties.length !== 1) {
      throw new ConflictException(
        "deal version must have exactly one counterparty-side party"
      );
    }

    const counterpartyParty = counterpartyParties[0] as DraftDealPartyRecord;
    const versionCounterpartyParty = versionCounterpartyParties[0] as DealVersionPartyRecord;

    if (!counterpartyParty.walletAddress) {
      throw new ConflictException("counterparty wallet address is required");
    }

    const dealId = buildCanonicalDealId(draft.organizationId, draft.id);
    const dealVersionHash = buildCanonicalDealVersionHash(
      draft,
      version,
      versionParties,
      milestones,
      files
    );

    return {
      counterpartyParty,
      draft,
      typedData: buildCounterpartyAcceptanceTypedData(
        draft,
        version,
        dealId,
        dealVersionHash
      ),
      version,
      versionCounterpartyParty
    };
  }

  private async requireDealVersionAccess(
    organizationId: string,
    draftDealId: string,
    dealVersionId: string,
    requestMetadata: RequestMetadata
  ): Promise<{
    actor: AuthenticatedSessionContext;
    draft: DraftDealRecord;
    membership: OrganizationMemberRecord;
    organization: OrganizationRecord;
    version: DealVersionRecord;
  }> {
    const authorized = await this.requireOrganizationAccess(
      organizationId,
      requestMetadata
    );
    const [draft, version] = await Promise.all([
      this.repositories.draftDeals.findById(draftDealId),
      this.repositories.dealVersions.findById(dealVersionId)
    ]);

    if (!draft || draft.organizationId !== organizationId) {
      throw new NotFoundException("draft deal not found");
    }

    if (
      !version ||
      version.organizationId !== organizationId ||
      version.draftDealId !== draft.id
    ) {
      throw new NotFoundException("deal version not found");
    }

    return {
      actor: authorized.actor,
      draft,
      membership: authorized.membership,
      organization: authorized.organization,
      version
    };
  }

  private async requireOrganizationVersionParty(
    dealVersionId: string,
    organizationId: string
  ): Promise<DealVersionPartyRecord> {
    const parties = await this.repositories.dealVersionParties.listByDealVersionId(
      dealVersionId
    );
    const matchingParties = parties.filter(
      (party) =>
        party.subjectType === "ORGANIZATION" &&
        party.organizationId === organizationId
    );

    if (matchingParties.length !== 1) {
      throw new ConflictException(
        "deal version must have exactly one organization-side party"
      );
    }

    return matchingParties[0] as DealVersionPartyRecord;
  }

  private async syncDraftFundingState(
    draftDealId: string,
    updatedAt: string
  ): Promise<DraftDealRecord | null> {
    const draft = await this.repositories.draftDeals.findById(draftDealId);

    if (!draft) {
      return null;
    }

    const linkedAgreement = await this.findLinkedAgreementForDraft(draft);

    if (linkedAgreement) {
      if (draft.state === "ACTIVE") {
        return draft;
      }

      return this.repositories.draftDeals.updateState(draft.id, "ACTIVE", updatedAt);
    }

    if (draft.state === "ACTIVE") {
      return draft;
    }

    const latestVersion = await this.repositories.dealVersions.findLatestByDraftDealId(draftDealId);

    if (!latestVersion) {
      return draft;
    }

    const parties = await this.repositories.dealVersionParties.listByDealVersionId(
      latestVersion.id
    );
    const organizationParty = parties.find(
      (party) =>
        party.subjectType === "ORGANIZATION" &&
        party.organizationId === draft.organizationId
    );
    const counterpartyParty = parties.find(
      (party) => party.subjectType === "COUNTERPARTY"
    );

    const [organizationAcceptance, counterpartyAcceptance] = await Promise.all([
      organizationParty
        ? this.repositories.dealVersionAcceptances.findByDealVersionPartyId(
            organizationParty.id
          )
        : Promise.resolve(null),
      counterpartyParty
        ? this.repositories.counterpartyDealVersionAcceptances.findByDealVersionPartyId(
            counterpartyParty.id
          )
        : Promise.resolve(null)
    ]);

    const desiredState =
      organizationAcceptance && counterpartyAcceptance
        ? "AWAITING_FUNDING"
        : "DRAFT";

    if (draft.state !== desiredState) {
      return this.repositories.draftDeals.updateState(draft.id, desiredState, updatedAt);
    }

    return draft;
  }

  private async assertDraftIsMutable(
    draft: DraftDealRecord,
    updatedAt: string
  ): Promise<void> {
    const linkedAgreement = await this.findLinkedAgreementForDraft(draft);

    if (linkedAgreement || draft.state === "ACTIVE") {
      if (linkedAgreement && draft.state !== "ACTIVE") {
        await this.repositories.draftDeals.updateState(draft.id, "ACTIVE", updatedAt);
      }

      throw new ConflictException("draft deal is already active onchain");
    }

    const fundingTransactions =
      await this.repositories.fundingTransactions.listByDraftDealId(draft.id);

    if (fundingTransactions.length > 0) {
      throw new ConflictException("draft deal funding is already in progress");
    }
  }

  private async findLinkedAgreementForDraft(
    draft: DraftDealRecord
  ): Promise<EscrowAgreementRecord | null> {
    const chainId = normalizeApiChainId();
    const dealId = buildCanonicalDealId(draft.organizationId, draft.id);
    const agreements = await this.release4Repositories.escrowAgreements.listByChainId(
      chainId
    );

    return agreements.find((agreement) => agreement.dealId === dealId) ?? null;
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
