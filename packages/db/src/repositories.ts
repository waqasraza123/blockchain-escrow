import type {
  ChainId,
  EntityId,
  HexString,
  IsoTimestamp,
  PartnerResourceType,
  WalletAddress
} from "@blockchain-escrow/shared";

import type {
  ApprovalPolicyRecord,
  ApprovalPolicyStepRecord,
  ApprovalRequestRecord,
  ApprovalRequestStepRecord,
  ArbitratorRegistryEntryRecord,
  AuditLogRecord,
  BillingFeeScheduleRecord,
  BillingFeeScheduleTierRecord,
  BillingPlanRecord,
  BillingUsageMeterEventRecord,
  ChainCursorRecord,
  ComplianceCaseNoteRecord,
  ComplianceCaseRecord,
  ComplianceCheckpointRecord,
  ContractOwnershipRecord,
  CounterpartyRecord,
  CostCenterRecord,
  CounterpartyDealVersionAcceptanceRecord,
  DealMilestoneDisputeAssignmentRecord,
  DealMilestoneDisputeDecisionRecord,
  DealMilestoneDisputeEvidenceRecord,
  DealMilestoneDisputeRecord,
  DealMilestoneReviewDeadlineExpiryRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSettlementExecutionTransactionRecord,
  DealMilestoneSettlementPreparationRecord,
  DealMilestoneSettlementRequestRecord,
  DealMilestoneSubmissionFileRecord,
  DealMilestoneSubmissionRecord,
  DealVersionAcceptanceRecord,
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  EscrowAgreementMilestoneSettlementRecord,
  EscrowAgreementRecord,
  FeeVaultStateRecord,
  FinanceExportArtifactRecord,
  FinanceExportJobRecord,
  FileRecord,
  FundingTransactionRecord,
  GasPolicyRecord,
  IndexedBlockRecord,
  IndexedContractEventRecord,
  IndexedTransactionRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  OperatorAccountRecord,
  OperatorAlertRecord,
  PartnerAccountRecord,
  PartnerApiKeyRecord,
  PartnerBrandAssetRecord,
  PartnerHostedSessionRecord,
  PartnerIdempotencyKeyRecord,
  PartnerOrganizationLinkRecord,
  PartnerTenantSettingsRecord,
  PartnerResourceReferenceRecord,
  PartnerWebhookDeliveryAttemptRecord,
  PartnerWebhookDeliveryRecord,
  PartnerWebhookEventRecord,
  PartnerWebhookSubscriptionRecord,
  ProtocolConfigStateRecord,
  ProtocolProposalDraftRecord,
  SessionRecord,
  SponsoredTransactionRequestRecord,
  StatementSnapshotRecord,
  TenantBillingPlanAssignmentRecord,
  TenantDomainRecord,
  TenantInvoiceLineItemRecord,
  TenantInvoiceRecord,
  TemplateRecord,
  TokenAllowlistEntryRecord,
  UserRecord,
  WalletNonceRecord,
  WalletProfileRecord,
  WalletRecord
} from "./records";

export interface UserRepository {
  create(record: UserRecord): Promise<UserRecord>;
  findById(id: EntityId): Promise<UserRecord | null>;
}

export interface WalletRepository {
  create(record: WalletRecord): Promise<WalletRecord>;
  findById(id: EntityId): Promise<WalletRecord | null>;
  findByAddress(address: WalletAddress): Promise<WalletRecord | null>;
  listByUserId(userId: EntityId): Promise<WalletRecord[]>;
}

export interface WalletProfileRepository {
  findByWalletId(walletId: EntityId): Promise<WalletProfileRecord | null>;
  listByWalletIds(walletIds: EntityId[]): Promise<WalletProfileRecord[]>;
  upsert(record: WalletProfileRecord): Promise<WalletProfileRecord>;
}

export interface WalletNonceRepository {
  consume(id: EntityId): Promise<WalletNonceRecord | null>;
  create(record: WalletNonceRecord): Promise<WalletNonceRecord>;
  findActiveByWalletAddress(
    walletAddress: WalletAddress
  ): Promise<WalletNonceRecord | null>;
  findActiveByWalletAddressAndChainId(
    walletAddress: WalletAddress,
    chainId: ChainId
  ): Promise<WalletNonceRecord | null>;
}

export interface SessionRepository {
  create(record: SessionRecord): Promise<SessionRecord>;
  findById(id: EntityId): Promise<SessionRecord | null>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  revoke(id: EntityId): Promise<SessionRecord | null>;
  touch(id: EntityId): Promise<SessionRecord | null>;
}

export interface OperatorAccountRepository {
  create(record: OperatorAccountRecord): Promise<OperatorAccountRecord>;
  findActiveByUserId(userId: EntityId): Promise<OperatorAccountRecord | null>;
  findActiveByWalletId(walletId: EntityId): Promise<OperatorAccountRecord | null>;
  findById(id: EntityId): Promise<OperatorAccountRecord | null>;
}

export interface CostCenterRepository {
  create(record: CostCenterRecord): Promise<CostCenterRecord>;
  findById(id: EntityId): Promise<CostCenterRecord | null>;
  findByOrganizationIdAndNormalizedCode(
    organizationId: EntityId,
    normalizedCode: string
  ): Promise<CostCenterRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<CostCenterRecord[]>;
}

export interface OrganizationRepository {
  create(record: OrganizationRecord): Promise<OrganizationRecord>;
  findById(id: EntityId): Promise<OrganizationRecord | null>;
  findBySlug(slug: string): Promise<OrganizationRecord | null>;
  listAll(): Promise<OrganizationRecord[]>;
  listByUserId(userId: EntityId): Promise<OrganizationRecord[]>;
}

