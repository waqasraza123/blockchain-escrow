import type {
  ApprovalPolicyKind,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  AuditAction,
  AuditEntityType,
  BillingPlanStatus,
  BillingUsageMetric,
  ChainId,
  CostCenterStatus,
  DealPartyRole,
  DealPartySubjectType,
  DealState,
  EntityId,
  FileCategory,
  FinanceExportArtifactFormat,
  FinanceExportJobStatus,
  FundingTransactionReconciledStatus,
  HexString,
  IndexedContractName,
  IndexedEventName,
  IsoTimestamp,
  JsonObject,
  OperatorAlertKind,
  OperatorAlertSeverity,
  OperatorAlertStatus,
  OperatorRole,
  OperatorSubjectType,
  TreasuryMovementKind,
  PartnerBrandAssetRole,
  PartnerAccountStatus,
  PartnerApiKeyStatus,
  PartnerHostedSessionStatus,
  PartnerHostedSessionType,
  PartnerOrganizationLinkStatus,
  PartnerResourceType,
  PartnerScope,
  PartnerWebhookDeliveryStatus,
  PartnerWebhookEventType,
  PartnerWebhookSubscriptionStatus,
  InvoiceStatus,
  SponsoredTransactionKind,
  SponsoredTransactionStatus,
  MilestoneSettlementRequestKind,
  MilestoneSettlementRequestSource,
  ApprovalSubjectType,
  ComplianceCaseStatus,
  ComplianceCheckpointKind,
  ComplianceCheckpointStatus,
  OrganizationInviteStatus,
  OrganizationRole,
  ProtocolProposalAction,
  ProtocolProposalTarget,
  SessionStatus,
  SettlementCurrency,
  StatementSnapshotKind,
  TenantDomainStatus,
  TenantDomainSurface,
  TemplateSummary,
  TypedSignatureScheme,
  WalletAddress
} from "@blockchain-escrow/shared";

export interface UserRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  updatedAt: IsoTimestamp;
}

export interface WalletRecord {
  address: WalletAddress;
  chainId: ChainId | null;
  createdAt: IsoTimestamp;
  id: EntityId;
  isPrimary: boolean;
  updatedAt: IsoTimestamp;
  userId: EntityId;
}

export interface WalletProfileRecord {
  approvalNoteTemplate: string | null;
  createdAt: IsoTimestamp;
  defaultGasPolicyId: EntityId | null;
  defaultOrganizationId: EntityId | null;
  displayName: string;
  reviewNoteTemplate: string | null;
  sponsorTransactionsByDefault: boolean;
  updatedAt: IsoTimestamp;
  walletId: EntityId;
}

export interface WalletNonceRecord {
  chainId: ChainId;
  consumedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  expiresAt: IsoTimestamp;
  id: EntityId;
  nonce: string;
  walletAddress: WalletAddress;
}

export interface SessionRecord {
  createdAt: IsoTimestamp;
  expiresAt: IsoTimestamp;
  id: EntityId;
  lastSeenAt: IsoTimestamp | null;
  revokedAt: IsoTimestamp | null;
  status: SessionStatus;
  tokenHash: string;
  userId: EntityId;
  walletId: EntityId;
}

export interface OperatorAccountRecord {
  active: boolean;
  createdAt: IsoTimestamp;
  id: EntityId;
  role: OperatorRole;
  updatedAt: IsoTimestamp;
  userId: EntityId;
  walletId: EntityId;
}

export interface CostCenterRecord {
  code: string;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  description: string | null;
  id: EntityId;
  name: string;
  normalizedCode: string;
  organizationId: EntityId;
  status: CostCenterStatus;
  updatedAt: IsoTimestamp;
}

export interface OrganizationRecord {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  name: string;
  slug: string;
  updatedAt: IsoTimestamp;
}

export interface OrganizationMemberRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  organizationId: EntityId;
  role: OrganizationRole;
  updatedAt: IsoTimestamp;
  userId: EntityId;
}

