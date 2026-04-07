import type {
  ChainId,
  EntityId,
  HexString,
  IsoTimestamp,
  WalletAddress
} from "@blockchain-escrow/shared";

import type {
  ArbitratorRegistryEntryRecord,
  AuditLogRecord,
  ChainCursorRecord,
  ContractOwnershipRecord,
  CounterpartyRecord,
  CounterpartyDealVersionAcceptanceRecord,
  DealMilestoneReviewRecord,
  DealMilestoneSubmissionFileRecord,
  DealMilestoneSubmissionRecord,
  DealVersionAcceptanceRecord,
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  EscrowAgreementRecord,
  FeeVaultStateRecord,
  FileRecord,
  FundingTransactionRecord,
  IndexedBlockRecord,
  IndexedContractEventRecord,
  IndexedTransactionRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  ProtocolConfigStateRecord,
  SessionRecord,
  TemplateRecord,
  TokenAllowlistEntryRecord,
  UserRecord,
  WalletNonceRecord,
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

export interface OrganizationRepository {
  create(record: OrganizationRecord): Promise<OrganizationRecord>;
  findById(id: EntityId): Promise<OrganizationRecord | null>;
  findBySlug(slug: string): Promise<OrganizationRecord | null>;
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
  listByOrganizationId(organizationId: EntityId): Promise<DraftDealRecord[]>;
  listByStates(states: DraftDealRecord["state"][]): Promise<DraftDealRecord[]>;
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

export interface DealMilestoneReviewRepository {
  create(record: DealMilestoneReviewRecord): Promise<DealMilestoneReviewRecord>;
  findByDealMilestoneSubmissionId(
    dealMilestoneSubmissionId: EntityId
  ): Promise<DealMilestoneReviewRecord | null>;
  findById(id: EntityId): Promise<DealMilestoneReviewRecord | null>;
  listByDealVersionId(dealVersionId: EntityId): Promise<DealMilestoneReviewRecord[]>;
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

export interface Release4Repositories {
  arbitratorRegistryEntries: ArbitratorRegistryEntryRepository;
  chainCursors: ChainCursorRepository;
  contractOwnerships: ContractOwnershipRepository;
  escrowAgreements: EscrowAgreementRepository;
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
  dealMilestoneReviews: DealMilestoneReviewRepository;
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