export interface OrganizationMemberRepository {
  add(record: OrganizationMemberRecord): Promise<OrganizationMemberRecord>;
  findById(id: EntityId): Promise<OrganizationMemberRecord | null>;
  findMembership(
    organizationId: EntityId,
    userId: EntityId
  ): Promise<OrganizationMemberRecord | null>;
  listByOrganizationId(
    organizationId: EntityId
  ): Promise<OrganizationMemberRecord[]>;
  listByUserId(userId: EntityId): Promise<OrganizationMemberRecord[]>;
  remove(id: EntityId): Promise<OrganizationMemberRecord | null>;
  updateRole(
    id: EntityId,
    role: OrganizationMemberRecord["role"]
  ): Promise<OrganizationMemberRecord | null>;
}

export interface OrganizationInviteRepository {
  accept(id: EntityId): Promise<OrganizationInviteRecord | null>;
  create(record: OrganizationInviteRecord): Promise<OrganizationInviteRecord>;
  findById(id: EntityId): Promise<OrganizationInviteRecord | null>;
  findPendingByOrganizationIdAndEmail(
    organizationId: EntityId,
    email: string
  ): Promise<OrganizationInviteRecord | null>;
  findByTokenHash(tokenHash: string): Promise<OrganizationInviteRecord | null>;
  listPendingByOrganizationId(
    organizationId: EntityId
  ): Promise<OrganizationInviteRecord[]>;
  revoke(id: EntityId): Promise<OrganizationInviteRecord | null>;
}

export interface AuditLogRepository {
  append(record: AuditLogRecord): Promise<AuditLogRecord>;
  listByEntity(
    entityType: AuditLogRecord["entityType"],
    entityId: EntityId
  ): Promise<AuditLogRecord[]>;
}

export interface OperatorAlertRepository {
  create(record: OperatorAlertRecord): Promise<OperatorAlertRecord>;
  findByFingerprint(fingerprint: string): Promise<OperatorAlertRecord | null>;
  findById(id: EntityId): Promise<OperatorAlertRecord | null>;
  listAll(): Promise<OperatorAlertRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<OperatorAlertRecord, "id" | "fingerprint" | "firstDetectedAt">>
  ): Promise<OperatorAlertRecord>;
}

export interface ComplianceCheckpointRepository {
  create(record: ComplianceCheckpointRecord): Promise<ComplianceCheckpointRecord>;
  findById(id: EntityId): Promise<ComplianceCheckpointRecord | null>;
  listAll(): Promise<ComplianceCheckpointRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<ComplianceCheckpointRecord, "id" | "createdAt" | "createdByOperatorAccountId">>
  ): Promise<ComplianceCheckpointRecord>;
}

export interface ComplianceCaseRepository {
  create(record: ComplianceCaseRecord): Promise<ComplianceCaseRecord>;
  findById(id: EntityId): Promise<ComplianceCaseRecord | null>;
  listAll(): Promise<ComplianceCaseRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<ComplianceCaseRecord, "id" | "createdAt" | "createdByOperatorAccountId">>
  ): Promise<ComplianceCaseRecord>;
}

export interface ComplianceCaseNoteRepository {
  create(record: ComplianceCaseNoteRecord): Promise<ComplianceCaseNoteRecord>;
  listByComplianceCaseId(
    complianceCaseId: EntityId
  ): Promise<ComplianceCaseNoteRecord[]>;
}

export interface ApprovalPolicyRepository {
  create(record: ApprovalPolicyRecord): Promise<ApprovalPolicyRecord>;
  findById(id: EntityId): Promise<ApprovalPolicyRecord | null>;
  listActiveByOrganizationId(
    organizationId: EntityId
  ): Promise<ApprovalPolicyRecord[]>;
  listByOrganizationId(organizationId: EntityId): Promise<ApprovalPolicyRecord[]>;
}

export interface ApprovalPolicyStepRepository {
  create(record: ApprovalPolicyStepRecord): Promise<ApprovalPolicyStepRecord>;
  listByApprovalPolicyId(
    approvalPolicyId: EntityId
  ): Promise<ApprovalPolicyStepRecord[]>;
}

export interface ApprovalRequestRepository {
  create(record: ApprovalRequestRecord): Promise<ApprovalRequestRecord>;
  findBySubjectFingerprint(input: {
    kind: ApprovalRequestRecord["kind"];
    organizationId: EntityId;
    subjectFingerprint: string;
    subjectId: EntityId;
    subjectType: ApprovalRequestRecord["subjectType"];
  }): Promise<ApprovalRequestRecord | null>;
  findById(id: EntityId): Promise<ApprovalRequestRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<ApprovalRequestRecord[]>;
  listByDealVersionId(dealVersionId: EntityId): Promise<ApprovalRequestRecord[]>;
  update(
    id: EntityId,
    updates: Partial<
      Omit<ApprovalRequestRecord, "id" | "organizationId" | "subjectFingerprint">
    >
  ): Promise<ApprovalRequestRecord>;
}

export interface ApprovalRequestStepRepository {
  create(record: ApprovalRequestStepRecord): Promise<ApprovalRequestStepRecord>;
  findById(id: EntityId): Promise<ApprovalRequestStepRecord | null>;
  listByApprovalRequestId(
    approvalRequestId: EntityId
  ): Promise<ApprovalRequestStepRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<ApprovalRequestStepRecord, "id" | "approvalRequestId">>
  ): Promise<ApprovalRequestStepRecord>;
}

export interface ProtocolProposalDraftRepository {
  create(record: ProtocolProposalDraftRecord): Promise<ProtocolProposalDraftRecord>;
  findById(id: EntityId): Promise<ProtocolProposalDraftRecord | null>;
  listAll(): Promise<ProtocolProposalDraftRecord[]>;
}

export interface PartnerAccountRepository {
  create(record: PartnerAccountRecord): Promise<PartnerAccountRecord>;
  findById(id: EntityId): Promise<PartnerAccountRecord | null>;
  findBySlug(slug: string): Promise<PartnerAccountRecord | null>;
  listAll(): Promise<PartnerAccountRecord[]>;
}