export interface OrganizationInviteRecord {
  acceptedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  email: string;
  expiresAt: IsoTimestamp;
  id: EntityId;
  invitedByUserId: EntityId;
  organizationId: EntityId;
  role: OrganizationRole;
  status: OrganizationInviteStatus;
  tokenHash: string;
  updatedAt: IsoTimestamp;
}

export interface AuditLogRecord {
  action: AuditAction;
  actorUserId: EntityId | null;
  entityId: EntityId;
  entityType: AuditEntityType;
  id: EntityId;
  ipAddress: string | null;
  metadata: JsonObject | null;
  occurredAt: IsoTimestamp;
  organizationId: EntityId | null;
  userAgent: string | null;
}

export interface OperatorAlertRecord {
  acknowledgedAt: IsoTimestamp | null;
  acknowledgedByOperatorAccountId: EntityId | null;
  agreementAddress: WalletAddress | null;
  assignedOperatorAccountId: EntityId | null;
  dealVersionId: EntityId | null;
  description: string;
  draftDealId: EntityId | null;
  fingerprint: string;
  firstDetectedAt: IsoTimestamp;
  id: EntityId;
  kind: OperatorAlertKind;
  lastDetectedAt: IsoTimestamp;
  linkedComplianceCaseId: EntityId | null;
  metadata: JsonObject | null;
  organizationId: EntityId | null;
  resolvedAt: IsoTimestamp | null;
  resolvedByOperatorAccountId: EntityId | null;
  severity: OperatorAlertSeverity;
  status: OperatorAlertStatus;
  subjectId: EntityId;
  subjectLabel: string | null;
  subjectType: OperatorSubjectType;
}

export interface ComplianceCheckpointRecord {
  agreementAddress: WalletAddress | null;
  createdAt: IsoTimestamp;
  createdByOperatorAccountId: EntityId;
  dealVersionId: EntityId | null;
  decidedAt: IsoTimestamp | null;
  decidedByOperatorAccountId: EntityId | null;
  decisionNote: string | null;
  draftDealId: EntityId | null;
  id: EntityId;
  kind: ComplianceCheckpointKind;
  linkedComplianceCaseId: EntityId | null;
  note: string;
  organizationId: EntityId | null;
  status: ComplianceCheckpointStatus;
  subjectId: EntityId;
  subjectLabel: string | null;
  subjectType: OperatorSubjectType;
}

export interface ComplianceCaseRecord {
  agreementAddress: WalletAddress | null;
  assignedOperatorAccountId: EntityId | null;
  createdAt: IsoTimestamp;
  createdByOperatorAccountId: EntityId;
  dealVersionId: EntityId | null;
  draftDealId: EntityId | null;
  id: EntityId;
  linkedAlertId: EntityId | null;
  linkedCheckpointId: EntityId | null;
  organizationId: EntityId | null;
  resolvedAt: IsoTimestamp | null;
  severity: OperatorAlertSeverity;
  status: ComplianceCaseStatus;
  subjectId: EntityId;
  subjectLabel: string | null;
  subjectType: OperatorSubjectType;
  summary: string;
  title: string;
  updatedAt: IsoTimestamp;
}

export interface ComplianceCaseNoteRecord {
  authorOperatorAccountId: EntityId;
  bodyMarkdown: string;
  complianceCaseId: EntityId;
  createdAt: IsoTimestamp;
  id: EntityId;
}

export interface ProtocolProposalDraftRecord {
  action: ProtocolProposalAction;
  calldata: HexString;
  chainId: ChainId;
  createdAt: IsoTimestamp;
  createdByOperatorAccountId: EntityId;
  description: string;
  id: EntityId;
  input: JsonObject;
  target: ProtocolProposalTarget;
  targetAddress: WalletAddress;
  value: string;
}

