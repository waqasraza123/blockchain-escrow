import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  contractArtifacts,
  deploymentSupportsCreateAndFund,
  getDeploymentManifestByChainId
} from "@blockchain-escrow/contracts-sdk";
import type { DeploymentManifest } from "@blockchain-escrow/contracts-sdk";
import type {
  ComplianceCaseRecord,
  ComplianceCheckpointRecord,
  FeeVaultStateRecord,
  GasPolicyRecord,
  OperatorAccountRecord,
  OperatorAlertRecord,
  ProtocolConfigStateRecord,
  Release1Repositories,
  Release12Repositories,
  Release4Repositories,
  Release10Repositories,
  Release8Repositories,
  SponsoredTransactionRequestRecord,
  WalletRecord,
  DraftDealRecord
} from "@blockchain-escrow/db";
import {
  acknowledgeOperatorAlertSchema,
  addComplianceCaseNoteSchema,
  assignTenantBillingPlanSchema,
  assignComplianceCaseSchema,
  buildFundingTransactionObservation,
  buildSettlementExecutionTransactionObservation,
  billingPlanParamsSchema,
  createBillingFeeScheduleSchema,
  createBillingPlanSchema,
  complianceCaseParamsSchema,
  complianceCheckpointParamsSchema,
  createPartnerAccountSchema,
  createPartnerApiKeySchema,
  createPartnerOrganizationLinkSchema,
  createPartnerWebhookSubscriptionSchema,
  createComplianceCaseSchema,
  createComplianceCheckpointSchema,
  createProtocolProposalDraftSchema,
  createTenantDomainSchema,
  decideSponsoredTransactionRequestSchema,
  decideComplianceCheckpointSchema,
  invoiceParamsSchema,
  invoiceActionSchema,
  listComplianceCasesParamsSchema,
  listOperatorAlertsParamsSchema,
  listOperatorSponsoredTransactionRequestsParamsSchema,
  operatorAlertActionParamsSchema,
  operatorSponsoredTransactionRequestParamsSchema,
  operatorSearchParamsSchema,
  partnerAccountParamsSchema,
  partnerApiKeyParamsSchema,
  partnerWebhookSubscriptionParamsSchema,
  registerPartnerBrandAssetSchema,
  protocolProposalDraftParamsSchema,
  resolveOperatorAlertSchema,
  resolveFundingTransactionStalePendingState,
  resolveFundingTransactionState,
  resolveSettlementExecutionTransactionStalePendingState,
  resolveSettlementExecutionTransactionState,
  revokePartnerApiKeySchema,
  rotatePartnerApiKeySchema,
  tenantDomainParamsSchema,
  tenantSettingsSchema,
  updateComplianceCaseStatusSchema,
  updateBillingPlanSchema,
  updatePartnerWebhookSubscriptionSchema
} from "@blockchain-escrow/shared";
import type {
  AssignTenantBillingPlanResponse,
  CreateBillingFeeScheduleResponse,
  CreateBillingPlanResponse,
  ComplianceCaseDetailResponse,
  ComplianceCaseSummary,
  ComplianceCheckpointSummary,
  CreatePartnerAccountResponse,
  CreatePartnerApiKeyResponse,
  CreatePartnerOrganizationLinkResponse,
  CreatePartnerWebhookSubscriptionResponse,
  CreateProtocolProposalDraftInput,
  CreateTenantDomainResponse,
  InvoiceDetailResponse,
  JsonObject,
  ListBillingPlansResponse,
  ListBillingFeeSchedulesResponse,
  ListComplianceCasesResponse,
  ListComplianceCheckpointsResponse,
  ListOperatorDeploymentsResponse,
  ListOperatorFundingTransactionsResponse,
  ListOperatorTreasuryMovementsResponse,
  ListInvoicesResponse,
  ListOperatorAlertsResponse,
  ListOperatorSponsoredTransactionRequestsResponse,
  ListPartnerAccountsResponse,
  ListProtocolProposalDraftsResponse,
  ListOperatorSettlementExecutionsResponse,
  ListTenantDomainsResponse,
  OperatorDashboardCard,
  OperatorDashboardResponse,
  OperatorHealthResponse,
  OperatorPermissionSet,
  OperatorReconciliationResponse,
  OperatorSearchHit,
  OperatorSearchResponse,
  OperatorSessionResponse,
  OperatorSubjectSummary,
  PartnerAccountDetailResponse,
  ProtocolProposalAction,
  ProtocolProposalDraftDetailResponse,
  ProtocolProposalDraftSummary,
  ProtocolProposalTarget,
  RegisterPartnerBrandAssetResponse,
  RemoteServiceHealth,
  RevokePartnerApiKeyResponse,
  RotatePartnerApiKeyResponse,
  RotatePartnerWebhookSubscriptionSecretResponse,
  TenantBillingOverviewResponse,
  UpdateBillingPlanResponse,
  UpdateInvoiceStatusResponse,
  UpdatePartnerWebhookSubscriptionResponse
} from "@blockchain-escrow/shared";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { encodeFunctionData, type Abi } from "viem";

import { buildCanonicalDealId } from "../drafts/deal-identity";
import {
  RELEASE1_REPOSITORIES,
  RELEASE4_REPOSITORIES,
  RELEASE10_REPOSITORIES,
  RELEASE12_REPOSITORIES,
  RELEASE8_REPOSITORIES
} from "../../infrastructure/tokens";
import type { RequestMetadata } from "../auth/auth.http";
import { AuthenticatedSessionService } from "../auth/authenticated-session.service";
import { TenantService } from "../tenant/tenant.service";
import {
  OPERATOR_CONFIGURATION,
  type OperatorConfiguration
} from "./operator.tokens";

type OperatorContext = {
  operatorAccount: OperatorAccountRecord;
  permissions: OperatorPermissionSet;
  requestMetadata: RequestMetadata;
  sessionWallet: WalletRecord;
};

type RemoteHealthProbe = {
  details: JsonObject | null;
  live: boolean;
  ready: boolean;
};

function parseInput<T>(
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: { flatten(): unknown } } },
  input: unknown
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten());
  }

  return parsed.data;
}

function lowerCaseIncludes(value: string | null | undefined, query: string): boolean {
  return Boolean(value && value.toLowerCase().includes(query));
}