export interface PartnerOrganizationLinkRepository {
  create(record: PartnerOrganizationLinkRecord): Promise<PartnerOrganizationLinkRecord>;
  findById(id: EntityId): Promise<PartnerOrganizationLinkRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<PartnerOrganizationLinkRecord[]>;
  listByPartnerAccountId(
    partnerAccountId: EntityId
  ): Promise<PartnerOrganizationLinkRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<PartnerOrganizationLinkRecord, "id" | "partnerAccountId" | "organizationId" | "createdAt">>
  ): Promise<PartnerOrganizationLinkRecord>;
}

export interface PartnerApiKeyRepository {
  create(record: PartnerApiKeyRecord): Promise<PartnerApiKeyRecord>;
  findActiveByKeyPrefix(keyPrefix: string): Promise<PartnerApiKeyRecord | null>;
  findById(id: EntityId): Promise<PartnerApiKeyRecord | null>;
  listByPartnerOrganizationLinkId(
    partnerOrganizationLinkId: EntityId
  ): Promise<PartnerApiKeyRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<PartnerApiKeyRecord, "id" | "partnerOrganizationLinkId" | "createdAt" | "keyPrefix" | "secretHash">>
  ): Promise<PartnerApiKeyRecord>;
}

export interface PartnerIdempotencyKeyRepository {
  create(record: PartnerIdempotencyKeyRecord): Promise<PartnerIdempotencyKeyRecord>;
  findByScope(input: {
    partnerApiKeyId: EntityId;
    requestKey: string;
    requestMethod: string;
    requestPath: string;
  }): Promise<PartnerIdempotencyKeyRecord | null>;
}

export interface PartnerResourceReferenceRepository {
  create(record: PartnerResourceReferenceRecord): Promise<PartnerResourceReferenceRecord>;
  findByPartnerReferenceId(input: {
    partnerOrganizationLinkId: EntityId;
    partnerReferenceId: string;
  }): Promise<PartnerResourceReferenceRecord | null>;
  findByResource(input: {
    partnerOrganizationLinkId: EntityId;
    resourceId: EntityId;
    resourceType: PartnerResourceType;
  }): Promise<PartnerResourceReferenceRecord | null>;
}

export interface PartnerHostedSessionRepository {
  create(record: PartnerHostedSessionRecord): Promise<PartnerHostedSessionRecord>;
  findById(id: EntityId): Promise<PartnerHostedSessionRecord | null>;
  findByLaunchTokenHash(launchTokenHash: string): Promise<PartnerHostedSessionRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<PartnerHostedSessionRecord[]>;
  listByPartnerOrganizationLinkId(
    partnerOrganizationLinkId: EntityId
  ): Promise<PartnerHostedSessionRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<PartnerHostedSessionRecord, "id" | "partnerOrganizationLinkId" | "launchTokenHash" | "createdAt">>
  ): Promise<PartnerHostedSessionRecord>;
}

export interface PartnerWebhookSubscriptionRepository {
  create(
    record: PartnerWebhookSubscriptionRecord
  ): Promise<PartnerWebhookSubscriptionRecord>;
  findById(id: EntityId): Promise<PartnerWebhookSubscriptionRecord | null>;
  listActiveByPartnerOrganizationLinkId(
    partnerOrganizationLinkId: EntityId
  ): Promise<PartnerWebhookSubscriptionRecord[]>;
  listByPartnerOrganizationLinkIds(
    partnerOrganizationLinkIds: readonly EntityId[]
  ): Promise<PartnerWebhookSubscriptionRecord[]>;
  listByPartnerOrganizationLinkId(
    partnerOrganizationLinkId: EntityId
  ): Promise<PartnerWebhookSubscriptionRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<PartnerWebhookSubscriptionRecord, "id" | "partnerOrganizationLinkId" | "createdAt">>
  ): Promise<PartnerWebhookSubscriptionRecord>;
}

export interface PartnerWebhookEventRepository {
  create(record: PartnerWebhookEventRecord): Promise<PartnerWebhookEventRecord>;
  findById(id: EntityId): Promise<PartnerWebhookEventRecord | null>;
}

export interface PartnerWebhookDeliveryRepository {
  claimNextPending(now: IsoTimestamp): Promise<PartnerWebhookDeliveryRecord | null>;
  create(record: PartnerWebhookDeliveryRecord): Promise<PartnerWebhookDeliveryRecord>;
  findById(id: EntityId): Promise<PartnerWebhookDeliveryRecord | null>;
  listByPartnerOrganizationLinkIds(
    partnerOrganizationLinkIds: readonly EntityId[]
  ): Promise<PartnerWebhookDeliveryRecord[]>;
  listByPartnerOrganizationLinkId(
    partnerOrganizationLinkId: EntityId
  ): Promise<PartnerWebhookDeliveryRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<PartnerWebhookDeliveryRecord, "id" | "partnerWebhookEventId" | "partnerWebhookSubscriptionId" | "partnerOrganizationLinkId" | "createdAt">>
  ): Promise<PartnerWebhookDeliveryRecord>;
}

export interface PartnerWebhookDeliveryAttemptRepository {
  create(
    record: PartnerWebhookDeliveryAttemptRecord
  ): Promise<PartnerWebhookDeliveryAttemptRecord>;
  listByPartnerWebhookDeliveryId(
    partnerWebhookDeliveryId: EntityId
  ): Promise<PartnerWebhookDeliveryAttemptRecord[]>;
}

export interface PartnerBrandAssetRepository {
  create(record: PartnerBrandAssetRecord): Promise<PartnerBrandAssetRecord>;
  findById(id: EntityId): Promise<PartnerBrandAssetRecord | null>;
  listByPartnerAccountId(partnerAccountId: EntityId): Promise<PartnerBrandAssetRecord[]>;
}

