import type {
  ApprovalPolicyKind,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  AuditAction,
  AuditEntityType,
  ChainId,
  CostCenterStatus,
  DealPartyRole,
  DealPartySubjectType,
  DealState,
  EntityId,
  FileCategory,
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
  MilestoneSettlementRequestKind,
  MilestoneSettlementRequestSource,
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
  dealVersionId: EntityId;
  draftDealId: EntityId;
  id: EntityId;
  kind: ApprovalPolicyKind;
  note: string | null;
  organizationId: EntityId;
  requestedAt: IsoTimestamp;
  requestedByUserId: EntityId;
  settlementCurrency: SettlementCurrency;
  status: ApprovalRequestStatus;
  title: string;
  totalAmountMinor: string;
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