function addMinutes(timestamp: string, minutes: number): string {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function startOfUtcDayIso(timestamp: string): string {
  const value = new Date(timestamp);
  value.setUTCHours(0, 0, 0, 0);
  return value.toISOString();
}

function compareBlockAndLogDescending(
  left: { occurredBlockNumber: string; occurredLogIndex: number },
  right: { occurredBlockNumber: string; occurredLogIndex: number }
): number {
  const leftBlock = BigInt(left.occurredBlockNumber);
  const rightBlock = BigInt(right.occurredBlockNumber);

  if (leftBlock > rightBlock) {
    return -1;
  }

  if (leftBlock < rightBlock) {
    return 1;
  }

  return right.occurredLogIndex - left.occurredLogIndex;
}

function compareSubmittedAtDescending(
  left: { submittedAt: string },
  right: { submittedAt: string }
): number {
  return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
}

function buildRelease4CursorKey(
  manifest: DeploymentManifest,
  configuration: OperatorConfiguration
): string {
  if (manifest.chainId === configuration.chainId) {
    return configuration.release4CursorKey;
  }

  return `release4:${manifest.network}`;
}

function normalizeWalletAddress(
  address: string | null | undefined
): `0x${string}` | null {
  if (!address) {
    return null;
  }

  return address.toLowerCase() as `0x${string}`;
}

function determineTreasuryStatus(
  protocolConfigState: ProtocolConfigStateRecord | null,
  feeVaultState: FeeVaultStateRecord | null
): ListOperatorDeploymentsResponse["deployments"][number]["treasury"]["status"] {
  if (!protocolConfigState && !feeVaultState) {
    return "UNINDEXED";
  }

  if (!protocolConfigState || !feeVaultState) {
    return "PARTIAL";
  }

  if (protocolConfigState.treasuryAddress === feeVaultState.treasuryAddress) {
    return "CONSISTENT";
  }

  return "MISMATCHED";
}

function buildPermissions(role: OperatorAccountRecord["role"]): OperatorPermissionSet {
  return {
    canManageCases: role === "COMPLIANCE" || role === "SUPER_ADMIN",
    canManageCheckpoints: role === "COMPLIANCE" || role === "SUPER_ADMIN",
    canManageProtocolProposals:
      role === "PROTOCOL_ADMIN" || role === "SUPER_ADMIN",
    canManageSponsoredTransactions: role === "COMPLIANCE" || role === "SUPER_ADMIN",
    canResolveAlerts: role === "COMPLIANCE" || role === "SUPER_ADMIN",
    canViewOperatorConsole: true
  };
}

function buildSubjectSummary(input: {
  agreementAddress?: string | null;
  dealVersionId?: string | null;
  draftDealId?: string | null;
  label?: string | null;
  organizationId?: string | null;
  subjectId: string;
  subjectType: OperatorSubjectSummary["subjectType"];
}): OperatorSubjectSummary {
  return {
    agreementAddress: (input.agreementAddress ?? null) as OperatorSubjectSummary["agreementAddress"],
    dealVersionId: input.dealVersionId ?? null,
    draftDealId: input.draftDealId ?? null,
    label: input.label ?? null,
    organizationId: input.organizationId ?? null,
    subjectId: input.subjectId,
    subjectType: input.subjectType
  };
}

function normalizeAgreementAddress(
  address: string | null | undefined
): `0x${string}` | null {
  if (!address) {
    return null;
  }

  return address.toLowerCase() as `0x${string}`;
}

function readStringMetadataValue(
  metadata: JsonObject | null,
  key: string
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function findDraftByCanonicalDealId(
  drafts: readonly DraftDealRecord[],
  canonicalDealId: string
): DraftDealRecord | null {
  return (
    drafts.find(
      (draft) =>
        buildCanonicalDealId(draft.organizationId, draft.id) === canonicalDealId
    ) ?? null
  );
}

function toAlertSummary(record: OperatorAlertRecord): ListOperatorAlertsResponse["alerts"][number] {
  return {
    acknowledgedAt: record.acknowledgedAt,
    acknowledgedByOperatorAccountId: record.acknowledgedByOperatorAccountId,
    assignedOperatorAccountId: record.assignedOperatorAccountId,
    description: record.description,
    firstDetectedAt: record.firstDetectedAt,
    id: record.id,
    kind: record.kind,
    lastDetectedAt: record.lastDetectedAt,
    metadata: record.metadata,
    resolvedAt: record.resolvedAt,
    resolvedByOperatorAccountId: record.resolvedByOperatorAccountId,
    severity: record.severity,
    status: record.status,
    subject: buildSubjectSummary({
      agreementAddress: record.agreementAddress,
      dealVersionId: record.dealVersionId,
      draftDealId: record.draftDealId,
      label: record.subjectLabel,
      organizationId: record.organizationId,
      subjectId: record.subjectId,
      subjectType: record.subjectType
    })
  };
}

function toCheckpointSummary(
  record: ComplianceCheckpointRecord
): ComplianceCheckpointSummary {
  return {
    createdAt: record.createdAt,
    createdByOperatorAccountId: record.createdByOperatorAccountId,
    decisionNote: record.decisionNote,
    decidedAt: record.decidedAt,
    decidedByOperatorAccountId: record.decidedByOperatorAccountId,
    id: record.id,
    kind: record.kind,
    linkedComplianceCaseId: record.linkedComplianceCaseId,
    note: record.note,
    status: record.status,
    subject: buildSubjectSummary({
      agreementAddress: record.agreementAddress,
      dealVersionId: record.dealVersionId,
      draftDealId: record.draftDealId,
      label: record.subjectLabel,
      organizationId: record.organizationId,
      subjectId: record.subjectId,
      subjectType: record.subjectType
    })
  };
}

function toCaseSummary(record: ComplianceCaseRecord): ComplianceCaseSummary {
  return {
    assignedOperatorAccountId: record.assignedOperatorAccountId,
    createdAt: record.createdAt,
    createdByOperatorAccountId: record.createdByOperatorAccountId,
    id: record.id,
    lastNoteAt: null,
    linkedAlertId: record.linkedAlertId,
    linkedCheckpointId: record.linkedCheckpointId,
    severity: record.severity,
    status: record.status,
    subject: buildSubjectSummary({
      agreementAddress: record.agreementAddress,
      dealVersionId: record.dealVersionId,
      draftDealId: record.draftDealId,
      label: record.subjectLabel,
      organizationId: record.organizationId,
      subjectId: record.subjectId,
      subjectType: record.subjectType
    }),
    summary: record.summary,
    title: record.title
  };
}

function toProtocolProposalSummary(
  record: {
    action: ProtocolProposalDraftSummary["action"];
    calldata: ProtocolProposalDraftSummary["calldata"];
    chainId: number;
    createdAt: string;
    createdByOperatorAccountId: string;
    description: string;
    id: string;
    input: ProtocolProposalDraftSummary["input"];
    target: ProtocolProposalDraftSummary["target"];
    targetAddress: ProtocolProposalDraftSummary["targetAddress"];
    value: string;
  }
): ProtocolProposalDraftSummary {
  return {
    action: record.action,
    calldata: record.calldata,
    chainId: record.chainId,
    createdAt: record.createdAt,
    createdByOperatorAccountId: record.createdByOperatorAccountId,
    description: record.description,
    id: record.id,
    input: record.input,
    target: record.target,
    targetAddress: record.targetAddress,
    value: record.value
  };
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function mapPartnerAccount(record: {
  createdAt: string;
  id: string;
  metadata: JsonObject | null;
  name: string;
  slug: string;
  status: "ACTIVE" | "DISABLED";
  updatedAt: string;
}) {
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

function mapPartnerLink(record: {
  actingUserId: string;
  actingWalletId: string;
  createdAt: string;
  externalReference: string | null;
  id: string;
  organizationId: string;
  partnerAccountId: string;
  status: "ACTIVE" | "DISABLED";
  updatedAt: string;
}) {
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

function mapPartnerApiKey(record: {
  createdAt: string;
  displayName: string;
  expiresAt: string | null;
  id: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  partnerOrganizationLinkId: string;
  revokedAt: string | null;
  scopes: readonly (
    | "deals:read"
    | "deals:write"
    | "funding:write"
    | "milestones:write"
    | "disputes:write"
    | "approvals:read"
    | "approvals:write"
    | "hosted_sessions:write"
    | "webhooks:read"
  )[];
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  updatedAt: string;
}) {
  return {
    createdAt: record.createdAt,
    displayName: record.displayName,
    expiresAt: record.expiresAt,
    id: record.id,
    keyPrefix: record.keyPrefix,
    lastUsedAt: record.lastUsedAt,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    revokedAt: record.revokedAt,
    scopes: [...record.scopes],
    status: record.status,
    updatedAt: record.updatedAt
  };
}

function mapPartnerHostedSession(record: {
  completedAt: string | null;
  createdAt: string;
  dealMilestoneDisputeId: string | null;
  dealVersionId: string | null;
  dealVersionMilestoneId: string | null;
  draftDealId: string | null;
  expiresAt: string;
  id: string;
  partnerOrganizationLinkId: string;
  partnerReferenceId: string | null;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  type:
    | "COUNTERPARTY_VERSION_ACCEPTANCE"
    | "COUNTERPARTY_MILESTONE_SUBMISSION"
    | "DISPUTE_EVIDENCE_UPLOAD"
    | "DEAL_STATUS_REVIEW";
  updatedAt: string;
}) {
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

function mapPartnerSubscription(record: {
  createdAt: string;
  displayName: string;
  endpointUrl: string;
  eventTypes: readonly (
    | "draft.deal.created"
    | "deal.version.created"
    | "deal.version.accepted"
    | "deal.version.counterparty_accepted"
    | "funding.transaction.updated"
    | "draft.deal.activated"
    | "milestone.submission.created"
    | "milestone.review.created"
    | "milestone.settlement_requested"
    | "milestone.dispute.opened"
    | "milestone.dispute.decided"
    | "settlement.execution.updated"
    | "approval.request.updated"
    | "hosted.session.completed"
    | "hosted.session.expired"
  )[];
  id: string;
  lastDeliveryAt: string | null;
  partnerOrganizationLinkId: string;
  status: "ACTIVE" | "PAUSED" | "DISABLED";
  updatedAt: string;
}) {
  return {
    createdAt: record.createdAt,
    displayName: record.displayName,
    endpointUrl: record.endpointUrl,
    eventTypes: [...record.eventTypes],
    id: record.id,
    lastDeliveryAt: record.lastDeliveryAt,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    status: record.status,
    updatedAt: record.updatedAt
  };
}

@Injectable()
export class OperatorService {
  constructor(
    @Inject(RELEASE1_REPOSITORIES)
    private readonly release1Repositories: Release1Repositories,
    @Inject(RELEASE4_REPOSITORIES)
    private readonly release4Repositories: Release4Repositories,
    @Inject(RELEASE10_REPOSITORIES)
    private readonly release10Repositories: Release10Repositories,
    @Inject(RELEASE12_REPOSITORIES)
    private readonly release12Repositories: Release12Repositories,
    @Inject(RELEASE8_REPOSITORIES)
    private readonly release8Repositories: Release8Repositories,
    private readonly authenticatedSessionService: AuthenticatedSessionService,
    private readonly tenantService: TenantService,
    @Inject(OPERATOR_CONFIGURATION)
    private readonly configuration: OperatorConfiguration
  ) {}

  private getVisibleChainIds(): number[] {
    return this.configuration.visibleChainIds;
  }

  private getVisibleDeploymentManifests(): DeploymentManifest[] {
    const manifests = this.getVisibleChainIds()
      .map((chainId) => getDeploymentManifestByChainId(chainId))
      .filter((manifest): manifest is DeploymentManifest => manifest !== null);

    return manifests.sort((left, right) => left.chainId - right.chainId);
  }

  private async listByVisibleChainIds<T>(
    loader: (chainId: number) => Promise<T[]>
  ): Promise<T[]> {
    const records = await Promise.all(
      this.getVisibleChainIds().map((chainId) => loader(chainId))
    );

    return records.flat();
  }

  private async buildDeploymentSummary(
    manifest: DeploymentManifest
  ): Promise<ListOperatorDeploymentsResponse["deployments"][number]> {
    const protocolConfigAddress = normalizeWalletAddress(
      manifest.contracts.ProtocolConfig
    );
    const feeVaultAddress = normalizeWalletAddress(manifest.contracts.FeeVault);
    const cursorKey = buildRelease4CursorKey(manifest, this.configuration);

    const [cursor, agreements, protocolConfigState, feeVaultState] =
      await Promise.all([
        this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
          manifest.chainId,
          cursorKey
        ),
        this.release4Repositories.escrowAgreements.listByChainId(manifest.chainId),
        protocolConfigAddress
          ? this.release4Repositories.protocolConfigStates.findByChainIdAndAddress(
              manifest.chainId,
              protocolConfigAddress
            )
          : Promise.resolve(null),
        feeVaultAddress
          ? this.release4Repositories.feeVaultStates.findByChainIdAndAddress(
              manifest.chainId,
              feeVaultAddress
            )
          : Promise.resolve(null)
      ]);

    const cursorFresh =
      cursor != null &&
      Date.now() - new Date(cursor.updatedAt).getTime() <=
        this.configuration.indexerFreshnessTtlSeconds * 1000;

    return {
      agreementCount: agreements.length,
      chainId: manifest.chainId,
      contractVersion: manifest.contractVersion,
      cursorFresh,
      cursorKey,
      cursorUpdatedAt: cursor?.updatedAt ?? null,
      deploymentStartBlock: manifest.deploymentStartBlock,
      explorerUrl: manifest.explorerUrl,
      feeVault: {
        address: feeVaultAddress,
        indexed: feeVaultState !== null,
        owner: feeVaultState?.owner ?? null,
        pendingOwner: feeVaultState?.pendingOwner ?? null,
        treasuryAddress: feeVaultState?.treasuryAddress ?? null,
        updatedAt: feeVaultState?.updatedAt ?? null
      },
      manifestOwner: normalizeWalletAddress(manifest.owner),
      manifestPendingOwner: normalizeWalletAddress(manifest.pendingOwner),
      manifestProtocolFeeBps: manifest.protocolFeeBps,
      manifestTreasuryAddress: normalizeWalletAddress(manifest.treasury),
      network: manifest.network,
      protocolConfig: {
        address: protocolConfigAddress,
        createEscrowPaused: protocolConfigState?.createEscrowPaused ?? null,
        feeVaultAddress: protocolConfigState?.feeVaultAddress ?? null,
        fundingPaused: protocolConfigState?.fundingPaused ?? null,
        indexed: protocolConfigState !== null,
        owner: protocolConfigState?.owner ?? null,
        pendingOwner: protocolConfigState?.pendingOwner ?? null,
        protocolFeeBps: protocolConfigState?.protocolFeeBps ?? null,
        treasuryAddress: protocolConfigState?.treasuryAddress ?? null,
        updatedAt: protocolConfigState?.updatedAt ?? null
      },
      settlementTokenAddress: normalizeWalletAddress(manifest.usdcToken),
      treasury: {
        feeVaultAddress: feeVaultState?.treasuryAddress ?? null,
        manifestAddress: normalizeWalletAddress(manifest.treasury),
        protocolConfigAddress: protocolConfigState?.treasuryAddress ?? null,
        status: determineTreasuryStatus(protocolConfigState, feeVaultState)
      }
    };
  }

  async getSession(
    requestMetadata: RequestMetadata
  ): Promise<OperatorSessionResponse> {
    const context = await this.requireOperatorContext(requestMetadata);

    return {
      operator: {
        createdAt: context.operatorAccount.createdAt,
        id: context.operatorAccount.id,
        role: context.operatorAccount.role,
        updatedAt: context.operatorAccount.updatedAt,
        userId: context.operatorAccount.userId,
        walletAddress: context.sessionWallet.address,
        walletId: context.operatorAccount.walletId
      },
      permissions: context.permissions
    };
  }

  async listPartners(
    requestMetadata: RequestMetadata
  ): Promise<ListPartnerAccountsResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const partners = await this.release10Repositories.partnerAccounts.listAll();

    return {
      partners: partners.map((record) => mapPartnerAccount(record))
    };
  }

  async createPartnerAccount(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreatePartnerAccountResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(createPartnerAccountSchema, input);
    const existing = await this.release10Repositories.partnerAccounts.findBySlug(body.slug);

    if (existing) {
      throw new ConflictException("partner slug already exists");
    }

    const now = new Date().toISOString();
    const partner = await this.release10Repositories.partnerAccounts.create({
      createdAt: now,
      id: randomUUID(),
      metadata: (body.metadata ?? null) as JsonObject | null,
      name: body.name,
      slug: body.slug,
      status: "ACTIVE",
      updatedAt: now
    });
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_ACCOUNT_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: partner.id,
      entityType: "PARTNER_ACCOUNT",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: { slug: partner.slug },
      occurredAt: now,
      organizationId: null,
      userAgent: requestMetadata.userAgent
    });

    return {
      partnerAccount: mapPartnerAccount(partner)
    };
  }

  async getPartnerAccount(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<PartnerAccountDetailResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(partnerAccountParamsSchema, input);
    const partner = await this.requirePartnerAccount(params.partnerAccountId);
    const links =
      await this.release10Repositories.partnerOrganizationLinks.listByPartnerAccountId(
        partner.id
      );
    const [apiKeys, hostedSessions, subscriptions, deliveries] = await Promise.all([
      Promise.all(
        links.map((link) =>
          this.release10Repositories.partnerApiKeys.listByPartnerOrganizationLinkId(link.id)
        )
      ),
      Promise.all(
        links.map((link) =>
          this.release10Repositories.partnerHostedSessions.listByPartnerOrganizationLinkId(link.id)
        )
      ),
      this.release10Repositories.partnerWebhookSubscriptions.listByPartnerOrganizationLinkIds(
        links.map((link) => link.id)
      ),
      this.release10Repositories.partnerWebhookDeliveries.listByPartnerOrganizationLinkIds(
        links.map((link) => link.id)
      )
    ]);
    const extension = await this.tenantService.getPartnerDetailExtension(partner.id);

    return {
      apiKeys: apiKeys.flat().map((record) => mapPartnerApiKey(record)),
      billing: extension.billing,
      brandAssets: extension.brandAssets,
      domains: extension.domains,
      hostedSessions: hostedSessions.flat().map((record) => mapPartnerHostedSession(record)),
      links: links.map((record) => mapPartnerLink(record)),
      partner: mapPartnerAccount(partner),
      recentDeliveries: await Promise.all(
        deliveries.slice(0, 20).map((record) => this.buildPartnerDeliverySummary(record.id))
      ),
      settings: extension.settings,
      subscriptions: subscriptions.map((record) => mapPartnerSubscription(record))
    };
  }

  async createPartnerOrganizationLink(
    partnerAccountId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreatePartnerOrganizationLinkResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const partner = await this.requirePartnerAccount(partnerAccountId);
    const body = parseInput(createPartnerOrganizationLinkSchema, input);
    const [organization, user, wallet, existingLinks] = await Promise.all([
      this.release1Repositories.organizations.findById(body.organizationId),
      this.release1Repositories.users.findById(body.actingUserId),
      this.release1Repositories.wallets.findById(body.actingWalletId),
      this.release10Repositories.partnerOrganizationLinks.listByPartnerAccountId(partner.id)
    ]);

    if (!organization) {
      throw new NotFoundException("organization not found");
    }
    if (!user) {
      throw new NotFoundException("acting user not found");
    }
    if (!wallet || wallet.userId !== user.id) {
      throw new ConflictException("acting wallet must belong to the acting user");
    }
    if (
      existingLinks.some(
        (record) => record.organizationId === organization.id && record.status === "ACTIVE"
      )
    ) {
      throw new ConflictException("partner is already linked to the organization");
    }

    const now = new Date().toISOString();
    const link = await this.release10Repositories.partnerOrganizationLinks.create({
      actingUserId: user.id,
      actingWalletId: wallet.id,
      createdAt: now,
      externalReference: body.externalReference ?? null,
      id: randomUUID(),
      organizationId: organization.id,
      partnerAccountId: partner.id,
      status: "ACTIVE",
      updatedAt: now
    });
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_ORGANIZATION_LINK_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: link.id,
      entityType: "PARTNER_ORGANIZATION_LINK",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: { partnerAccountId: partner.id },
      occurredAt: now,
      organizationId: organization.id,
      userAgent: requestMetadata.userAgent
    });

    return {
      link: mapPartnerLink(link)
    };
  }

  async createPartnerApiKey(
    partnerOrganizationLinkId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreatePartnerApiKeyResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(createPartnerApiKeySchema, input);
    const link = await this.requirePartnerLink(partnerOrganizationLinkId);
    const keyId = randomBytes(8).toString("hex");
    const secret = randomBytes(24).toString("hex");
    const keyPrefix = `besk_${keyId}`;
    const now = new Date().toISOString();
    const apiKey = await this.release10Repositories.partnerApiKeys.create({
      createdAt: now,
      displayName: body.displayName,
      expiresAt: body.expiresAt ?? null,
      id: randomUUID(),
      keyPrefix,
      lastUsedAt: null,
      partnerOrganizationLinkId: link.id,
      revokedAt: null,
      scopes: body.scopes ?? [
        "deals:read",
        "deals:write",
        "funding:write",
        "milestones:write",
        "disputes:write",
        "approvals:read",
        "approvals:write",
        "hosted_sessions:write",
        "webhooks:read"
      ],
      secretHash: hashSecret(secret),
      status: "ACTIVE",
      updatedAt: now
    });
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_API_KEY_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: apiKey.id,
      entityType: "PARTNER_API_KEY",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: { partnerOrganizationLinkId: link.id, scopes: apiKey.scopes },
      occurredAt: now,
      organizationId: link.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      apiKey: {
        ...mapPartnerApiKey(apiKey),
        apiKey: `${keyPrefix}_${secret}`
      }
    };
  }

  async revokePartnerApiKey(
    input: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<RevokePartnerApiKeyResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(partnerApiKeyParamsSchema, input);
    const body = parseInput(revokePartnerApiKeySchema, bodyInput);
    const apiKey = await this.requirePartnerApiKey(params.partnerApiKeyId);
    const now = new Date().toISOString();
    const updated = await this.release10Repositories.partnerApiKeys.update(apiKey.id, {
      revokedAt: now,
      status: "REVOKED",
      updatedAt: now
    });
    const link = await this.requirePartnerLink(updated.partnerOrganizationLinkId);
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_API_KEY_REVOKED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "PARTNER_API_KEY",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: body.reason ? { reason: body.reason } : null,
      occurredAt: now,
      organizationId: link.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return { apiKey: mapPartnerApiKey(updated) };
  }

  async rotatePartnerApiKey(
    input: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<RotatePartnerApiKeyResponse> {
    const params = parseInput(partnerApiKeyParamsSchema, input);
    const body = parseInput(rotatePartnerApiKeySchema, bodyInput);
    const revoked = await this.revokePartnerApiKey(
      params,
      { reason: body.revokeReason },
      requestMetadata
    );
    const replacement = await this.createPartnerApiKey(
      revoked.apiKey.partnerOrganizationLinkId,
      {
        displayName: body.displayName,
        expiresAt: body.expiresAt,
        scopes: body.scopes
      },
      requestMetadata
    );

    return {
      previousApiKey: revoked.apiKey,
      replacementApiKey: replacement.apiKey
    };
  }

  async createPartnerWebhookSubscription(
    partnerOrganizationLinkId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreatePartnerWebhookSubscriptionResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(createPartnerWebhookSubscriptionSchema, input);
    const link = await this.requirePartnerLink(partnerOrganizationLinkId);
    const now = new Date().toISOString();
    const secret = randomBytes(24).toString("hex");
    const subscription =
      await this.release10Repositories.partnerWebhookSubscriptions.create({
        createdAt: now,
        displayName: body.displayName,
        endpointUrl: body.endpointUrl,
        eventTypes: body.eventTypes,
        id: randomUUID(),
        lastDeliveryAt: null,
        partnerOrganizationLinkId: link.id,
        secretHash: secret,
        status: "ACTIVE",
        updatedAt: now
      });
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_WEBHOOK_SUBSCRIPTION_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: subscription.id,
      entityType: "PARTNER_WEBHOOK_SUBSCRIPTION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: { endpointUrl: subscription.endpointUrl, eventTypes: subscription.eventTypes },
      occurredAt: now,
      organizationId: link.organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      subscription: mapPartnerSubscription(subscription)
    };
  }

  async updatePartnerWebhookSubscription(
    input: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdatePartnerWebhookSubscriptionResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(partnerWebhookSubscriptionParamsSchema, input);
    const body = parseInput(updatePartnerWebhookSubscriptionSchema, bodyInput);
    const existing = await this.requirePartnerWebhookSubscription(
      params.partnerWebhookSubscriptionId
    );
    const updated = await this.release10Repositories.partnerWebhookSubscriptions.update(
      existing.id,
      {
        status: body.status,
        updatedAt: new Date().toISOString()
      }
    );
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_WEBHOOK_SUBSCRIPTION_UPDATED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "PARTNER_WEBHOOK_SUBSCRIPTION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: { status: updated.status },
      occurredAt: updated.updatedAt,
      organizationId: (await this.requirePartnerLink(updated.partnerOrganizationLinkId))
        .organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      subscription: mapPartnerSubscription(updated)
    };
  }

  async rotatePartnerWebhookSubscriptionSecret(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<RotatePartnerWebhookSubscriptionSecretResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(partnerWebhookSubscriptionParamsSchema, input);
    const existing = await this.requirePartnerWebhookSubscription(
      params.partnerWebhookSubscriptionId
    );
    const secret = randomBytes(24).toString("hex");
    const updated = await this.release10Repositories.partnerWebhookSubscriptions.update(
      existing.id,
      {
        secretHash: secret,
        updatedAt: new Date().toISOString()
      }
    );
    await this.release1Repositories.auditLogs.append({
      action: "PARTNER_WEBHOOK_SUBSCRIPTION_UPDATED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "PARTNER_WEBHOOK_SUBSCRIPTION",
      id: randomUUID(),
      ipAddress: requestMetadata.ipAddress,
      metadata: { rotated: true },
      occurredAt: updated.updatedAt,
      organizationId: (await this.requirePartnerLink(updated.partnerOrganizationLinkId))
        .organizationId,
      userAgent: requestMetadata.userAgent
    });

    return {
      secret,
      subscription: mapPartnerSubscription(updated)
    };
  }

  async upsertTenantSettings(
    partnerAccountId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ) {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(tenantSettingsSchema, input);

    return this.tenantService.upsertSettings(partnerAccountId, body);
  }

  async registerPartnerBrandAsset(
    partnerAccountId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<RegisterPartnerBrandAssetResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(registerPartnerBrandAssetSchema, input);

    return this.tenantService.registerBrandAsset(partnerAccountId, body);
  }

  async createTenantDomain(
    partnerAccountId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateTenantDomainResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(createTenantDomainSchema, input);

    return this.tenantService.createDomain(partnerAccountId, body);
  }

  async listTenantDomains(
    partnerAccountId: string,
    requestMetadata: RequestMetadata
  ): Promise<ListTenantDomainsResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);

    return this.tenantService.listDomains(partnerAccountId);
  }

  async verifyTenantDomain(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateTenantDomainResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(tenantDomainParamsSchema, input);

    return this.tenantService.updateDomainStatus({
      domainId: params.domainId,
      status: "VERIFIED"
    });
  }

  async activateTenantDomain(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateTenantDomainResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(tenantDomainParamsSchema, input);

    return this.tenantService.updateDomainStatus({
      domainId: params.domainId,
      status: "ACTIVE"
    });
  }

  async disableTenantDomain(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateTenantDomainResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(tenantDomainParamsSchema, input);

    return this.tenantService.updateDomainStatus({
      domainId: params.domainId,
      status: "DISABLED"
    });
  }

  async listBillingPlans(
    requestMetadata: RequestMetadata
  ): Promise<ListBillingPlansResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);

    return this.tenantService.listBillingPlans();
  }

  async listBillingFeeSchedules(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListBillingFeeSchedulesResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(billingPlanParamsSchema, input);

    return this.tenantService.listBillingFeeSchedules(params.billingPlanId);
  }

  async createBillingPlan(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateBillingPlanResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(createBillingPlanSchema, input);

    return this.tenantService.createBillingPlan(body);
  }

  async updateBillingPlan(
    input: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdateBillingPlanResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(billingPlanParamsSchema, input);
    const body = parseInput(updateBillingPlanSchema, bodyInput);

    return this.tenantService.updateBillingPlan(params.billingPlanId, body);
  }

  async createBillingFeeSchedule(
    billingPlanId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<CreateBillingFeeScheduleResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(createBillingFeeScheduleSchema, input);

    return this.tenantService.createBillingFeeSchedule(billingPlanId, body);
  }

  async assignBillingPlan(
    partnerAccountId: string,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<AssignTenantBillingPlanResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const body = parseInput(assignTenantBillingPlanSchema, input);

    return this.tenantService.assignBillingPlan(partnerAccountId, body);
  }

  async getPartnerBillingOverview(
    partnerAccountId: string,
    requestMetadata: RequestMetadata
  ): Promise<TenantBillingOverviewResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);

    return this.tenantService.buildBillingOverview(partnerAccountId);
  }

  async listPartnerInvoices(
    partnerAccountId: string,
    requestMetadata: RequestMetadata
  ): Promise<ListInvoicesResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);

    return this.tenantService.listInvoices(partnerAccountId);
  }

  async listAllInvoices(
    requestMetadata: RequestMetadata
  ): Promise<ListInvoicesResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);

    return this.tenantService.listAllInvoices();
  }

  async getInvoice(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<InvoiceDetailResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(invoiceParamsSchema, input);

    return this.tenantService.getInvoice(params.invoiceId);
  }

  async updateInvoiceStatus(
    input: unknown,
    bodyInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<UpdateInvoiceStatusResponse> {
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const params = parseInput(invoiceParamsSchema, input);
    const body = parseInput(invoiceActionSchema, bodyInput);

    return this.tenantService.updateInvoiceStatus(params.invoiceId, body.status);
  }

  async search(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<OperatorSearchResponse> {
    const params = parseInput(operatorSearchParamsSchema, input);
    await this.requireOperatorContext(requestMetadata);
    const query = params.q.trim().toLowerCase();
    const hits: OperatorSearchHit[] = [];

    const [
      draftDeals,
      dealVersions,
      disputes,
      agreements,
      fundingTransactions,
      settlementTransactions
    ] = await Promise.all([
      this.release1Repositories.draftDeals.listAll(),
      this.release1Repositories.dealVersions.listAll(),
      this.release1Repositories.dealMilestoneDisputes.listAll(),
      this.release4Repositories.escrowAgreements.listByChainId(this.configuration.chainId),
      this.release1Repositories.fundingTransactions.listByChainId(this.configuration.chainId),
      this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
        this.configuration.chainId
      )
    ]);

    for (const draft of draftDeals) {
      const canonicalDealId = buildCanonicalDealId(draft.organizationId, draft.id);
      if (
        lowerCaseIncludes(draft.id, query) ||
        lowerCaseIncludes(canonicalDealId, query) ||
        lowerCaseIncludes(draft.title, query) ||
        lowerCaseIncludes(draft.summary, query)
      ) {
        hits.push({
          entityType: "DRAFT_DEAL",
          id: draft.id,
          organizationId: draft.organizationId,
          primaryIdentifier: canonicalDealId,
          route: `/search?q=${encodeURIComponent(canonicalDealId)}`,
          status: draft.state,
          subtitle: draft.summary ?? draft.id,
          title: draft.title
        });
      }
    }

    for (const version of dealVersions) {
      if (
        lowerCaseIncludes(version.id, query) ||
        lowerCaseIncludes(version.title, query) ||
        lowerCaseIncludes(version.summary, query)
      ) {
        hits.push({
          entityType: "DEAL_VERSION",
          id: version.id,
          organizationId: version.organizationId,
          primaryIdentifier: version.id,
          route: `/search?q=${encodeURIComponent(version.id)}`,
          status: `v${version.versionNumber}`,
          subtitle: version.summary ?? version.id,
          title: version.title
        });
      }
    }

    for (const dispute of disputes) {
      if (
        lowerCaseIncludes(dispute.id, query) ||
        lowerCaseIncludes(dispute.statementMarkdown, query)
      ) {
        const decision =
          await this.release1Repositories.dealMilestoneDisputeDecisions.findByDealMilestoneDisputeId(
            dispute.id
          );
        hits.push({
          entityType: "DEAL_MILESTONE_DISPUTE",
          id: dispute.id,
          organizationId: dispute.organizationId,
          primaryIdentifier: dispute.id,
          route: `/cases?subjectId=${dispute.id}&subjectType=DEAL_MILESTONE_DISPUTE`,
          status: decision ? "RESOLVED" : "OPEN",
          subtitle: dispute.statementMarkdown,
          title: `Milestone dispute ${dispute.id}`
        });
      }
    }

    for (const agreement of agreements) {
      const linkedDraft = findDraftByCanonicalDealId(draftDeals, agreement.dealId);

      if (
        lowerCaseIncludes(agreement.agreementAddress, query) ||
        lowerCaseIncludes(agreement.dealId, query) ||
        lowerCaseIncludes(agreement.dealVersionHash, query)
      ) {
        hits.push({
          entityType: "ESCROW_AGREEMENT",
          id: agreement.agreementAddress,
          organizationId: linkedDraft?.organizationId ?? null,
          primaryIdentifier: agreement.agreementAddress,
          route: `/search?q=${encodeURIComponent(agreement.agreementAddress)}`,
          status: agreement.funded ? "FUNDED" : "PENDING_FUNDING",
          subtitle: linkedDraft?.title ?? agreement.dealId,
          title: `Agreement ${agreement.agreementAddress}`
        });
      }
    }

    for (const transaction of fundingTransactions) {
      if (
        lowerCaseIncludes(transaction.id, query) ||
        lowerCaseIncludes(transaction.transactionHash, query)
      ) {
        hits.push({
          entityType: "FUNDING_TRANSACTION",
          id: transaction.id,
          organizationId: transaction.organizationId,
          primaryIdentifier: transaction.transactionHash,
          route: `/reconciliation?entityId=${transaction.id}`,
          status: transaction.reconciledStatus ?? "PENDING",
          subtitle: transaction.id,
          title: `Funding transaction ${transaction.transactionHash}`
        });
      }
    }

    for (const transaction of settlementTransactions) {
      if (
        lowerCaseIncludes(transaction.id, query) ||
        lowerCaseIncludes(transaction.transactionHash, query)
      ) {
        hits.push({
          entityType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION",
          id: transaction.id,
          organizationId: transaction.organizationId,
          primaryIdentifier: transaction.transactionHash,
          route: `/reconciliation?entityId=${transaction.id}`,
          status: transaction.reconciledStatus ?? "PENDING",
          subtitle: transaction.id,
          title: `Settlement execution ${transaction.transactionHash}`
        });
      }
    }

    return {
      hits: hits.slice(0, 100)
    };
  }

  async getDashboard(
    requestMetadata: RequestMetadata
  ): Promise<OperatorDashboardResponse> {
    await this.requireOperatorContext(requestMetadata);
    const [health, reconciliation, alerts, checkpoints, cases, sponsorshipRequests] = await Promise.all([
      this.getHealth(requestMetadata),
      this.getReconciliation(requestMetadata),
      this.listAlerts({}, requestMetadata),
      this.listCheckpoints(requestMetadata),
      this.listCases({}, requestMetadata),
      this.listSponsoredTransactionRequests({ status: "PENDING" }, requestMetadata)
    ]);

    const cards: OperatorDashboardCard[] = [
      { key: "open_alerts", value: alerts.alerts.filter((alert) => alert.status !== "RESOLVED").length },
      { key: "open_cases", value: cases.cases.filter((entry) => entry.status !== "RESOLVED").length },
      {
        key: "pending_sponsorship_requests",
        value: sponsorshipRequests.sponsoredTransactionRequests.length
      },
      {
        key: "pending_checkpoints",
        value: checkpoints.checkpoints.filter((entry) => entry.status === "PENDING").length
      },
      { key: "stale_funding", value: reconciliation.staleFundingCount },
      {
        key: "stale_settlement",
        value: reconciliation.staleSettlementExecutionCount
      },
      { key: "open_disputes", value: reconciliation.openDisputeCount }
    ];

    return {
      cards,
      health,
      recentAlerts: alerts.alerts.slice(0, 10),
      reconciliation
    };
  }

  async listDeployments(
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorDeploymentsResponse> {
    await this.requireOperatorContext(requestMetadata);

    return {
      deployments: await Promise.all(
        this.getVisibleDeploymentManifests().map((manifest) =>
          this.buildDeploymentSummary(manifest)
        )
      )
    };
  }

  async listTreasuryMovements(
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorTreasuryMovementsResponse> {
    await this.requireOperatorContext(requestMetadata);
    const manifests = this.getVisibleDeploymentManifests();
    const manifestByChainId = new Map(
      manifests.map((manifest) => [manifest.chainId, manifest] as const)
    );
    const movements = await this.listByVisibleChainIds((chainId) =>
      this.release4Repositories.treasuryMovements.listByChainId(chainId)
    );

    return {
      movements: movements
        .sort(compareBlockAndLogDescending)
        .slice(0, 200)
        .map((movement) => {
          const manifest = manifestByChainId.get(movement.chainId);

          if (!manifest) {
            throw new Error(
              `Missing deployment manifest for visible treasury movement chain ${movement.chainId}`
            );
          }

          return {
            amount: movement.amount,
            chainId: movement.chainId,
            contractVersion: manifest.contractVersion,
            explorerUrl: manifest.explorerUrl,
            feeVaultAddress: movement.feeVaultAddress,
            kind: movement.kind,
            network: manifest.network,
            occurredAt: movement.occurredAt,
            occurredBlockNumber: movement.occurredBlockNumber,
            occurredLogIndex: movement.occurredLogIndex,
            tokenAddress: movement.tokenAddress,
            transactionHash: movement.occurredTransactionHash,
            treasuryAddress: movement.treasuryAddress
          };
        })
    };
  }

  async listFundingTransactions(
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorFundingTransactionsResponse> {
    await this.requireOperatorContext(requestMetadata);
    const manifests = this.getVisibleDeploymentManifests();
    const manifestByChainId = new Map(
      manifests.map((manifest) => [manifest.chainId, manifest] as const)
    );
    const [
      fundingTransactions,
      indexedTransactions,
      agreements,
      organizations,
      drafts,
      versions,
      chainCursorEntries
    ] = await Promise.all([
      this.listByVisibleChainIds((chainId) =>
        this.release1Repositories.fundingTransactions.listByChainId(chainId)
      ),
      this.listByVisibleChainIds((chainId) =>
        this.release4Repositories.indexedTransactions.listByChainId(chainId)
      ),
      this.listByVisibleChainIds((chainId) =>
        this.release4Repositories.escrowAgreements.listByChainId(chainId)
      ),
      this.release1Repositories.organizations.listAll(),
      this.release1Repositories.draftDeals.listAll(),
      this.release1Repositories.dealVersions.listAll(),
      Promise.all(
        manifests.map(async (manifest) => [
          manifest.chainId,
          await this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
            manifest.chainId,
            buildRelease4CursorKey(manifest, this.configuration)
          )
        ] as const)
      )
    ]);
    const organizationById = new Map(
      organizations.map((organization) => [organization.id, organization] as const)
    );
    const draftById = new Map(drafts.map((draft) => [draft.id, draft] as const));
    const versionById = new Map(
      versions.map((version) => [version.id, version] as const)
    );
    const chainCursorByChainId = new Map(chainCursorEntries);
    const indexedTransactionByChainAndHash = new Map(
      indexedTransactions.map((transaction) => [
        `${transaction.chainId}:${transaction.transactionHash}`,
        transaction
      ] as const)
    );
    const agreementsByObservedTransactionHash = new Map<
      string,
      (typeof agreements)[number]
    >();

    for (const agreement of agreements) {
      agreementsByObservedTransactionHash.set(
        `${agreement.chainId}:${agreement.createdTransactionHash}`,
        agreement
      );

      if (agreement.fundedTransactionHash) {
        agreementsByObservedTransactionHash.set(
          `${agreement.chainId}:${agreement.fundedTransactionHash}`,
          agreement
        );
      }
    }

    const fundingTransactionById = new Map(
      fundingTransactions.map((transaction) => [transaction.id, transaction] as const)
    );
    const staleEvaluatedAt = new Date().toISOString();

    return {
      fundingTransactions: fundingTransactions
        .sort(compareSubmittedAtDescending)
        .slice(0, 200)
        .map((transaction) => {
          const manifest = manifestByChainId.get(transaction.chainId);

          if (!manifest) {
            throw new NotFoundException(
              `deployment manifest not found for chain ${transaction.chainId}`
            );
          }

          const indexedTransaction =
            indexedTransactionByChainAndHash.get(
              `${transaction.chainId}:${transaction.transactionHash}`
            ) ?? null;
          const observedAgreement =
            agreementsByObservedTransactionHash.get(
              `${transaction.chainId}:${transaction.transactionHash}`
            ) ?? null;
          const resolvedState = resolveFundingTransactionState({
            dealId: buildCanonicalDealId(
              transaction.organizationId,
              transaction.draftDealId
            ),
            fundingTransaction: transaction,
            indexedTransaction,
            observedAgreement,
            requiresFundedAgreement: deploymentSupportsCreateAndFund(manifest)
          });
          const observation = buildFundingTransactionObservation(indexedTransaction);
          const stalePendingState = resolveFundingTransactionStalePendingState({
            currentStatus: resolvedState.status,
            evaluatedAt: staleEvaluatedAt,
            fundingTransaction: transaction,
            indexerFreshnessTtlSeconds: this.configuration.indexerFreshnessTtlSeconds,
            pendingStaleAfterSeconds:
              this.configuration.fundingPendingStaleAfterSeconds,
            release4ChainCursor:
              chainCursorByChainId.get(transaction.chainId) ?? null
          });
          const supersededByTransaction =
            transaction.supersededByFundingTransactionId
              ? fundingTransactionById.get(
                  transaction.supersededByFundingTransactionId
                ) ?? null
              : null;

          return {
            agreementAddress: resolvedState.agreementAddress,
            chainId: transaction.chainId,
            confirmedAt:
              resolvedState.confirmedAt ?? transaction.reconciledConfirmedAt,
            contractVersion: manifest.contractVersion,
            dealVersionId: transaction.dealVersionId,
            dealVersionTitle:
              versionById.get(transaction.dealVersionId)?.title ?? null,
            draftDealId: transaction.draftDealId,
            draftDealTitle: draftById.get(transaction.draftDealId)?.title ?? null,
            explorerUrl: manifest.explorerUrl,
            id: transaction.id,
            indexedAt: observation.indexedAt,
            indexedBlockNumber: observation.indexedBlockNumber,
            indexedExecutionStatus: observation.indexedExecutionStatus,
            matchesTrackedVersion:
              resolvedState.matchesTrackedVersion ??
              transaction.reconciledMatchesTrackedVersion,
            network: manifest.network,
            organizationId: transaction.organizationId,
            organizationName:
              organizationById.get(transaction.organizationId)?.name ?? null,
            reconciledAt: transaction.reconciledAt,
            reconciledStatus: transaction.reconciledStatus,
            stalePending: stalePendingState.stalePending,
            stalePendingAt: stalePendingState.stalePendingAt,
            stalePendingEscalatedAt: transaction.stalePendingEscalatedAt,
            stalePendingEvaluation: stalePendingState.stalePendingEvaluation,
            status: resolvedState.status,
            submittedAt: transaction.submittedAt,
            submittedByUserId: transaction.submittedByUserId,
            submittedWalletAddress: transaction.submittedWalletAddress,
            supersededAt: transaction.supersededAt,
            supersededByFundingTransactionId:
              transaction.supersededByFundingTransactionId,
            supersededByTransactionHash:
              supersededByTransaction?.transactionHash ?? null,
            transactionHash: transaction.transactionHash
          };
        })
    };
  }

  async listSettlementExecutions(
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorSettlementExecutionsResponse> {
    await this.requireOperatorContext(requestMetadata);
    const manifests = this.getVisibleDeploymentManifests();
    const manifestByChainId = new Map(
      manifests.map((manifest) => [manifest.chainId, manifest] as const)
    );
    const [
      settlementTransactions,
      indexedTransactions,
      settlementPreparations,
      organizations,
      drafts,
      versions,
      chainCursorEntries
    ] = await Promise.all([
      this.listByVisibleChainIds((chainId) =>
        this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
          chainId
        )
      ),
      this.listByVisibleChainIds((chainId) =>
        this.release4Repositories.indexedTransactions.listByChainId(chainId)
      ),
      this.listByVisibleChainIds((chainId) =>
        this.release1Repositories.dealMilestoneSettlementPreparations.listByChainId(
          chainId
        )
      ),
      this.release1Repositories.organizations.listAll(),
      this.release1Repositories.draftDeals.listAll(),
      this.release1Repositories.dealVersions.listAll(),
      Promise.all(
        manifests.map(async (manifest) => [
          manifest.chainId,
          await this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
            manifest.chainId,
            buildRelease4CursorKey(manifest, this.configuration)
          )
        ] as const)
      )
    ]);
    const dealVersionIds = [...new Set(settlementTransactions.map((tx) => tx.dealVersionId))];
    const [settlementRequestGroups, milestoneGroups] = await Promise.all([
      Promise.all(
        dealVersionIds.map((dealVersionId) =>
          this.release1Repositories.dealMilestoneSettlementRequests.listByDealVersionId(
            dealVersionId
          )
        )
      ),
      Promise.all(
        dealVersionIds.map((dealVersionId) =>
          this.release1Repositories.dealVersionMilestones.listByDealVersionId(
            dealVersionId
          )
        )
      )
    ]);
    const settlementRequests = settlementRequestGroups.flat();
    const milestones = milestoneGroups.flat();
    const organizationById = new Map(
      organizations.map((organization) => [organization.id, organization] as const)
    );
    const draftById = new Map(drafts.map((draft) => [draft.id, draft] as const));
    const versionById = new Map(
      versions.map((version) => [version.id, version] as const)
    );
    const settlementRequestById = new Map(
      settlementRequests.map((request) => [request.id, request] as const)
    );
    const milestoneById = new Map(
      milestones.map((milestone) => [milestone.id, milestone] as const)
    );
    const settlementPreparationByRequestId = new Map(
      settlementPreparations.map((preparation) => [
        preparation.dealMilestoneSettlementRequestId,
        preparation
      ] as const)
    );
    const indexedTransactionByChainAndHash = new Map(
      indexedTransactions.map((transaction) => [
        `${transaction.chainId}:${transaction.transactionHash}`,
        transaction
      ] as const)
    );
    const chainCursorByChainId = new Map(chainCursorEntries);
    const settlementTransactionById = new Map(
      settlementTransactions.map((transaction) => [transaction.id, transaction] as const)
    );
    const staleEvaluatedAt = new Date().toISOString();

    return {
      executionTransactions: settlementTransactions
        .sort(compareSubmittedAtDescending)
        .slice(0, 200)
        .map((transaction) => {
          const manifest = manifestByChainId.get(transaction.chainId);

          if (!manifest) {
            throw new NotFoundException(
              `deployment manifest not found for chain ${transaction.chainId}`
            );
          }

          const indexedTransaction =
            indexedTransactionByChainAndHash.get(
              `${transaction.chainId}:${transaction.transactionHash}`
            ) ?? null;
          const settlementPreparation =
            settlementPreparationByRequestId.get(
              transaction.dealMilestoneSettlementRequestId
            ) ?? null;
          const expectedAgreementAddress =
            settlementPreparation?.agreementAddress ??
            transaction.reconciledAgreementAddress ??
            null;
          const resolvedState = resolveSettlementExecutionTransactionState({
            agreementAddress: expectedAgreementAddress,
            indexedTransaction,
            settlementExecutionTransaction: transaction
          });
          const observation = buildSettlementExecutionTransactionObservation(
            indexedTransaction
          );
          const stalePendingState =
            resolveSettlementExecutionTransactionStalePendingState({
              currentStatus: resolvedState.status,
              evaluatedAt: staleEvaluatedAt,
              indexerFreshnessTtlSeconds:
                this.configuration.indexerFreshnessTtlSeconds,
              pendingStaleAfterSeconds:
                this.configuration.settlementExecutionPendingStaleAfterSeconds,
              release4ChainCursor:
                chainCursorByChainId.get(transaction.chainId) ?? null,
              settlementExecutionTransaction: transaction
            });
          const supersededByTransaction =
            transaction.supersededByDealMilestoneSettlementExecutionTransactionId
              ? settlementTransactionById.get(
                  transaction.supersededByDealMilestoneSettlementExecutionTransactionId
                ) ?? null
              : null;
          const settlementRequest =
            settlementRequestById.get(transaction.dealMilestoneSettlementRequestId) ??
            null;
          const milestone =
            milestoneById.get(transaction.dealVersionMilestoneId) ?? null;

          return {
            agreementAddress: resolvedState.agreementAddress,
            chainId: transaction.chainId,
            confirmedAt:
              resolvedState.confirmedAt ?? transaction.reconciledConfirmedAt,
            contractVersion: manifest.contractVersion,
            dealMilestoneSettlementRequestId:
              transaction.dealMilestoneSettlementRequestId,
            dealVersionId: transaction.dealVersionId,
            dealVersionMilestoneId: transaction.dealVersionMilestoneId,
            dealVersionTitle:
              versionById.get(transaction.dealVersionId)?.title ?? null,
            draftDealId: transaction.draftDealId,
            draftDealTitle: draftById.get(transaction.draftDealId)?.title ?? null,
            explorerUrl: manifest.explorerUrl,
            id: transaction.id,
            indexedAt: observation.indexedAt,
            indexedBlockNumber: observation.indexedBlockNumber,
            indexedExecutionStatus: observation.indexedExecutionStatus,
            matchesTrackedAgreement:
              resolvedState.matchesTrackedAgreement ??
              transaction.reconciledMatchesTrackedAgreement,
            milestonePosition:
              milestone?.position ?? settlementPreparation?.milestonePosition ?? null,
            milestoneTitle: milestone?.title ?? null,
            network: manifest.network,
            organizationId: transaction.organizationId,
            organizationName:
              organizationById.get(transaction.organizationId)?.name ?? null,
            reconciledAt: transaction.reconciledAt,
            reconciledStatus: transaction.reconciledStatus,
            requestKind:
              settlementRequest?.kind ?? settlementPreparation?.kind ?? null,
            stalePending: stalePendingState.stalePending,
            stalePendingAt: stalePendingState.stalePendingAt,
            stalePendingEscalatedAt: transaction.stalePendingEscalatedAt,
            stalePendingEvaluation: stalePendingState.stalePendingEvaluation,
            status: resolvedState.status,
            submittedAt: transaction.submittedAt,
            submittedByUserId: transaction.submittedByUserId,
            submittedWalletAddress: transaction.submittedWalletAddress,
            supersededAt: transaction.supersededAt,
            supersededByDealMilestoneSettlementExecutionTransactionId:
              transaction.supersededByDealMilestoneSettlementExecutionTransactionId,
            supersededByTransactionHash:
              supersededByTransaction?.transactionHash ?? null,
            transactionHash: transaction.transactionHash
          };
        })
    };
  }

  async getHealth(
    requestMetadata: RequestMetadata
  ): Promise<OperatorHealthResponse> {
    await this.requireOperatorContext(requestMetadata);
    const manifests = this.getVisibleDeploymentManifests();
    const [workerProbe, indexerProbe, chainSummaries] = await Promise.all([
      this.probeRemoteHealth(this.configuration.workerBaseUrl),
      this.probeRemoteHealth(this.configuration.indexerBaseUrl),
      Promise.all(
        manifests.map(async (manifest) => {
          const cursorKey = buildRelease4CursorKey(manifest, this.configuration);
          const cursor =
            await this.release4Repositories.chainCursors.findByChainIdAndCursorKey(
              manifest.chainId,
              cursorKey
            );
          const cursorFresh =
            cursor != null &&
            Date.now() - new Date(cursor.updatedAt).getTime() <=
              this.configuration.indexerFreshnessTtlSeconds * 1000;

          return {
            chainId: manifest.chainId,
            contractVersion: manifest.contractVersion,
            cursorFresh,
            cursorKey,
            cursorUpdatedAt: cursor?.updatedAt ?? null,
            deploymentStartBlock: manifest.deploymentStartBlock,
            network: manifest.network
          };
        })
      )
    ]);
    const manifest = getDeploymentManifestByChainId(this.configuration.chainId);
    const primaryChainSummary =
      chainSummaries.find((entry) => entry.chainId === this.configuration.chainId) ?? null;
    const freshVisibleChainCount = chainSummaries.filter(
      (entry) => entry.cursorFresh
    ).length;
    const staleVisibleChainCount = chainSummaries.length - freshVisibleChainCount;

    return {
      api: {
        details: { ready: true },
        ready: true,
        service: "api",
        status: "HEALTHY"
      },
      cursorFresh:
        chainSummaries.length > 0 && staleVisibleChainCount === 0,
      cursorUpdatedAt: primaryChainSummary?.cursorUpdatedAt ?? null,
      freshVisibleChainCount,
      indexer: this.toRemoteServiceHealth("indexer", indexerProbe),
      manifest: manifest
        ? {
            chainId: manifest.chainId,
            contractVersion: manifest.contractVersion,
            deploymentStartBlock: manifest.deploymentStartBlock,
            network: manifest.network
          }
        : null,
      staleVisibleChainCount,
      visibleChains: chainSummaries,
      visibleChainCount: chainSummaries.length,
      worker: this.toRemoteServiceHealth("worker", workerProbe)
    };
  }

  async getReconciliation(
    requestMetadata: RequestMetadata
  ): Promise<OperatorReconciliationResponse> {
    await this.requireOperatorContext(requestMetadata);
    const visibleChainIds = new Set(this.getVisibleChainIds());
    const [
      fundingTransactions,
      settlementTransactions,
      disputes,
      alerts,
      checkpoints,
      cases,
      sponsorshipRequests
    ] =
      await Promise.all([
        this.listByVisibleChainIds((chainId) =>
          this.release1Repositories.fundingTransactions.listByChainId(chainId)
        ),
        this.listByVisibleChainIds((chainId) =>
          this.release1Repositories.dealMilestoneSettlementExecutionTransactions.listByChainId(
            chainId
          )
        ),
        this.release1Repositories.dealMilestoneDisputes.listAll(),
        this.release8Repositories.operatorAlerts.listAll(),
        this.release8Repositories.complianceCheckpoints.listAll(),
        this.release8Repositories.complianceCases.listAll(),
        this.release12Repositories.sponsoredTransactionRequests.listAll()
      ]);
    const visibleSponsorshipRequests = sponsorshipRequests.filter((entry) =>
      visibleChainIds.has(entry.chainId)
    );
    const visibleSponsorshipRequestsById = new Map(
      visibleSponsorshipRequests.map((entry) => [entry.id, entry] as const)
    );

    const staleFunding = fundingTransactions.filter(
      (entry) =>
        entry.stalePendingEscalatedAt !== null && entry.reconciledStatus === null
    );
    const failedFunding = fundingTransactions.filter(
      (entry) => entry.reconciledStatus === "FAILED"
    );
    const mismatchedFunding = fundingTransactions.filter(
      (entry) => entry.reconciledStatus === "MISMATCHED"
    );
    const staleSettlement = settlementTransactions.filter(
      (entry) =>
        entry.stalePendingEscalatedAt !== null && entry.reconciledStatus === null
    );
    const failedSettlement = settlementTransactions.filter(
      (entry) => entry.reconciledStatus === "FAILED"
    );
    const mismatchedSettlement = settlementTransactions.filter(
      (entry) => entry.reconciledStatus === "MISMATCHED"
    );

    let openDisputeCount = 0;
    for (const dispute of disputes) {
      const decision =
        await this.release1Repositories.dealMilestoneDisputeDecisions.findByDealMilestoneDisputeId(
          dispute.id
        );
      if (!decision) {
        openDisputeCount += 1;
      }
    }

    const staleSponsoredReviewAlerts = alerts.filter(
      (entry) =>
        entry.kind === "SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW" &&
        entry.status !== "RESOLVED"
    );

    const queue = [
      ...staleSponsoredReviewAlerts.map((entry) => {
        const requestId = readStringMetadataValue(entry.metadata, "requestId");
        const sponsorshipRequest = requestId
          ? visibleSponsorshipRequestsById.get(requestId) ?? null
          : null;

        return {
          agreementAddress: entry.agreementAddress,
          chainId: sponsorshipRequest?.chainId ?? null,
          entityId: requestId ?? entry.subjectId,
          kind: entry.kind,
          organizationId: entry.organizationId,
          status: entry.status === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : "STALE_PENDING_REVIEW",
          subject: buildSubjectSummary({
            agreementAddress: entry.agreementAddress,
            dealVersionId: entry.dealVersionId,
            draftDealId: entry.draftDealId,
            label: entry.subjectLabel,
            organizationId: entry.organizationId,
            subjectId: entry.subjectId,
            subjectType: entry.subjectType
          }),
          updatedAt: entry.lastDetectedAt
        };
      }),
      ...staleFunding.map((entry) => ({
        agreementAddress: entry.reconciledAgreementAddress,
        chainId: entry.chainId,
        entityId: entry.id,
        kind: "FUNDING_TRANSACTION_STALE_PENDING",
        organizationId: entry.organizationId,
        status: "STALE_PENDING",
        subject: buildSubjectSummary({
          draftDealId: entry.draftDealId,
          organizationId: entry.organizationId,
          subjectId: entry.id,
          subjectType: "FUNDING_TRANSACTION"
        }),
        updatedAt: entry.stalePendingEscalatedAt ?? entry.submittedAt
      })),
      ...failedFunding.map((entry) => ({
        agreementAddress: entry.reconciledAgreementAddress,
        chainId: entry.chainId,
        entityId: entry.id,
        kind: "FUNDING_TRANSACTION_FAILED",
        organizationId: entry.organizationId,
        status: "FAILED",
        subject: buildSubjectSummary({
          draftDealId: entry.draftDealId,
          organizationId: entry.organizationId,
          subjectId: entry.id,
          subjectType: "FUNDING_TRANSACTION"
        }),
        updatedAt: entry.reconciledAt ?? entry.submittedAt
      })),
      ...mismatchedFunding.map((entry) => ({
        agreementAddress: entry.reconciledAgreementAddress,
        chainId: entry.chainId,
        entityId: entry.id,
        kind: "FUNDING_TRANSACTION_MISMATCHED",
        organizationId: entry.organizationId,
        status: "MISMATCHED",
        subject: buildSubjectSummary({
          draftDealId: entry.draftDealId,
          organizationId: entry.organizationId,
          subjectId: entry.id,
          subjectType: "FUNDING_TRANSACTION"
        }),
        updatedAt: entry.reconciledAt ?? entry.submittedAt
      })),
      ...staleSettlement.map((entry) => ({
        agreementAddress: entry.reconciledAgreementAddress,
        chainId: entry.chainId,
        entityId: entry.id,
        kind: "SETTLEMENT_EXECUTION_STALE_PENDING",
        organizationId: entry.organizationId,
        status: "STALE_PENDING",
        subject: buildSubjectSummary({
          agreementAddress: entry.reconciledAgreementAddress,
          dealVersionId: entry.dealVersionId,
          draftDealId: entry.draftDealId,
          organizationId: entry.organizationId,
          subjectId: entry.id,
          subjectType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
        }),
        updatedAt: entry.stalePendingEscalatedAt ?? entry.submittedAt
      })),
      ...failedSettlement.map((entry) => ({
        agreementAddress: entry.reconciledAgreementAddress,
        chainId: entry.chainId,
        entityId: entry.id,
        kind: "SETTLEMENT_EXECUTION_FAILED",
        organizationId: entry.organizationId,
        status: "FAILED",
        subject: buildSubjectSummary({
          agreementAddress: entry.reconciledAgreementAddress,
          dealVersionId: entry.dealVersionId,
          draftDealId: entry.draftDealId,
          organizationId: entry.organizationId,
          subjectId: entry.id,
          subjectType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
        }),
        updatedAt: entry.reconciledAt ?? entry.submittedAt
      })),
      ...mismatchedSettlement.map((entry) => ({
        agreementAddress: entry.reconciledAgreementAddress,
        chainId: entry.chainId,
        entityId: entry.id,
        kind: "SETTLEMENT_EXECUTION_MISMATCHED",
        organizationId: entry.organizationId,
        status: "MISMATCHED",
        subject: buildSubjectSummary({
          agreementAddress: entry.reconciledAgreementAddress,
          dealVersionId: entry.dealVersionId,
          draftDealId: entry.draftDealId,
          organizationId: entry.organizationId,
          subjectId: entry.id,
          subjectType: "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
        }),
        updatedAt: entry.reconciledAt ?? entry.submittedAt
      }))
    ].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );

    return {
      failedFundingCount: failedFunding.length,
      failedSettlementExecutionCount: failedSettlement.length,
      mismatchedFundingCount: mismatchedFunding.length,
      mismatchedSettlementExecutionCount: mismatchedSettlement.length,
      openDisputeCount,
      queue: queue.slice(0, 100),
      staleFundingCount: staleFunding.length,
      staleSettlementExecutionCount: staleSettlement.length,
      unresolvedOperatorReviewCount:
        alerts.filter(
          (entry) =>
            entry.status !== "RESOLVED" &&
            entry.kind !== "SPONSORED_TRANSACTION_REQUEST_STALE_PENDING_REVIEW"
        ).length +
        checkpoints.filter((entry) => entry.status === "PENDING").length +
        cases.filter((entry) => entry.status !== "RESOLVED").length +
        visibleSponsorshipRequests.filter((entry) => entry.status === "PENDING").length
    };
  }

  async listAlerts(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorAlertsResponse> {
    const params = parseInput(listOperatorAlertsParamsSchema, input);
    await this.requireOperatorContext(requestMetadata);
    const alerts = await this.release8Repositories.operatorAlerts.listAll();

    return {
      alerts: alerts
        .filter((entry) => !params.kind || entry.kind === params.kind)
        .filter((entry) => !params.status || entry.status === params.status)
        .map(toAlertSummary)
    };
  }

  async listSponsoredTransactionRequests(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorSponsoredTransactionRequestsResponse> {
    const params = parseInput(listOperatorSponsoredTransactionRequestsParamsSchema, input);
    await this.requireOperatorContext(requestMetadata);
    const requests = await this.release12Repositories.sponsoredTransactionRequests.listAll();
    const filtered = requests
      .filter((entry) => !params.kind || entry.kind === params.kind)
      .filter((entry) => !params.status || entry.status === params.status);

    return {
      sponsoredTransactionRequests: await Promise.all(
        filtered.map((entry) => this.toOperatorSponsoredTransactionRequestSummary(entry))
      )
    };
  }

  async decideSponsoredTransactionRequest(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorSponsoredTransactionRequestsResponse["sponsoredTransactionRequests"][number]> {
    const params = parseInput(operatorSponsoredTransactionRequestParamsSchema, paramsInput);
    const parsedInput = parseInput(decideSponsoredTransactionRequestSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireSponsoredTransactionPermission(context.permissions);
    const request = await this.requireSponsoredTransactionRequest(
      params.sponsoredTransactionRequestId
    );

    if (request.status !== "PENDING") {
      throw new ConflictException("sponsored transaction request is already decided");
    }

    const now = new Date().toISOString();
    let reason: string | null = request.reason;
    let expiresAt = request.expiresAt;

    if (parsedInput.status === "APPROVED") {
      const gasPolicyId = request.gasPolicyId;
      if (!gasPolicyId) {
        throw new ConflictException("sponsored transaction request has no gas policy");
      }

      const gasPolicy = await this.release12Repositories.gasPolicies.findById(gasPolicyId);
      if (!gasPolicy || gasPolicy.organizationId !== request.organizationId || !gasPolicy.active) {
        throw new ConflictException("linked gas policy is not active");
      }

      const policyReason = await this.evaluateSponsoredTransactionRequestAgainstGasPolicy(
        request,
        gasPolicy,
        now
      );
      if (policyReason) {
        throw new ConflictException(policyReason);
      }

      reason = null;
      expiresAt = addMinutes(now, gasPolicy.sponsorWindowMinutes);
    } else {
      reason = parsedInput.note?.trim() ?? null;
    }

    const updated = await this.release12Repositories.sponsoredTransactionRequests.update(
      request.id,
      {
        approvedAt: parsedInput.status === "APPROVED" ? now : null,
        decidedByOperatorAccountId: context.operatorAccount.id,
        expiresAt,
        reason,
        rejectedAt: parsedInput.status === "REJECTED" ? now : null,
        status: parsedInput.status,
        updatedAt: now
      }
    );

    await this.release1Repositories.auditLogs.append({
      action:
        parsedInput.status === "APPROVED"
          ? "SPONSORED_TRANSACTION_REQUEST_APPROVED"
          : "SPONSORED_TRANSACTION_REQUEST_REJECTED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "SPONSORED_TRANSACTION_REQUEST",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        note: parsedInput.note?.trim() ?? null,
        status: updated.status
      },
      occurredAt: now,
      organizationId: updated.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return this.toOperatorSponsoredTransactionRequestSummary(updated);
  }

  async acknowledgeAlert(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorAlertsResponse["alerts"][number]> {
    const params = parseInput(operatorAlertActionParamsSchema, paramsInput);
    const parsedInput = parseInput(acknowledgeOperatorAlertSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireAlertPermission(context.permissions);
    const alert = await this.requireAlert(params.alertId);
    const now = new Date().toISOString();

    const updated = await this.release8Repositories.operatorAlerts.update(alert.id, {
      acknowledgedAt: now,
      acknowledgedByOperatorAccountId: context.operatorAccount.id,
      metadata: {
        ...(alert.metadata ?? {}),
        acknowledgedNote: parsedInput.note ?? null
      },
      status: alert.status === "RESOLVED" ? "OPEN" : "ACKNOWLEDGED"
    });

    await this.release1Repositories.auditLogs.append({
      action: "OPERATOR_ALERT_ACKNOWLEDGED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "OPERATOR_ALERT",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        note: parsedInput.note ?? null,
        status: updated.status
      },
      occurredAt: now,
      organizationId: updated.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return toAlertSummary(updated);
  }

  async resolveAlert(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListOperatorAlertsResponse["alerts"][number]> {
    const params = parseInput(operatorAlertActionParamsSchema, paramsInput);
    const parsedInput = parseInput(resolveOperatorAlertSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireAlertPermission(context.permissions);
    const alert = await this.requireAlert(params.alertId);
    const now = new Date().toISOString();

    const updated = await this.release8Repositories.operatorAlerts.update(alert.id, {
      acknowledgedAt: alert.acknowledgedAt ?? now,
      acknowledgedByOperatorAccountId:
        alert.acknowledgedByOperatorAccountId ?? context.operatorAccount.id,
      metadata: {
        ...(alert.metadata ?? {}),
        resolutionNote: parsedInput.note
      },
      resolvedAt: now,
      resolvedByOperatorAccountId: context.operatorAccount.id,
      status: "RESOLVED"
    });

    await this.release1Repositories.auditLogs.append({
      action: "OPERATOR_ALERT_RESOLVED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "OPERATOR_ALERT",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        note: parsedInput.note
      },
      occurredAt: now,
      organizationId: updated.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return toAlertSummary(updated);
  }

  async listCheckpoints(
    requestMetadata: RequestMetadata
  ): Promise<ListComplianceCheckpointsResponse> {
    await this.requireOperatorContext(requestMetadata);
    const checkpoints = await this.release8Repositories.complianceCheckpoints.listAll();

    return {
      checkpoints: checkpoints.map(toCheckpointSummary)
    };
  }

  async createCheckpoint(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCheckpointSummary> {
    const parsedInput = parseInput(createComplianceCheckpointSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireCheckpointPermission(context.permissions);
    const subject = await this.loadSubjectSummary(
      parsedInput.subjectType,
      parsedInput.subjectId
    );
    const now = new Date().toISOString();

    const checkpoint = await this.release8Repositories.complianceCheckpoints.create({
      agreementAddress: subject.agreementAddress,
      createdAt: now,
      createdByOperatorAccountId: context.operatorAccount.id,
      dealVersionId: subject.dealVersionId,
      decidedAt: null,
      decidedByOperatorAccountId: null,
      decisionNote: null,
      draftDealId: subject.draftDealId,
      id: randomUUID(),
      kind: parsedInput.kind,
      linkedComplianceCaseId: null,
      note: parsedInput.note,
      organizationId: subject.organizationId,
      status: "PENDING",
      subjectId: parsedInput.subjectId,
      subjectLabel: subject.label,
      subjectType: parsedInput.subjectType
    });

    await this.release1Repositories.auditLogs.append({
      action: "COMPLIANCE_CHECKPOINT_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: checkpoint.id,
      entityType: "COMPLIANCE_CHECKPOINT",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        kind: checkpoint.kind,
        subjectId: checkpoint.subjectId,
        subjectType: checkpoint.subjectType
      },
      occurredAt: now,
      organizationId: checkpoint.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return toCheckpointSummary(checkpoint);
  }

  async decideCheckpoint(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCheckpointSummary> {
    const params = parseInput(complianceCheckpointParamsSchema, paramsInput);
    const parsedInput = parseInput(decideComplianceCheckpointSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireCheckpointPermission(context.permissions);
    const checkpoint = await this.requireCheckpoint(params.checkpointId);
    const now = new Date().toISOString();

    const updated = await this.release8Repositories.complianceCheckpoints.update(
      checkpoint.id,
      {
        decidedAt: now,
        decidedByOperatorAccountId: context.operatorAccount.id,
        decisionNote: parsedInput.note,
        status: parsedInput.status
      }
    );

    await this.release1Repositories.auditLogs.append({
      action: "COMPLIANCE_CHECKPOINT_DECIDED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "COMPLIANCE_CHECKPOINT",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        note: parsedInput.note,
        status: parsedInput.status
      },
      occurredAt: now,
      organizationId: updated.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return toCheckpointSummary(updated);
  }

  async listCases(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ListComplianceCasesResponse> {
    const params = parseInput(listComplianceCasesParamsSchema, input);
    await this.requireOperatorContext(requestMetadata);
    const cases = await this.release8Repositories.complianceCases.listAll();
    const notes = await Promise.all(
      cases.map((entry) =>
        this.release8Repositories.complianceCaseNotes.listByComplianceCaseId(entry.id)
      )
    );

    return {
      cases: cases
        .filter((entry) => !params.status || entry.status === params.status)
        .map((entry, index) => {
          const caseNotes = notes[index] ?? [];

          return {
            ...toCaseSummary(entry),
            lastNoteAt: caseNotes.at(-1)?.createdAt ?? null
          };
        })
    };
  }

  async createCase(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCaseSummary> {
    const parsedInput = parseInput(createComplianceCaseSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireCasePermission(context.permissions);
    const subject = await this.loadSubjectSummary(
      parsedInput.subjectType,
      parsedInput.subjectId
    );
    const now = new Date().toISOString();

    if (parsedInput.alertId) {
      await this.requireAlert(parsedInput.alertId);
    }

    if (parsedInput.checkpointId) {
      await this.requireCheckpoint(parsedInput.checkpointId);
    }

    const created = await this.release8Repositories.complianceCases.create({
      agreementAddress: subject.agreementAddress,
      assignedOperatorAccountId: null,
      createdAt: now,
      createdByOperatorAccountId: context.operatorAccount.id,
      dealVersionId: subject.dealVersionId,
      draftDealId: subject.draftDealId,
      id: randomUUID(),
      linkedAlertId: parsedInput.alertId ?? null,
      linkedCheckpointId: parsedInput.checkpointId ?? null,
      organizationId: subject.organizationId,
      resolvedAt: null,
      severity: parsedInput.severity,
      status: "OPEN",
      subjectId: parsedInput.subjectId,
      subjectLabel: subject.label,
      subjectType: parsedInput.subjectType,
      summary: parsedInput.summary,
      title: parsedInput.title,
      updatedAt: now
    });

    if (created.linkedAlertId) {
      await this.release8Repositories.operatorAlerts.update(created.linkedAlertId, {
        linkedComplianceCaseId: created.id
      });
    }

    if (created.linkedCheckpointId) {
      await this.release8Repositories.complianceCheckpoints.update(
        created.linkedCheckpointId,
        {
          linkedComplianceCaseId: created.id
        }
      );
    }

    await this.release1Repositories.auditLogs.append({
      action: "COMPLIANCE_CASE_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: created.id,
      entityType: "COMPLIANCE_CASE",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        linkedAlertId: created.linkedAlertId,
        linkedCheckpointId: created.linkedCheckpointId,
        severity: created.severity,
        subjectId: created.subjectId,
        subjectType: created.subjectType
      },
      occurredAt: now,
      organizationId: created.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return toCaseSummary(created);
  }

  async getCase(
    paramsInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCaseDetailResponse> {
    const params = parseInput(complianceCaseParamsSchema, paramsInput);
    await this.requireOperatorContext(requestMetadata);
    const record = await this.requireCase(params.caseId);
    const notes = await this.release8Repositories.complianceCaseNotes.listByComplianceCaseId(
      record.id
    );

    return {
      case: {
        ...toCaseSummary(record),
        lastNoteAt: notes.at(-1)?.createdAt ?? null
      },
      notes: notes.map((note) => ({
        authorOperatorAccountId: note.authorOperatorAccountId,
        bodyMarkdown: note.bodyMarkdown,
        createdAt: note.createdAt,
        id: note.id
      }))
    };
  }

  async addCaseNote(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCaseDetailResponse> {
    const params = parseInput(complianceCaseParamsSchema, paramsInput);
    const parsedInput = parseInput(addComplianceCaseNoteSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireCasePermission(context.permissions);
    const existing = await this.requireCase(params.caseId);
    const now = new Date().toISOString();

    await this.release8Repositories.complianceCaseNotes.create({
      authorOperatorAccountId: context.operatorAccount.id,
      bodyMarkdown: parsedInput.bodyMarkdown,
      complianceCaseId: existing.id,
      createdAt: now,
      id: randomUUID()
    });
    await this.release8Repositories.complianceCases.update(existing.id, {
      updatedAt: now
    });

    await this.release1Repositories.auditLogs.append({
      action: "COMPLIANCE_CASE_NOTE_ADDED",
      actorUserId: context.operatorAccount.userId,
      entityId: existing.id,
      entityType: "COMPLIANCE_CASE",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        noteLength: parsedInput.bodyMarkdown.length
      },
      occurredAt: now,
      organizationId: existing.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    return this.getCase(params, requestMetadata);
  }

  async assignCase(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCaseSummary> {
    const params = parseInput(complianceCaseParamsSchema, paramsInput);
    const parsedInput = parseInput(assignComplianceCaseSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireCasePermission(context.permissions);
    const existing = await this.requireCase(params.caseId);
    const now = new Date().toISOString();

    if (parsedInput.assignedOperatorAccountId) {
      const operator = await this.release8Repositories.operatorAccounts.findById(
        parsedInput.assignedOperatorAccountId
      );
      if (!operator || !operator.active) {
        throw new NotFoundException("operator account not found");
      }
    }

    const updated = await this.release8Repositories.complianceCases.update(existing.id, {
      assignedOperatorAccountId: parsedInput.assignedOperatorAccountId,
      updatedAt: now
    });

    await this.release1Repositories.auditLogs.append({
      action: "COMPLIANCE_CASE_ASSIGNED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "COMPLIANCE_CASE",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        assignedOperatorAccountId: parsedInput.assignedOperatorAccountId
      },
      occurredAt: now,
      organizationId: updated.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    const notes = await this.release8Repositories.complianceCaseNotes.listByComplianceCaseId(
      updated.id
    );

    return {
      ...toCaseSummary(updated),
      lastNoteAt: notes.at(-1)?.createdAt ?? null
    };
  }

  async updateCaseStatus(
    paramsInput: unknown,
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ComplianceCaseSummary> {
    const params = parseInput(complianceCaseParamsSchema, paramsInput);
    const parsedInput = parseInput(updateComplianceCaseStatusSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireCasePermission(context.permissions);
    const existing = await this.requireCase(params.caseId);
    const now = new Date().toISOString();

    const updated = await this.release8Repositories.complianceCases.update(existing.id, {
      resolvedAt: parsedInput.status === "RESOLVED" ? now : null,
      status: parsedInput.status,
      updatedAt: now
    });

    await this.release1Repositories.auditLogs.append({
      action: "COMPLIANCE_CASE_STATUS_UPDATED",
      actorUserId: context.operatorAccount.userId,
      entityId: updated.id,
      entityType: "COMPLIANCE_CASE",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        status: parsedInput.status
      },
      occurredAt: now,
      organizationId: updated.organizationId,
      userAgent: context.requestMetadata.userAgent
    });

    const notes = await this.release8Repositories.complianceCaseNotes.listByComplianceCaseId(
      updated.id
    );

    return {
      ...toCaseSummary(updated),
      lastNoteAt: notes.at(-1)?.createdAt ?? null
    };
  }

  async listProtocolProposals(
    requestMetadata: RequestMetadata
  ): Promise<ListProtocolProposalDraftsResponse> {
    await this.requireOperatorContext(requestMetadata);
    const proposals = await this.release8Repositories.protocolProposalDrafts.listAll();

    return {
      proposals: proposals.map(toProtocolProposalSummary)
    };
  }

  async createProtocolProposalDraft(
    input: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ProtocolProposalDraftDetailResponse> {
    const parsedInput = parseInput(createProtocolProposalDraftSchema, input);
    const context = await this.requireOperatorContext(requestMetadata);
    this.requireProtocolAdminPermission(context.permissions);
    const manifest = getDeploymentManifestByChainId(parsedInput.chainId);

    if (!manifest) {
      throw new ConflictException("deployment manifest is unavailable");
    }

    const { calldata, targetAddress } =
      await this.buildProtocolProposalCalldata(parsedInput);
    const now = new Date().toISOString();
    const proposal = await this.release8Repositories.protocolProposalDrafts.create({
      action: parsedInput.action,
      calldata,
      chainId: parsedInput.chainId,
      createdAt: now,
      createdByOperatorAccountId: context.operatorAccount.id,
      description: parsedInput.description,
      id: randomUUID(),
      input: parsedInput.input,
      target: parsedInput.target,
      targetAddress,
      value: "0"
    });

    await this.release1Repositories.auditLogs.append({
      action: "PROTOCOL_PROPOSAL_DRAFT_CREATED",
      actorUserId: context.operatorAccount.userId,
      entityId: proposal.id,
      entityType: "PROTOCOL_PROPOSAL_DRAFT",
      id: randomUUID(),
      ipAddress: context.requestMetadata.ipAddress,
      metadata: {
        action: proposal.action,
        chainId: proposal.chainId,
        target: proposal.target,
        targetAddress: proposal.targetAddress
      },
      occurredAt: now,
      organizationId: null,
      userAgent: context.requestMetadata.userAgent
    });

    return {
      proposal: toProtocolProposalSummary(proposal)
    };
  }

  async getProtocolProposalDraft(
    paramsInput: unknown,
    requestMetadata: RequestMetadata
  ): Promise<ProtocolProposalDraftDetailResponse> {
    const params = parseInput(protocolProposalDraftParamsSchema, paramsInput);
    await this.requireOperatorContext(requestMetadata);
    const proposal = await this.release8Repositories.protocolProposalDrafts.findById(
      params.proposalId
    );

    if (!proposal) {
      throw new NotFoundException("protocol proposal draft not found");
    }

    return {
      proposal: toProtocolProposalSummary(proposal)
    };
  }

  private async buildProtocolProposalCalldata(
    input: CreateProtocolProposalDraftInput
  ): Promise<{ calldata: `0x${string}`; targetAddress: `0x${string}` }> {
    const targetAddress = await this.resolveProtocolTargetAddress(
      input.chainId,
      input.target
    );

    switch (input.action) {
      case "ALLOW_TOKEN":
      case "DISALLOW_TOKEN": {
        this.assertProtocolActionTarget(input.action, input.target, "TokenAllowlist");
        const token = this.requireAddressInput(input.input, "token");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.TokenAllowlist.abi as Abi,
            args: [token, input.action === "ALLOW_TOKEN"],
            functionName: "setTokenAllowed"
          }),
          targetAddress
        };
      }
      case "APPROVE_ARBITRATOR":
      case "REVOKE_ARBITRATOR": {
        this.assertProtocolActionTarget(
          input.action,
          input.target,
          "ArbitratorRegistry"
        );
        const arbitrator = this.requireAddressInput(input.input, "arbitrator");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ArbitratorRegistry.abi as Abi,
            args: [arbitrator, input.action === "APPROVE_ARBITRATOR"],
            functionName: "setArbitratorApproved"
          }),
          targetAddress
        };
      }
      case "SET_TOKEN_ALLOWLIST":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [this.requireAddressInput(input.input, "newTokenAllowlist")],
            functionName: "setTokenAllowlist"
          }),
          targetAddress
        };
      case "SET_ARBITRATOR_REGISTRY":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [this.requireAddressInput(input.input, "newArbitratorRegistry")],
            functionName: "setArbitratorRegistry"
          }),
          targetAddress
        };
      case "SET_FEE_VAULT":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [this.requireAddressInput(input.input, "newFeeVault")],
            functionName: "setFeeVault"
          }),
          targetAddress
        };
      case "SET_TREASURY":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [this.requireAddressInput(input.input, "newTreasury")],
            functionName: "setTreasury"
          }),
          targetAddress
        };
      case "SET_PROTOCOL_FEE_BPS":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [this.requireNumberInput(input.input, "newProtocolFeeBps")],
            functionName: "setProtocolFeeBps"
          }),
          targetAddress
        };
      case "PAUSE_CREATE_ESCROW":
      case "UNPAUSE_CREATE_ESCROW":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [input.action === "PAUSE_CREATE_ESCROW"],
            functionName: "setCreateEscrowPaused"
          }),
          targetAddress
        };
      case "PAUSE_FUNDING":
      case "UNPAUSE_FUNDING":
        this.assertProtocolActionTarget(input.action, input.target, "ProtocolConfig");
        return {
          calldata: encodeFunctionData({
            abi: contractArtifacts.ProtocolConfig.abi as Abi,
            args: [input.action === "PAUSE_FUNDING"],
            functionName: "setFundingPaused"
          }),
          targetAddress
        };
      default:
        throw new ConflictException("unsupported protocol proposal action");
    }
  }

  private async resolveProtocolTargetAddress(
    chainId: number,
    target: ProtocolProposalTarget
  ): Promise<`0x${string}`> {
    const manifest = getDeploymentManifestByChainId(chainId);
    if (!manifest) {
      throw new ConflictException("deployment manifest is unavailable");
    }

    if (target === "ProtocolConfig") {
      const address = manifest.contracts.ProtocolConfig;
      if (!address) {
        throw new ConflictException("protocol config address is unavailable");
      }
      return address;
    }

    const protocolConfigAddress = manifest.contracts.ProtocolConfig;
    if (!protocolConfigAddress) {
      throw new ConflictException("protocol config address is unavailable");
    }

    const state = await this.release4Repositories.protocolConfigStates.findByChainIdAndAddress(
      chainId,
      protocolConfigAddress
    );

    if (target === "TokenAllowlist") {
      const address = state?.tokenAllowlistAddress ?? manifest.contracts.TokenAllowlist;
      if (!address) {
        throw new ConflictException("token allowlist address is unavailable");
      }
      return address;
    }

    const address =
      state?.arbitratorRegistryAddress ?? manifest.contracts.ArbitratorRegistry;
    if (!address) {
      throw new ConflictException("arbitrator registry address is unavailable");
    }

    return address;
  }

  private assertProtocolActionTarget(
    action: ProtocolProposalAction,
    actualTarget: CreateProtocolProposalDraftInput["target"],
    expectedTarget: ProtocolProposalTarget
  ): void {
    if (actualTarget !== expectedTarget) {
      throw new ConflictException(
        `protocol proposal action ${action} requires target ${expectedTarget}`
      );
    }
  }

  private requireAddressInput(
    input: CreateProtocolProposalDraftInput["input"],
    key: string
  ): `0x${string}` {
    const value = input[key];
    if (typeof value !== "string" || !value.startsWith("0x")) {
      throw new ConflictException(`expected ${key} to be a hex address string`);
    }

    return value as `0x${string}`;
  }

  private requireNumberInput(
    input: CreateProtocolProposalDraftInput["input"],
    key: string
  ): number {
    const value = input[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      throw new ConflictException(`expected ${key} to be a non-negative integer`);
    }

    return value;
  }

  private async requireOperatorContext(
    requestMetadata: RequestMetadata
  ): Promise<OperatorContext> {
    const session = await this.authenticatedSessionService.requireContext(
      requestMetadata.cookieHeader
    );
    const operatorAccount =
      await this.release8Repositories.operatorAccounts.findActiveByWalletId(
        session.wallet.id
      );

    if (
      !operatorAccount ||
      operatorAccount.userId !== session.user.id ||
      !operatorAccount.active
    ) {
      throw new ForbiddenException("operator access is required");
    }

    return {
      operatorAccount,
      permissions: buildPermissions(operatorAccount.role),
      requestMetadata,
      sessionWallet: session.wallet
    };
  }

  private async requireAlert(alertId: string): Promise<OperatorAlertRecord> {
    const alert = await this.release8Repositories.operatorAlerts.findById(alertId);
    if (!alert) {
      throw new NotFoundException("operator alert not found");
    }

    return alert;
  }

  private async requireSponsoredTransactionRequest(
    sponsoredTransactionRequestId: string
  ): Promise<SponsoredTransactionRequestRecord> {
    const request =
      await this.release12Repositories.sponsoredTransactionRequests.findById(
        sponsoredTransactionRequestId
      );
    if (!request) {
      throw new NotFoundException("sponsored transaction request not found");
    }

    return request;
  }

  private async requireCheckpoint(
    checkpointId: string
  ): Promise<ComplianceCheckpointRecord> {
    const checkpoint =
      await this.release8Repositories.complianceCheckpoints.findById(checkpointId);
    if (!checkpoint) {
      throw new NotFoundException("compliance checkpoint not found");
    }

    return checkpoint;
  }

  private async requireCase(caseId: string): Promise<ComplianceCaseRecord> {
    const record = await this.release8Repositories.complianceCases.findById(caseId);
    if (!record) {
      throw new NotFoundException("compliance case not found");
    }

    return record;
  }

  private async toOperatorSponsoredTransactionRequestSummary(
    record: SponsoredTransactionRequestRecord
  ): Promise<ListOperatorSponsoredTransactionRequestsResponse["sponsoredTransactionRequests"][number]> {
    const subject = await this.loadSponsoredTransactionRequestSubjectSummary(record);

    return {
      amountMinor: record.amountMinor,
      approvedAt: record.approvedAt,
      chainId: record.chainId,
      createdAt: record.createdAt,
      decidedByOperatorAccountId: record.decidedByOperatorAccountId,
      expiresAt: record.expiresAt,
      gasPolicyId: record.gasPolicyId,
      id: record.id,
      kind: record.kind,
      organizationId: record.organizationId,
      reason: record.reason,
      rejectedAt: record.rejectedAt,
      requestedByUserId: record.requestedByUserId,
      status: record.status,
      subject,
      submittedAt: record.submittedAt,
      submittedTransactionHash: record.submittedTransactionHash,
      walletAddress: record.walletAddress
    };
  }

  private async loadSponsoredTransactionRequestSubjectSummary(
    record: SponsoredTransactionRequestRecord
  ): Promise<OperatorSubjectSummary> {
    if (record.subjectType === "DEAL_VERSION") {
      const version = await this.release1Repositories.dealVersions.findById(record.subjectId);
      if (version) {
        return buildSubjectSummary({
          dealVersionId: version.id,
          draftDealId: version.draftDealId,
          label: version.title,
          organizationId: version.organizationId,
          subjectId: version.draftDealId,
          subjectType: "DRAFT_DEAL"
        });
      }
    }

    const settlementRequest =
      await this.release1Repositories.dealMilestoneSettlementRequests.findById(record.subjectId);
    if (settlementRequest) {
      return buildSubjectSummary({
        dealVersionId: settlementRequest.dealVersionId,
        draftDealId: settlementRequest.draftDealId,
        label: settlementRequest.statementMarkdown,
        organizationId: settlementRequest.organizationId,
        subjectId: settlementRequest.draftDealId,
        subjectType: "DRAFT_DEAL"
      });
    }

    return buildSubjectSummary({
      dealVersionId: record.dealVersionId,
      draftDealId: record.draftDealId,
      organizationId: record.organizationId,
      subjectId: record.draftDealId ?? record.subjectId,
      subjectType: "DRAFT_DEAL"
    });
  }

  private async evaluateSponsoredTransactionRequestAgainstGasPolicy(
    request: SponsoredTransactionRequestRecord,
    gasPolicy: GasPolicyRecord,
    evaluatedAt: string
  ): Promise<string | null> {
    if (!gasPolicy.allowedTransactionKinds.includes(request.kind)) {
      return "transaction kind is not allowed by gas policy";
    }

    if (
      gasPolicy.allowedApprovalPolicyKinds.length > 0 &&
      !gasPolicy.allowedApprovalPolicyKinds.includes(request.kind)
    ) {
      return "approval action is not allowed by gas policy";
    }

    if (!gasPolicy.allowedChainIds.includes(request.chainId)) {
      return "chain is not allowed by gas policy";
    }

    if (gasPolicy.maxAmountMinor && BigInt(request.amountMinor) > BigInt(gasPolicy.maxAmountMinor)) {
      return "requested amount exceeds gas policy limit";
    }

    const approvedToday =
      await this.release12Repositories.sponsoredTransactionRequests.countApprovedCreatedSince({
        gasPolicyId: gasPolicy.id,
        organizationId: request.organizationId,
        since: startOfUtcDayIso(evaluatedAt)
      });
    if (approvedToday >= gasPolicy.maxRequestsPerDay) {
      return "gas policy daily request budget has been exhausted";
    }

    return null;
  }

  private async buildPartnerDeliverySummary(deliveryId: string) {
    const delivery = await this.release10Repositories.partnerWebhookDeliveries.findById(
      deliveryId
    );

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

  private async requirePartnerAccount(partnerAccountId: string) {
    const partner = await this.release10Repositories.partnerAccounts.findById(partnerAccountId);

    if (!partner) {
      throw new NotFoundException("partner account not found");
    }

    return partner;
  }

  private async requirePartnerLink(partnerOrganizationLinkId: string) {
    const link =
      await this.release10Repositories.partnerOrganizationLinks.findById(
        partnerOrganizationLinkId
      );

    if (!link) {
      throw new NotFoundException("partner organization link not found");
    }

    return link;
  }

  private async requirePartnerApiKey(partnerApiKeyId: string) {
    const apiKey = await this.release10Repositories.partnerApiKeys.findById(partnerApiKeyId);

    if (!apiKey) {
      throw new NotFoundException("partner api key not found");
    }

    return apiKey;
  }

  private async requirePartnerWebhookSubscription(partnerWebhookSubscriptionId: string) {
    const subscription =
      await this.release10Repositories.partnerWebhookSubscriptions.findById(
        partnerWebhookSubscriptionId
      );

    if (!subscription) {
      throw new NotFoundException("partner webhook subscription not found");
    }

    return subscription;
  }

  private requireAlertPermission(permissions: OperatorPermissionSet): void {
    if (!permissions.canResolveAlerts) {
      throw new ForbiddenException("operator permissions are insufficient");
    }
  }

  private requireCheckpointPermission(permissions: OperatorPermissionSet): void {
    if (!permissions.canManageCheckpoints) {
      throw new ForbiddenException("operator permissions are insufficient");
    }
  }

  private requireCasePermission(permissions: OperatorPermissionSet): void {
    if (!permissions.canManageCases) {
      throw new ForbiddenException("operator permissions are insufficient");
    }
  }

  private requireSponsoredTransactionPermission(
    permissions: OperatorPermissionSet
  ): void {
    if (!permissions.canManageSponsoredTransactions) {
      throw new ForbiddenException("operator permissions are insufficient");
    }
  }

  private requireProtocolAdminPermission(
    permissions: OperatorPermissionSet
  ): void {
    if (!permissions.canManageProtocolProposals) {
      throw new ForbiddenException("operator permissions are insufficient");
    }
  }

  private async loadSubjectSummary(
    subjectType: OperatorSubjectSummary["subjectType"],
    subjectId: string
  ): Promise<OperatorSubjectSummary> {
    switch (subjectType) {
      case "DRAFT_DEAL": {
        const draft = await this.release1Repositories.draftDeals.findById(subjectId);
        if (!draft) {
          break;
        }

        return buildSubjectSummary({
          draftDealId: draft.id,
          label: draft.title,
          organizationId: draft.organizationId,
          subjectId: draft.id,
          subjectType
        });
      }
      case "DEAL_MILESTONE_DISPUTE": {
        const dispute =
          await this.release1Repositories.dealMilestoneDisputes.findById(subjectId);
        if (!dispute) {
          break;
        }

        return buildSubjectSummary({
          dealVersionId: dispute.dealVersionId,
          draftDealId: dispute.draftDealId,
          label: dispute.statementMarkdown,
          organizationId: dispute.organizationId,
          subjectId: dispute.id,
          subjectType
        });
      }
      case "FUNDING_TRANSACTION": {
        const transaction =
          await this.release1Repositories.fundingTransactions.findById(subjectId);
        if (!transaction) {
          break;
        }

        return buildSubjectSummary({
          agreementAddress: transaction.reconciledAgreementAddress,
          dealVersionId: transaction.dealVersionId,
          draftDealId: transaction.draftDealId,
          label: transaction.transactionHash,
          organizationId: transaction.organizationId,
          subjectId: transaction.id,
          subjectType
        });
      }
      case "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION": {
        const transaction =
          await this.release1Repositories.dealMilestoneSettlementExecutionTransactions.findById(
            subjectId
          );
        if (!transaction) {
          break;
        }

        return buildSubjectSummary({
          agreementAddress: transaction.reconciledAgreementAddress,
          dealVersionId: transaction.dealVersionId,
          draftDealId: transaction.draftDealId,
          label: transaction.transactionHash,
          organizationId: transaction.organizationId,
          subjectId: transaction.id,
          subjectType
        });
      }
      case "ESCROW_AGREEMENT": {
        const normalizedAddress = normalizeAgreementAddress(subjectId);

        if (!normalizedAddress) {
          break;
        }

        const agreement =
          await this.release4Repositories.escrowAgreements.findByChainIdAndAddress(
            this.configuration.chainId,
            normalizedAddress
          );
        if (!agreement) {
          break;
        }

        const drafts = await this.release1Repositories.draftDeals.listAll();
        const linkedDraft = findDraftByCanonicalDealId(drafts, agreement.dealId);

        return buildSubjectSummary({
          agreementAddress: agreement.agreementAddress,
          draftDealId: linkedDraft?.id ?? null,
          label: linkedDraft?.title ?? agreement.agreementAddress,
          organizationId: linkedDraft?.organizationId ?? null,
          subjectId: agreement.agreementAddress,
          subjectType
        });
      }
    }

    throw new NotFoundException("operator subject not found");
  }

  private async probeRemoteHealth(baseUrl: string): Promise<RemoteHealthProbe> {
    const signal = AbortSignal.timeout(this.configuration.requestTimeoutMs);

    try {
      const [liveResponse, readyResponse] = await Promise.all([
        fetch(`${baseUrl}/health/live`, { signal }),
        fetch(`${baseUrl}/health/ready`, { signal })
      ]);

      let details: JsonObject | null = null;

      try {
        const json = (await readyResponse.json()) as unknown;
        if (json && typeof json === "object" && !Array.isArray(json)) {
          details = json as JsonObject;
        }
      } catch {
        details = null;
      }

      return {
        details,
        live: liveResponse.ok,
        ready: readyResponse.ok
      };
    } catch {
      return {
        details: null,
        live: false,
        ready: false
      };
    }
  }

  private toRemoteServiceHealth(
    service: RemoteServiceHealth["service"],
    probe: RemoteHealthProbe
  ): RemoteServiceHealth {
    return {
      details: probe.details,
      ready: probe.ready,
      service,
      status: probe.live ? (probe.ready ? "HEALTHY" : "UNHEALTHY") : "UNREACHABLE"
    };
  }
}