export interface PartnerTenantSettingsRepository {
  findByPartnerAccountId(
    partnerAccountId: EntityId
  ): Promise<PartnerTenantSettingsRecord | null>;
  upsert(record: PartnerTenantSettingsRecord): Promise<PartnerTenantSettingsRecord>;
}

export interface TenantDomainRepository {
  create(record: TenantDomainRecord): Promise<TenantDomainRecord>;
  findActiveByHostname(hostname: string): Promise<TenantDomainRecord | null>;
  findByHostname(hostname: string): Promise<TenantDomainRecord | null>;
  findById(id: EntityId): Promise<TenantDomainRecord | null>;
  listByPartnerAccountId(partnerAccountId: EntityId): Promise<TenantDomainRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<TenantDomainRecord, "id" | "partnerAccountId" | "createdAt">>
  ): Promise<TenantDomainRecord>;
}

export interface BillingPlanRepository {
  create(record: BillingPlanRecord): Promise<BillingPlanRecord>;
  findByCode(code: string): Promise<BillingPlanRecord | null>;
  findById(id: EntityId): Promise<BillingPlanRecord | null>;
  listAll(): Promise<BillingPlanRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<BillingPlanRecord, "id" | "code" | "createdAt">>
  ): Promise<BillingPlanRecord>;
}

export interface BillingFeeScheduleRepository {
  create(record: BillingFeeScheduleRecord): Promise<BillingFeeScheduleRecord>;
  findById(id: EntityId): Promise<BillingFeeScheduleRecord | null>;
  listByBillingPlanId(billingPlanId: EntityId): Promise<BillingFeeScheduleRecord[]>;
}

export interface BillingFeeScheduleTierRepository {
  create(record: BillingFeeScheduleTierRecord): Promise<BillingFeeScheduleTierRecord>;
  listByBillingFeeScheduleId(
    billingFeeScheduleId: EntityId
  ): Promise<BillingFeeScheduleTierRecord[]>;
}

export interface TenantBillingPlanAssignmentRepository {
  create(
    record: TenantBillingPlanAssignmentRecord
  ): Promise<TenantBillingPlanAssignmentRecord>;
  findActiveByPartnerAccountIdAt(input: {
    at: IsoTimestamp;
    partnerAccountId: EntityId;
  }): Promise<TenantBillingPlanAssignmentRecord | null>;
  listByPartnerAccountId(
    partnerAccountId: EntityId
  ): Promise<TenantBillingPlanAssignmentRecord[]>;
  update(
    id: EntityId,
    updates: Partial<
      Omit<TenantBillingPlanAssignmentRecord, "id" | "partnerAccountId" | "createdAt">
    >
  ): Promise<TenantBillingPlanAssignmentRecord>;
}

export interface BillingUsageMeterEventRepository {
  create(record: BillingUsageMeterEventRecord): Promise<BillingUsageMeterEventRecord>;
  findByExternalKey(externalKey: string): Promise<BillingUsageMeterEventRecord | null>;
  listByPartnerAccountIdWithin(input: {
    occurredAtGte: IsoTimestamp;
    occurredAtLt: IsoTimestamp;
    partnerAccountId: EntityId;
  }): Promise<BillingUsageMeterEventRecord[]>;
}

export interface TenantInvoiceRepository {
  create(record: TenantInvoiceRecord): Promise<TenantInvoiceRecord>;
  findById(id: EntityId): Promise<TenantInvoiceRecord | null>;
  findByPartnerAccountIdAndPeriod(input: {
    partnerAccountId: EntityId;
    periodEnd: IsoTimestamp;
    periodStart: IsoTimestamp;
  }): Promise<TenantInvoiceRecord | null>;
  listAll(): Promise<TenantInvoiceRecord[]>;
  listByPartnerAccountId(partnerAccountId: EntityId): Promise<TenantInvoiceRecord[]>;
  update(
    id: EntityId,
    updates: Partial<
      Omit<
        TenantInvoiceRecord,
        "id" | "partnerAccountId" | "billingPlanId" | "billingFeeScheduleId" | "periodStart" | "periodEnd" | "createdAt"
      >
    >
  ): Promise<TenantInvoiceRecord>;
}

export interface TenantInvoiceLineItemRepository {
  create(record: TenantInvoiceLineItemRecord): Promise<TenantInvoiceLineItemRecord>;
  listByInvoiceId(invoiceId: EntityId): Promise<TenantInvoiceLineItemRecord[]>;
}

export interface GasPolicyRepository {
  create(record: GasPolicyRecord): Promise<GasPolicyRecord>;
  findById(id: EntityId): Promise<GasPolicyRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<GasPolicyRecord[]>;
  listActiveByOrganizationId(organizationId: EntityId): Promise<GasPolicyRecord[]>;
  update(
    id: EntityId,
    updates: Partial<
      Omit<GasPolicyRecord, "id" | "organizationId" | "createdAt" | "createdByUserId">
    >
  ): Promise<GasPolicyRecord>;
}