export interface PartnerAccountRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  metadata: JsonObject | null;
  name: string;
  slug: string;
  status: PartnerAccountStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerOrganizationLinkRecord {
  actingUserId: EntityId;
  actingWalletId: EntityId;
  createdAt: IsoTimestamp;
  externalReference: string | null;
  id: EntityId;
  organizationId: EntityId;
  partnerAccountId: EntityId;
  status: PartnerOrganizationLinkStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerApiKeyRecord {
  createdAt: IsoTimestamp;
  displayName: string;
  expiresAt: IsoTimestamp | null;
  id: EntityId;
  keyPrefix: string;
  lastUsedAt: IsoTimestamp | null;
  partnerOrganizationLinkId: EntityId;
  revokedAt: IsoTimestamp | null;
  scopes: PartnerScope[];
  secretHash: string;
  status: PartnerApiKeyStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerIdempotencyKeyRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  partnerApiKeyId: EntityId;
  requestHash: string;
  requestKey: string;
  requestMethod: string;
  requestPath: string;
  responseBody: JsonObject;
  responseStatusCode: number;
}

export interface PartnerResourceReferenceRecord {
  createdAt: IsoTimestamp;
  id: EntityId;
  partnerOrganizationLinkId: EntityId;
  partnerReferenceId: string;
  resourceId: EntityId;
  resourceType: PartnerResourceType;
}

export interface PartnerHostedSessionRecord {
  activatedAt: IsoTimestamp | null;
  completedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  dealMilestoneDisputeId: EntityId | null;
  dealVersionId: EntityId | null;
  dealVersionMilestoneId: EntityId | null;
  draftDealId: EntityId | null;
  expiresAt: IsoTimestamp;
  id: EntityId;
  launchTokenHash: string;
  partnerApiKeyId: EntityId | null;
  partnerOrganizationLinkId: EntityId;
  partnerReferenceId: string | null;
  status: PartnerHostedSessionStatus;
  type: PartnerHostedSessionType;
  updatedAt: IsoTimestamp;
}

export interface PartnerWebhookSubscriptionRecord {
  createdAt: IsoTimestamp;
  displayName: string;
  endpointUrl: string;
  eventTypes: PartnerWebhookEventType[];
  id: EntityId;
  lastDeliveryAt: IsoTimestamp | null;
  partnerOrganizationLinkId: EntityId;
  secretHash: string;
  status: PartnerWebhookSubscriptionStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerWebhookEventRecord {
  createdAt: IsoTimestamp;
  draftDealId: EntityId | null;
  eventType: PartnerWebhookEventType;
  hostedSessionId: EntityId | null;
  id: EntityId;
  organizationId: EntityId;
  partnerOrganizationLinkId: EntityId;
  payload: JsonObject;
}

export interface PartnerWebhookDeliveryRecord {
  createdAt: IsoTimestamp;
  deliveredAt: IsoTimestamp | null;
  errorMessage: string | null;
  id: EntityId;
  lastAttemptAt: IsoTimestamp | null;
  nextAttemptAt: IsoTimestamp | null;
  partnerOrganizationLinkId: EntityId;
  partnerWebhookEventId: EntityId;
  partnerWebhookSubscriptionId: EntityId;
  status: PartnerWebhookDeliveryStatus;
}

export interface PartnerWebhookDeliveryAttemptRecord {
  attemptedAt: IsoTimestamp;
  durationMs: number | null;
  errorMessage: string | null;
  finishedAt: IsoTimestamp | null;
  id: EntityId;
  nextRetryAt: IsoTimestamp | null;
  partnerWebhookDeliveryId: EntityId;
  responseStatusCode: number | null;
}

export interface PartnerBrandAssetRecord {
  byteSize: number;
  createdAt: IsoTimestamp;
  id: EntityId;
  mediaType: string;
  originalFilename: string;
  partnerAccountId: EntityId;
  role: PartnerBrandAssetRole;
  sha256Hex: string;
  storageKey: string;
  updatedAt: IsoTimestamp;
}

export interface PartnerTenantSettingsRecord {
  accentColorHex: string;
  backgroundColorHex: string;
  createdAt: IsoTimestamp;
  displayName: string;
  faviconAssetId: EntityId | null;
  legalName: string;
  logoAssetId: EntityId | null;
  partnerAccountId: EntityId;
  primaryColorHex: string;
  privacyPolicyUrl: string;
  supportEmail: string;
  supportUrl: string;
  termsOfServiceUrl: string;
  textColorHex: string;
  updatedAt: IsoTimestamp;
}

export interface TenantDomainRecord {
  createdAt: IsoTimestamp;
  hostname: string;
  id: EntityId;
  partnerAccountId: EntityId;
  status: TenantDomainStatus;
  surface: TenantDomainSurface;
  updatedAt: IsoTimestamp;
  verifiedAt: IsoTimestamp | null;
}

export interface BillingPlanRecord {
  baseMonthlyFeeMinor: string;
  code: string;
  createdAt: IsoTimestamp;
  currency: "USD";
  displayName: string;
  id: EntityId;
  invoiceDueDays: number;
  status: BillingPlanStatus;
  updatedAt: IsoTimestamp;
}

export interface BillingFeeScheduleRecord {
  billingPlanId: EntityId;
  createdAt: IsoTimestamp;
  effectiveFrom: IsoTimestamp;
  id: EntityId;
  updatedAt: IsoTimestamp;
}

export interface BillingFeeScheduleTierRecord {
  billingFeeScheduleId: EntityId;
  id: EntityId;
  includedUnits: string;
  metric: BillingUsageMetric;
  position: number;
  startsAtUnit: string;
  unitPriceMinor: string;
  upToUnit: string | null;
}

export interface TenantBillingPlanAssignmentRecord {
  billingFeeScheduleId: EntityId;
  billingPlanId: EntityId;
  createdAt: IsoTimestamp;
  effectiveFrom: IsoTimestamp;
  effectiveTo: IsoTimestamp | null;
  id: EntityId;
  partnerAccountId: EntityId;
}

export interface BillingUsageMeterEventRecord {
  externalKey: string | null;
  id: EntityId;
  metadata: JsonObject | null;
  metric: BillingUsageMetric;
  occurredAt: IsoTimestamp;
  organizationId: EntityId | null;
  partnerAccountId: EntityId;
  partnerOrganizationLinkId: EntityId | null;
  quantity: string;
}

export interface TenantInvoiceRecord {
  billingFeeScheduleId: EntityId;
  billingPlanId: EntityId;
  createdAt: IsoTimestamp;
  currency: "USD";
  dueAt: IsoTimestamp;
  id: EntityId;
  partnerAccountId: EntityId;
  periodEnd: IsoTimestamp;
  periodStart: IsoTimestamp;
  status: InvoiceStatus;
  subtotalMinor: string;
  totalMinor: string;
  updatedAt: IsoTimestamp;
}

export interface TenantInvoiceLineItemRecord {
  amountMinor: string;
  createdAt: IsoTimestamp;
  description: string;
  id: EntityId;
  invoiceId: EntityId;
  metric: BillingUsageMetric | null;
  quantity: string;
  unitPriceMinor: string;
}

export interface GasPolicyRecord {
  active: boolean;
  allowedApprovalPolicyKinds: ApprovalPolicyKind[];
  allowedChainIds: ChainId[];
  allowedTransactionKinds: SponsoredTransactionKind[];
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  description: string | null;
  id: EntityId;
  maxAmountMinor: string | null;
  maxRequestsPerDay: number;
  name: string;
  organizationId: EntityId;
  sponsorWindowMinutes: number;
  updatedAt: IsoTimestamp;
}

export interface SponsoredTransactionRequestRecord {
  amountMinor: string;
  approvedAt: IsoTimestamp | null;
  chainId: ChainId;
  createdAt: IsoTimestamp;
  data: HexString;
  decidedByOperatorAccountId: EntityId | null;
  dealMilestoneSettlementRequestId: EntityId | null;
  dealVersionId: EntityId | null;
  draftDealId: EntityId | null;
  expiresAt: IsoTimestamp;
  gasPolicyId: EntityId | null;
  id: EntityId;
  kind: SponsoredTransactionKind;
  organizationId: EntityId;
  reason: string | null;
  requestedByUserId: EntityId;
  rejectedAt: IsoTimestamp | null;
  status: SponsoredTransactionStatus;
  subjectId: EntityId;
  subjectType: "DEAL_VERSION" | "DEAL_MILESTONE_SETTLEMENT_REQUEST";
  submittedAt: IsoTimestamp | null;
  submittedTransactionHash: HexString | null;
  toAddress: WalletAddress;
  updatedAt: IsoTimestamp;
  value: string;
  walletAddress: WalletAddress;
  walletId: EntityId;
}

export interface CounterpartyRecord {
  contactEmail: string | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  legalName: string | null;
  name: string;
  normalizedName: string;
  organizationId: EntityId;
  updatedAt: IsoTimestamp;
}

export interface FileRecord {
  byteSize: number;
  category: FileCategory;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  mediaType: string;
  organizationId: EntityId;
  originalFilename: string;
  sha256Hex: string;
  storageKey: string;
  updatedAt: IsoTimestamp;
}

export interface TemplateRecord {
  bodyMarkdown: TemplateSummary["bodyMarkdown"];
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  defaultCounterpartyId: EntityId | null;
  description: TemplateSummary["description"];
  id: EntityId;
  name: string;
  normalizedName: string;
  organizationId: EntityId;
  updatedAt: IsoTimestamp;
}

export interface DraftDealRecord {
  costCenterId?: EntityId | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  state: DealState;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  updatedAt: IsoTimestamp;
}

export interface ApprovalPolicyRecord {
  active: boolean;
  costCenterId: EntityId | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  description: string | null;
  id: EntityId;
  kind: ApprovalPolicyKind;
  name: string;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency | null;
  updatedAt: IsoTimestamp;
}

export interface ApprovalPolicyStepRecord {
  approvalPolicyId: EntityId;
  id: EntityId;
  label: string;
  position: number;
  requiredRole: OrganizationRole;
}

export interface ApprovalRequestRecord {
  approvalPolicyId: EntityId;
  costCenterId: EntityId | null;
  decidedAt: IsoTimestamp | null;
  dealVersionId: EntityId | null;
  dealVersionMilestoneId: EntityId | null;
  draftDealId: EntityId | null;
  id: EntityId;
  kind: ApprovalPolicyKind;
  metadata: JsonObject | null;
  note: string | null;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByUserId: EntityId;
  settlementCurrency: SettlementCurrency | null;
  status: ApprovalRequestStatus;
  subjectFingerprint: string;
  subjectId: EntityId;
  subjectLabel: string | null;
  subjectType: ApprovalSubjectType;
  title: string;
  totalAmountMinor: string | null;
}

export interface ApprovalRequestStepRecord {
  approvalRequestId: EntityId;
  decidedAt: IsoTimestamp | null;
  decidedByUserId: EntityId | null;
  id: EntityId;
  label: string;
  note: string | null;
  position: number;
  requiredRole: OrganizationRole;
  status: ApprovalStepStatus;
}

export interface StatementSnapshotRecord {
  approvalRequestId: EntityId | null;
  asOf: IsoTimestamp;
  costCenterId: EntityId | null;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  dealVersionId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: StatementSnapshotKind;
  note: string | null;
  organizationId: EntityId;
  payload: JsonObject;
}

export interface FinanceExportJobRecord {
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  errorMessage: string | null;
  failedAt: IsoTimestamp | null;
  filters: JsonObject;
  finishedAt: IsoTimestamp | null;
  id: EntityId;
  organizationId: EntityId;
  startedAt: IsoTimestamp | null;
  status: FinanceExportJobStatus;
}

export interface FinanceExportArtifactRecord {
  body: string;
  createdAt: IsoTimestamp;
  fileId: EntityId | null;
  filename: string;
  format: FinanceExportArtifactFormat;
  id: EntityId;
  mediaType: string;
  financeExportJobId: EntityId;
  sizeBytes: number;
}

export interface DraftDealPartyRecord {
  counterpartyId: EntityId | null;
  createdAt: IsoTimestamp;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
  updatedAt: IsoTimestamp;
  walletAddress: WalletAddress | null;
}

export interface DealVersionRecord {
  bodyMarkdown: string;
  createdAt: IsoTimestamp;
  createdByUserId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  settlementCurrency: SettlementCurrency;
  summary: string | null;
  templateId: EntityId | null;
  title: string;
  versionNumber: number;
}

export interface DealVersionPartyRecord {
  counterpartyId: EntityId | null;
  createdAt: IsoTimestamp;
  dealVersionId: EntityId;
  displayName: string;
  id: EntityId;
  organizationId: EntityId | null;
  role: DealPartyRole;
  subjectType: DealPartySubjectType;
}

export interface DealVersionMilestoneRecord {
  amountMinor: string;
  createdAt: IsoTimestamp;
  dealVersionId: EntityId;
  description: string | null;
  dueAt: IsoTimestamp | null;
  id: EntityId;
  position: number;
  title: string;
}

export interface DealMilestoneSubmissionRecord {
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  reviewDeadlineAt: IsoTimestamp;
  scheme: TypedSignatureScheme | null;
  signature: string | null;
  statementMarkdown: string;
  submissionNumber: number;
  submittedAt: IsoTimestamp;
  submittedByCounterpartyId: EntityId | null;
  submittedByPartyRole: DealPartyRole;
  submittedByPartySubjectType: DealPartySubjectType;
  submittedByUserId: EntityId | null;
  typedData: JsonObject | null;
}

export interface DealMilestoneReviewDeadlineExpiryRecord {
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  deadlineAt: IsoTimestamp;
  draftDealId: EntityId;
  expiredAt: IsoTimestamp;
  id: EntityId;
  organizationId: EntityId;
}

export interface DealMilestoneSubmissionFileRecord {
  createdAt: IsoTimestamp;
  dealMilestoneSubmissionId: EntityId;
  fileId: EntityId;
  id: EntityId;
}

export interface DealMilestoneReviewRecord {
  decision: "APPROVED" | "REJECTED";
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  reviewedAt: IsoTimestamp;
  reviewedByUserId: EntityId;
  statementMarkdown: string | null;
}

export interface DealMilestoneDisputeRecord {
  dealMilestoneReviewId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  openedAt: IsoTimestamp;
  openedByUserId: EntityId;
  organizationId: EntityId;
  statementMarkdown: string;
}

export interface DealMilestoneDisputeEvidenceRecord {
  createdAt: IsoTimestamp;
  dealMilestoneDisputeId: EntityId;
  fileId: EntityId;
  id: EntityId;
}

export interface DealMilestoneDisputeAssignmentRecord {
  arbitratorAddress: WalletAddress;
  assignedAt: IsoTimestamp;
  assignedByUserId: EntityId;
  chainId: ChainId;
  dealMilestoneDisputeId: EntityId;
  id: EntityId;
  organizationId: EntityId;
}

export interface DealMilestoneDisputeDecisionRecord {
  dealMilestoneDisputeAssignmentId: EntityId;
  dealMilestoneDisputeId: EntityId;
  dealMilestoneSettlementRequestId: EntityId;
  decidedAt: IsoTimestamp;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  organizationId: EntityId;
  signature: HexString;
  signedByArbitratorAddress: WalletAddress;
  statementMarkdown: string;
  typedData: JsonObject;
}

export interface DealMilestoneSettlementRequestRecord {
  dealMilestoneDisputeId: EntityId | null;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByArbitratorAddress: WalletAddress | null;
  requestedByUserId: EntityId | null;
  source: MilestoneSettlementRequestSource;
  statementMarkdown: string | null;
}

export interface DealMilestoneSettlementPreparationRecord {
  agreementAddress: WalletAddress;
  chainId: ChainId;
  dealId: HexString;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSettlementRequestId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionHash: HexString;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: MilestoneSettlementRequestKind;
  milestoneAmountMinor: string;
  milestonePosition: number;
  organizationId: EntityId;
  preparedAt: IsoTimestamp;
  settlementTokenAddress: WalletAddress;
  totalAmount: string;
}

export interface DealMilestoneSettlementExecutionTransactionRecord {
  chainId: ChainId;
  dealMilestoneReviewId: EntityId;
  dealMilestoneSettlementRequestId: EntityId;
  dealMilestoneSubmissionId: EntityId;
  dealVersionId: EntityId;
  dealVersionMilestoneId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  reconciledAgreementAddress: WalletAddress | null;
  reconciledAt: IsoTimestamp | null;
  reconciledConfirmedAt: IsoTimestamp | null;
  reconciledMatchesTrackedAgreement: boolean | null;
  reconciledStatus: FundingTransactionReconciledStatus | null;
  stalePendingEscalatedAt: IsoTimestamp | null;
  submittedAt: IsoTimestamp;
  submittedByUserId: EntityId;
  submittedWalletAddress: WalletAddress;
  submittedWalletId: EntityId;
  supersededAt: IsoTimestamp | null;
  supersededByDealMilestoneSettlementExecutionTransactionId: EntityId | null;
  transactionHash: HexString;
}

export interface DealVersionFileRecord {
  createdAt: IsoTimestamp;
  dealVersionId: EntityId;
  fileId: EntityId;
  id: EntityId;
}

export interface DealVersionAcceptanceRecord {
  acceptedAt: IsoTimestamp;
  acceptedByUserId: EntityId;
  dealVersionId: EntityId;
  dealVersionPartyId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  scheme: TypedSignatureScheme;
  signature: string;
  signerWalletAddress: WalletAddress;
  signerWalletId: EntityId;
  typedData: JsonObject;
}

export interface CounterpartyDealVersionAcceptanceRecord {
  acceptedAt: IsoTimestamp;
  dealVersionId: EntityId;
  dealVersionPartyId: EntityId;
  id: EntityId;
  scheme: TypedSignatureScheme;
  signature: string;
  signerWalletAddress: WalletAddress;
  typedData: JsonObject;
}

export interface FundingTransactionRecord {
  chainId: ChainId;
  dealVersionId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  organizationId: EntityId;
  reconciledAgreementAddress: WalletAddress | null;
  reconciledAt: IsoTimestamp | null;
  reconciledConfirmedAt: IsoTimestamp | null;
  reconciledMatchesTrackedVersion: boolean | null;
  reconciledStatus: FundingTransactionReconciledStatus | null;
  stalePendingEscalatedAt: IsoTimestamp | null;
  submittedAt: IsoTimestamp;
  submittedByUserId: EntityId;
  submittedWalletAddress: WalletAddress;
  submittedWalletId: EntityId;
  supersededAt: IsoTimestamp | null;
  supersededByFundingTransactionId: EntityId | null;
  transactionHash: HexString;
}

export interface ChainCursorRecord {
  chainId: ChainId;
  cursorKey: string;
  lastProcessedBlockHash: HexString | null;
  lastProcessedBlockNumber: string | null;
  nextBlockNumber: string;
  updatedAt: IsoTimestamp;
}

export interface IndexedBlockRecord {
  blockHash: HexString;
  blockNumber: string;
  chainId: ChainId;
  indexedAt: IsoTimestamp;
  parentBlockHash: HexString;
  timestamp: IsoTimestamp;
}

export interface IndexedTransactionRecord {
  blockHash: HexString;
  blockNumber: string;
  chainId: ChainId;
  executionStatus: "SUCCESS" | "REVERTED";
  fromAddress: WalletAddress | null;
  indexedAt: IsoTimestamp;
  toAddress: WalletAddress | null;
  transactionHash: HexString;
  transactionIndex: number;
}

export interface IndexedContractEventRecord {
  blockHash: HexString;
  blockNumber: string;
  blockTimestamp: IsoTimestamp;
  chainId: ChainId;
  contractAddress: WalletAddress;
  contractName: IndexedContractName;
  data: JsonObject;
  eventName: IndexedEventName;
  indexedAt: IsoTimestamp;
  logIndex: number;
  topic0: HexString;
  topics: HexString[];
  transactionHash: HexString;
  transactionIndex: number;
}

export interface ContractOwnershipRecord {
  chainId: ChainId;
  contractAddress: WalletAddress;
  contractName: IndexedContractName;
  owner: WalletAddress;
  pendingOwner: WalletAddress | null;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface TokenAllowlistEntryRecord {
  chainId: ChainId;
  isAllowed: boolean;
  token: WalletAddress;
  tokenAllowlistAddress: WalletAddress;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface ArbitratorRegistryEntryRecord {
  arbitrator: WalletAddress;
  arbitratorRegistryAddress: WalletAddress;
  chainId: ChainId;
  isApproved: boolean;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface ProtocolConfigStateRecord {
  arbitratorRegistryAddress: WalletAddress | null;
  chainId: ChainId;
  createEscrowPaused: boolean;
  feeVaultAddress: WalletAddress | null;
  fundingPaused: boolean;
  owner: WalletAddress;
  pendingOwner: WalletAddress | null;
  protocolConfigAddress: WalletAddress;
  protocolFeeBps: number;
  tokenAllowlistAddress: WalletAddress | null;
  treasuryAddress: WalletAddress | null;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface FeeVaultStateRecord {
  chainId: ChainId;
  feeVaultAddress: WalletAddress;
  owner: WalletAddress;
  pendingOwner: WalletAddress | null;
  treasuryAddress: WalletAddress | null;
  updatedAt: IsoTimestamp;
  updatedBlockHash: HexString;
  updatedBlockNumber: string;
  updatedLogIndex: number;
  updatedTransactionHash: HexString;
}

export interface TreasuryMovementRecord {
  amount: string;
  chainId: ChainId;
  feeVaultAddress: WalletAddress;
  kind: TreasuryMovementKind;
  occurredAt: IsoTimestamp;
  occurredBlockHash: HexString;
  occurredBlockNumber: string;
  occurredLogIndex: number;
  occurredTransactionHash: HexString;
  tokenAddress: WalletAddress | null;
  treasuryAddress: WalletAddress;
}

export interface EscrowAgreementMilestoneSettlementRecord {
  agreementAddress: WalletAddress;
  amount: string;
  beneficiaryAddress: WalletAddress;
  chainId: ChainId;
  dealId: HexString;
  dealVersionHash: HexString;
  kind: "RELEASE" | "REFUND";
  milestonePosition: number;
  settledAt: IsoTimestamp;
  settledBlockHash: HexString;
  settledBlockNumber: string;
  settledByAddress: WalletAddress;
  settledLogIndex: number;
  settledTransactionHash: HexString;
  updatedAt: IsoTimestamp;
}

export interface EscrowAgreementRecord {
  agreementAddress: WalletAddress;
  arbitratorAddress: WalletAddress | null;
  buyerAddress: WalletAddress;
  chainId: ChainId;
  createdBlockHash: HexString;
  createdBlockNumber: string;
  createdLogIndex: number;
  createdTransactionHash: HexString;
  dealId: HexString;
  dealVersionHash: HexString;
  factoryAddress: WalletAddress;
  feeVaultAddress: WalletAddress;
  funded: boolean;
  fundedAt: IsoTimestamp | null;
  fundedBlockHash: HexString | null;
  fundedBlockNumber: string | null;
  fundedLogIndex: number | null;
  fundedPayerAddress: WalletAddress | null;
  fundedTransactionHash: HexString | null;
  initializedBlockHash: HexString;
  initializedBlockNumber: string;
  initializedLogIndex: number;
  initializedTimestamp: IsoTimestamp;
  initializedTransactionHash: HexString;
  milestoneCount: number;
  protocolConfigAddress: WalletAddress;
  protocolFeeBps: number;
  sellerAddress: WalletAddress;
  settlementTokenAddress: WalletAddress;
  totalAmount: string;
  updatedAt: IsoTimestamp;
}