export interface SponsoredTransactionRequestRepository {
  countApprovedCreatedSince(input: {
    gasPolicyId: EntityId;
    organizationId: EntityId;
    since: IsoTimestamp;
  }): Promise<number>;
  create(
    record: SponsoredTransactionRequestRecord
  ): Promise<SponsoredTransactionRequestRecord>;
  expireIfStillPending(input: {
    evaluatedAt: IsoTimestamp;
    id: EntityId;
  }): Promise<SponsoredTransactionRequestRecord | null>;
  findById(id: EntityId): Promise<SponsoredTransactionRequestRecord | null>;
  findLatestOpenBySubjectAndWallet(input: {
    kind: SponsoredTransactionRequestRecord["kind"];
    subjectId: EntityId;
    walletId: EntityId;
  }): Promise<SponsoredTransactionRequestRecord | null>;
  findLatestApprovedBySubjectAndWallet(input: {
    kind: SponsoredTransactionRequestRecord["kind"];
    subjectId: EntityId;
    walletId: EntityId;
  }): Promise<SponsoredTransactionRequestRecord | null>;
  listAll(): Promise<SponsoredTransactionRequestRecord[]>;
  listApprovedPendingByExpiresAt(
    expiresAt: IsoTimestamp
  ): Promise<SponsoredTransactionRequestRecord[]>;
  listByOrganizationId(
    organizationId: EntityId
  ): Promise<SponsoredTransactionRequestRecord[]>;
  listPendingReviewCreatedBefore(
    createdBefore: IsoTimestamp
  ): Promise<SponsoredTransactionRequestRecord[]>;
  update(
    id: EntityId,
    updates: Partial<
      Omit<
        SponsoredTransactionRequestRecord,
        "id" | "organizationId" | "createdAt" | "requestedByUserId" | "walletId"
      >
    >
  ): Promise<SponsoredTransactionRequestRecord>;
}

export interface StatementSnapshotRepository {
  create(record: StatementSnapshotRecord): Promise<StatementSnapshotRecord>;
  listByOrganizationId(organizationId: EntityId): Promise<StatementSnapshotRecord[]>;
  listByDealVersionId(dealVersionId: EntityId): Promise<StatementSnapshotRecord[]>;
}

export interface FinanceExportJobRepository {
  claimNextPending(startedAt: IsoTimestamp): Promise<FinanceExportJobRecord | null>;
  create(record: FinanceExportJobRecord): Promise<FinanceExportJobRecord>;
  findById(id: EntityId): Promise<FinanceExportJobRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<FinanceExportJobRecord[]>;
  update(
    id: EntityId,
    updates: Partial<Omit<FinanceExportJobRecord, "id" | "organizationId" | "createdAt" | "createdByUserId" | "filters">>
  ): Promise<FinanceExportJobRecord>;
}

export interface FinanceExportArtifactRepository {
  create(record: FinanceExportArtifactRecord): Promise<FinanceExportArtifactRecord>;
  listByFinanceExportJobId(
    financeExportJobId: EntityId
  ): Promise<FinanceExportArtifactRecord[]>;
}

export interface CounterpartyRepository {
  create(record: CounterpartyRecord): Promise<CounterpartyRecord>;
  findById(id: EntityId): Promise<CounterpartyRecord | null>;
  findByOrganizationIdAndNormalizedName(
    organizationId: EntityId,
    normalizedName: string
  ): Promise<CounterpartyRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<CounterpartyRecord[]>;
}

export interface FileRepository {
  create(record: FileRecord): Promise<FileRecord>;
  findById(id: EntityId): Promise<FileRecord | null>;
  findByOrganizationIdAndStorageKey(
    organizationId: EntityId,
    storageKey: string
  ): Promise<FileRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<FileRecord[]>;
}

export interface TemplateRepository {
  create(record: TemplateRecord): Promise<TemplateRecord>;
  findById(id: EntityId): Promise<TemplateRecord | null>;
  findByOrganizationIdAndNormalizedName(
    organizationId: EntityId,
    normalizedName: string
  ): Promise<TemplateRecord | null>;
  listByOrganizationId(organizationId: EntityId): Promise<TemplateRecord[]>;
}

export interface DraftDealRepository {
  create(record: DraftDealRecord): Promise<DraftDealRecord>;
  findById(id: EntityId): Promise<DraftDealRecord | null>;
  listAll(): Promise<DraftDealRecord[]>;
  listByOrganizationId(organizationId: EntityId): Promise<DraftDealRecord[]>;
  listByStates(states: DraftDealRecord["state"][]): Promise<DraftDealRecord[]>;
  updateCostCenter(
    id: EntityId,
    costCenterId: EntityId | null,
    updatedAt: string
  ): Promise<DraftDealRecord | null>;
  updateState(
    id: EntityId,
    state: DraftDealRecord["state"],
    updatedAt: string
  ): Promise<DraftDealRecord | null>;
}

export interface DraftDealPartyRepository {
  add(record: DraftDealPartyRecord): Promise<DraftDealPartyRecord>;
  listByDraftDealId(draftDealId: EntityId): Promise<DraftDealPartyRecord[]>;
  updateWalletAddress(
    id: EntityId,
    walletAddress: WalletAddress | null,
    updatedAt: string
  ): Promise<DraftDealPartyRecord | null>;
}

export interface DealVersionRepository {
  create(record: DealVersionRecord): Promise<DealVersionRecord>;
  findById(id: EntityId): Promise<DealVersionRecord | null>;
  findLatestByDraftDealId(
    draftDealId: EntityId
  ): Promise<DealVersionRecord | null>;
  listAll(): Promise<DealVersionRecord[]>;
  listByDraftDealId(draftDealId: EntityId): Promise<DealVersionRecord[]>;
}

export interface DealVersionPartyRepository {
  add(record: DealVersionPartyRecord): Promise<DealVersionPartyRecord>;
  listByDealVersionId(dealVersionId: EntityId): Promise<DealVersionPartyRecord[]>;
}

export interface DealVersionMilestoneRepository {
  add(record: DealVersionMilestoneRecord): Promise<DealVersionMilestoneRecord>;
  findById(id: EntityId): Promise<DealVersionMilestoneRecord | null>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealVersionMilestoneRecord[]>;
}

export interface DealMilestoneSubmissionRepository {
  create(
    record: DealMilestoneSubmissionRecord
  ): Promise<DealMilestoneSubmissionRecord>;
  findById(id: EntityId): Promise<DealMilestoneSubmissionRecord | null>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealMilestoneSubmissionRecord[]>;
  listByDealVersionMilestoneId(
    dealVersionMilestoneId: EntityId
  ): Promise<DealMilestoneSubmissionRecord[]>;
}

export interface DealMilestoneReviewDeadlineExpiryRepository {
  create(
    record: DealMilestoneReviewDeadlineExpiryRecord
  ): Promise<DealMilestoneReviewDeadlineExpiryRecord>;
  findByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: EntityId
  ): Promise<DealMilestoneReviewDeadlineExpiryRecord | null>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealMilestoneReviewDeadlineExpiryRecord[]>;
}

export interface DealMilestoneReviewRepository {
  create(record: DealMilestoneReviewRecord): Promise<DealMilestoneReviewRecord>;
  findByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: EntityId
  ): Promise<DealMilestoneReviewRecord | null>;
  findById(id: EntityId): Promise<DealMilestoneReviewRecord | null>;
  listByDealVersionId(dealVersionId: EntityId): Promise<DealMilestoneReviewRecord[]>;
}

export interface DealMilestoneDisputeRepository {
  create(record: DealMilestoneDisputeRecord): Promise<DealMilestoneDisputeRecord>;
  findByDealMilestoneReviewId(
    dealMilestoneReviewId: EntityId
  ): Promise<DealMilestoneDisputeRecord | null>;
  findById(id: EntityId): Promise<DealMilestoneDisputeRecord | null>;
  listAll(): Promise<DealMilestoneDisputeRecord[]>;
  listByDealVersionId(dealVersionId: EntityId): Promise<DealMilestoneDisputeRecord[]>;
}

export interface DealMilestoneDisputeEvidenceRepository {
  add(
    record: DealMilestoneDisputeEvidenceRecord
  ): Promise<DealMilestoneDisputeEvidenceRecord>;
  listByDealMilestoneDisputeId(
    dealMilestoneDisputeId: EntityId
  ): Promise<DealMilestoneDisputeEvidenceRecord[]>;
}

export interface DealMilestoneDisputeAssignmentRepository {
  create(
    record: DealMilestoneDisputeAssignmentRecord
  ): Promise<DealMilestoneDisputeAssignmentRecord>;
  findById(id: EntityId): Promise<DealMilestoneDisputeAssignmentRecord | null>;
  listByDealMilestoneDisputeId(
    dealMilestoneDisputeId: EntityId
  ): Promise<DealMilestoneDisputeAssignmentRecord[]>;
}

export interface DealMilestoneDisputeDecisionRepository {
  create(
    record: DealMilestoneDisputeDecisionRecord
  ): Promise<DealMilestoneDisputeDecisionRecord>;
  findByDealMilestoneDisputeId(
    dealMilestoneDisputeId: EntityId
  ): Promise<DealMilestoneDisputeDecisionRecord | null>;
  findById(id: EntityId): Promise<DealMilestoneDisputeDecisionRecord | null>;
  findByDealMilestoneSettlementRequestId(
    dealMilestoneSettlementRequestId: EntityId
  ): Promise<DealMilestoneDisputeDecisionRecord | null>;
}

export interface DealMilestoneSettlementRequestRepository {
  create(
    record: DealMilestoneSettlementRequestRecord
  ): Promise<DealMilestoneSettlementRequestRecord>;
  findByDealMilestoneReviewId(
    dealMilestoneReviewId: EntityId
  ): Promise<DealMilestoneSettlementRequestRecord | null>;
  findById(id: EntityId): Promise<DealMilestoneSettlementRequestRecord | null>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealMilestoneSettlementRequestRecord[]>;
}

export interface DealMilestoneSettlementPreparationRepository {
  create(
    record: DealMilestoneSettlementPreparationRecord
  ): Promise<DealMilestoneSettlementPreparationRecord>;
  findByDealMilestoneSettlementRequestId(
    dealMilestoneSettlementRequestId: EntityId
  ): Promise<DealMilestoneSettlementPreparationRecord | null>;
  findById(id: EntityId): Promise<DealMilestoneSettlementPreparationRecord | null>;
  listByChainId(
    chainId: ChainId
  ): Promise<DealMilestoneSettlementPreparationRecord[]>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealMilestoneSettlementPreparationRecord[]>;
}

export interface DealMilestoneSubmissionFileRepository {
  add(
    record: DealMilestoneSubmissionFileRecord
  ): Promise<DealMilestoneSubmissionFileRecord>;
  listByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: EntityId
  ): Promise<DealMilestoneSubmissionFileRecord[]>;
}

export interface DealVersionFileRepository {
  add(record: DealVersionFileRecord): Promise<DealVersionFileRecord>;
  listByDealVersionId(dealVersionId: EntityId): Promise<DealVersionFileRecord[]>;
}

export interface DealVersionAcceptanceRepository {
  create(
    record: DealVersionAcceptanceRecord
  ): Promise<DealVersionAcceptanceRecord>;
  findByDealVersionPartyId(
    dealVersionPartyId: EntityId
  ): Promise<DealVersionAcceptanceRecord | null>;
  findById(id: EntityId): Promise<DealVersionAcceptanceRecord | null>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealVersionAcceptanceRecord[]>;
}

export interface CounterpartyDealVersionAcceptanceRepository {
  create(
    record: CounterpartyDealVersionAcceptanceRecord
  ): Promise<CounterpartyDealVersionAcceptanceRecord>;
  findByDealVersionPartyId(
    dealVersionPartyId: EntityId
  ): Promise<CounterpartyDealVersionAcceptanceRecord | null>;
  findById(id: EntityId): Promise<CounterpartyDealVersionAcceptanceRecord | null>;
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<CounterpartyDealVersionAcceptanceRecord[]>;
}

export interface FundingTransactionRepository {
  create(record: FundingTransactionRecord): Promise<FundingTransactionRecord>;
  findByChainIdAndTransactionHash(
    chainId: ChainId,
    transactionHash: HexString
  ): Promise<FundingTransactionRecord | null>;
  findById(id: EntityId): Promise<FundingTransactionRecord | null>;
  listByChainId(chainId: ChainId): Promise<FundingTransactionRecord[]>;
  listByDealVersionId(dealVersionId: EntityId): Promise<FundingTransactionRecord[]>;
  listByDraftDealId(draftDealId: EntityId): Promise<FundingTransactionRecord[]>;
  markStalePendingEscalated(
    id: EntityId,
    stalePendingEscalatedAt: IsoTimestamp
  ): Promise<FundingTransactionRecord>;
  updateReconciliation(
    id: EntityId,
    reconciliation: Pick<
      FundingTransactionRecord,
      | "reconciledAgreementAddress"
      | "reconciledAt"
      | "reconciledConfirmedAt"
      | "reconciledMatchesTrackedVersion"
      | "reconciledStatus"
    >
  ): Promise<FundingTransactionRecord>;
  markSuperseded(
    id: EntityId,
    supersededByFundingTransactionId: EntityId,
    supersededAt: IsoTimestamp
  ): Promise<FundingTransactionRecord>;
}

export interface DealMilestoneSettlementExecutionTransactionRepository {
  create(
    record: DealMilestoneSettlementExecutionTransactionRecord
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord>;
  findByChainIdAndTransactionHash(
    chainId: ChainId,
    transactionHash: HexString
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord | null>;
  findById(
    id: EntityId
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord | null>;
  listByChainId(
    chainId: ChainId
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord[]>;
  listByDealMilestoneSettlementRequestId(
    dealMilestoneSettlementRequestId: EntityId
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord[]>;
  markStalePendingEscalated(
    id: EntityId,
    stalePendingEscalatedAt: IsoTimestamp
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord>;
  markSuperseded(
    id: EntityId,
    supersededByDealMilestoneSettlementExecutionTransactionId: EntityId,
    supersededAt: IsoTimestamp
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord>;
  updateReconciliation(
    id: EntityId,
    reconciliation: Pick<
      DealMilestoneSettlementExecutionTransactionRecord,
      | "reconciledAgreementAddress"
      | "reconciledAt"
      | "reconciledConfirmedAt"
      | "reconciledMatchesTrackedAgreement"
      | "reconciledStatus"
    >
  ): Promise<DealMilestoneSettlementExecutionTransactionRecord>;
}

export interface ChainCursorRepository {
  findByChainIdAndCursorKey(
    chainId: ChainId,
    cursorKey: string
  ): Promise<ChainCursorRecord | null>;
  upsert(record: ChainCursorRecord): Promise<ChainCursorRecord>;
}

export interface IndexedBlockRepository {
  deleteFromBlockNumber(chainId: ChainId, fromBlockNumber: string): Promise<void>;
  findByChainIdAndBlockNumber(
    chainId: ChainId,
    blockNumber: string
  ): Promise<IndexedBlockRecord | null>;
  listByChainId(chainId: ChainId): Promise<IndexedBlockRecord[]>;
  upsertMany(records: IndexedBlockRecord[]): Promise<void>;
}

export interface IndexedTransactionRepository {
  deleteFromBlockNumber(chainId: ChainId, fromBlockNumber: string): Promise<void>;
  findByChainIdAndTransactionHash(
    chainId: ChainId,
    transactionHash: HexString
  ): Promise<IndexedTransactionRecord | null>;
  listByChainId(chainId: ChainId): Promise<IndexedTransactionRecord[]>;
  upsertMany(records: IndexedTransactionRecord[]): Promise<void>;
}

export interface IndexedContractEventRepository {
  deleteFromBlockNumber(chainId: ChainId, fromBlockNumber: string): Promise<void>;
  listByChainId(chainId: ChainId): Promise<IndexedContractEventRecord[]>;
  upsertMany(records: IndexedContractEventRecord[]): Promise<void>;
}

export interface ContractOwnershipRepository {
  listByChainId(chainId: ChainId): Promise<ContractOwnershipRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(record: ContractOwnershipRecord): Promise<ContractOwnershipRecord>;
}

export interface TokenAllowlistEntryRepository {
  listByChainId(chainId: ChainId): Promise<TokenAllowlistEntryRecord[]>;
  listAllowedByChainIdAndContract(
    chainId: ChainId,
    tokenAllowlistAddress: WalletAddress
  ): Promise<TokenAllowlistEntryRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(record: TokenAllowlistEntryRecord): Promise<TokenAllowlistEntryRecord>;
}

export interface ArbitratorRegistryEntryRepository {
  listApprovedByChainIdAndContract(
    chainId: ChainId,
    arbitratorRegistryAddress: WalletAddress
  ): Promise<ArbitratorRegistryEntryRecord[]>;
  listByChainId(chainId: ChainId): Promise<ArbitratorRegistryEntryRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(
    record: ArbitratorRegistryEntryRecord
  ): Promise<ArbitratorRegistryEntryRecord>;
}

export interface ProtocolConfigStateRepository {
  findByChainIdAndAddress(
    chainId: ChainId,
    protocolConfigAddress: WalletAddress
  ): Promise<ProtocolConfigStateRecord | null>;
  listByChainId(chainId: ChainId): Promise<ProtocolConfigStateRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(record: ProtocolConfigStateRecord): Promise<ProtocolConfigStateRecord>;
}

export interface FeeVaultStateRepository {
  findByChainIdAndAddress(
    chainId: ChainId,
    feeVaultAddress: WalletAddress
  ): Promise<FeeVaultStateRecord | null>;
  listByChainId(chainId: ChainId): Promise<FeeVaultStateRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(record: FeeVaultStateRecord): Promise<FeeVaultStateRecord>;
}

export interface EscrowAgreementRepository {
  findByChainIdAndAddress(
    chainId: ChainId,
    agreementAddress: WalletAddress
  ): Promise<EscrowAgreementRecord | null>;
  listByChainId(chainId: ChainId): Promise<EscrowAgreementRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(record: EscrowAgreementRecord): Promise<EscrowAgreementRecord>;
}

export interface EscrowAgreementMilestoneSettlementRepository {
  listByChainId(chainId: ChainId): Promise<EscrowAgreementMilestoneSettlementRecord[]>;
  listByChainIdAndAgreementAddress(
    chainId: ChainId,
    agreementAddress: WalletAddress
  ): Promise<EscrowAgreementMilestoneSettlementRecord[]>;
  resetByChainId(chainId: ChainId): Promise<void>;
  upsert(
    record: EscrowAgreementMilestoneSettlementRecord
  ): Promise<EscrowAgreementMilestoneSettlementRecord>;
}

export interface Release4Repositories {
  arbitratorRegistryEntries: ArbitratorRegistryEntryRepository;
  chainCursors: ChainCursorRepository;
  contractOwnerships: ContractOwnershipRepository;
  escrowAgreements: EscrowAgreementRepository;
  escrowAgreementMilestoneSettlements: EscrowAgreementMilestoneSettlementRepository;
  feeVaultStates: FeeVaultStateRepository;
  indexedBlocks: IndexedBlockRepository;
  indexedContractEvents: IndexedContractEventRepository;
  indexedTransactions: IndexedTransactionRepository;
  protocolConfigStates: ProtocolConfigStateRepository;
  tokenAllowlistEntries: TokenAllowlistEntryRepository;
}

export interface Release1Repositories {
  auditLogs: AuditLogRepository;
  counterparties: CounterpartyRepository;
  counterpartyDealVersionAcceptances: CounterpartyDealVersionAcceptanceRepository;
  dealMilestoneDisputeAssignments: DealMilestoneDisputeAssignmentRepository;
  dealMilestoneDisputeDecisions: DealMilestoneDisputeDecisionRepository;
  dealMilestoneDisputeEvidence: DealMilestoneDisputeEvidenceRepository;
  dealMilestoneDisputes: DealMilestoneDisputeRepository;
  dealMilestoneReviewDeadlineExpiries: DealMilestoneReviewDeadlineExpiryRepository;
  dealMilestoneReviews: DealMilestoneReviewRepository;
  dealMilestoneSettlementExecutionTransactions: DealMilestoneSettlementExecutionTransactionRepository;
  dealMilestoneSettlementPreparations: DealMilestoneSettlementPreparationRepository;
  dealMilestoneSettlementRequests: DealMilestoneSettlementRequestRepository;
  dealMilestoneSubmissionFiles: DealMilestoneSubmissionFileRepository;
  dealMilestoneSubmissions: DealMilestoneSubmissionRepository;
  dealVersionAcceptances: DealVersionAcceptanceRepository;
  dealVersionFiles: DealVersionFileRepository;
  dealVersionMilestones: DealVersionMilestoneRepository;
  dealVersionParties: DealVersionPartyRepository;
  dealVersions: DealVersionRepository;
  draftDealParties: DraftDealPartyRepository;
  draftDeals: DraftDealRepository;
  files: FileRepository;
  fundingTransactions: FundingTransactionRepository;
  organizationInvites: OrganizationInviteRepository;
  organizationMembers: OrganizationMemberRepository;
  organizations: OrganizationRepository;
  sessions: SessionRepository;
  templates: TemplateRepository;
  users: UserRepository;
  walletNonces: WalletNonceRepository;
  wallets: WalletRepository;
}

export interface Release8Repositories {
  complianceCaseNotes: ComplianceCaseNoteRepository;
  complianceCases: ComplianceCaseRepository;
  complianceCheckpoints: ComplianceCheckpointRepository;
  operatorAccounts: OperatorAccountRepository;
  operatorAlerts: OperatorAlertRepository;
  protocolProposalDrafts: ProtocolProposalDraftRepository;
}

export interface Release9Repositories {
  approvalPolicies: ApprovalPolicyRepository;
  approvalPolicySteps: ApprovalPolicyStepRepository;
  approvalRequests: ApprovalRequestRepository;
  approvalRequestSteps: ApprovalRequestStepRepository;
  costCenters: CostCenterRepository;
  financeExportArtifacts: FinanceExportArtifactRepository;
  financeExportJobs: FinanceExportJobRepository;
  statementSnapshots: StatementSnapshotRepository;
}

export interface Release10Repositories {
  partnerAccounts: PartnerAccountRepository;
  partnerApiKeys: PartnerApiKeyRepository;
  partnerHostedSessions: PartnerHostedSessionRepository;
  partnerIdempotencyKeys: PartnerIdempotencyKeyRepository;
  partnerOrganizationLinks: PartnerOrganizationLinkRepository;
  partnerResourceReferences: PartnerResourceReferenceRepository;
  partnerWebhookDeliveries: PartnerWebhookDeliveryRepository;
  partnerWebhookDeliveryAttempts: PartnerWebhookDeliveryAttemptRepository;
  partnerWebhookEvents: PartnerWebhookEventRepository;
  partnerWebhookSubscriptions: PartnerWebhookSubscriptionRepository;
}

export interface Release11Repositories extends Release10Repositories {
  billingFeeScheduleTiers: BillingFeeScheduleTierRepository;
  billingFeeSchedules: BillingFeeScheduleRepository;
  billingPlans: BillingPlanRepository;
  invoices: TenantInvoiceRepository;
  invoiceLineItems: TenantInvoiceLineItemRepository;
  partnerBrandAssets: PartnerBrandAssetRepository;
  tenantBillingPlanAssignments: TenantBillingPlanAssignmentRepository;
  tenantDomains: TenantDomainRepository;
  tenantSettings: PartnerTenantSettingsRepository;
  usageMeterEvents: BillingUsageMeterEventRepository;
}

export interface Release12Repositories extends Release11Repositories {
  gasPolicies: GasPolicyRepository;
  sponsoredTransactionRequests: SponsoredTransactionRequestRepository;
  walletProfiles: WalletProfileRepository;
}
