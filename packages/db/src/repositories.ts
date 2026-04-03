import type { ChainId, EntityId, WalletAddress } from "@blockchain-escrow/shared";

import type {
  AuditLogRecord,
  CounterpartyRecord,
  DealVersionAcceptanceRecord,
  DealVersionFileRecord,
  DealVersionMilestoneRecord,
  DealVersionPartyRecord,
  DealVersionRecord,
  DraftDealPartyRecord,
  DraftDealRecord,
  FileRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  SessionRecord,
  TemplateRecord,
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
}

export interface DraftDealPartyRepository {
  add(record: DraftDealPartyRecord): Promise<DraftDealPartyRecord>;
  listByDraftDealId(draftDealId: EntityId): Promise<DraftDealPartyRecord[]>;
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
  listByDealVersionId(
    dealVersionId: EntityId
  ): Promise<DealVersionMilestoneRecord[]>;
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

export interface Release1Repositories {
  auditLogs: AuditLogRepository;
  counterparties: CounterpartyRepository;
  dealVersionAcceptances: DealVersionAcceptanceRepository;
  dealVersionFiles: DealVersionFileRepository;
  dealVersionMilestones: DealVersionMilestoneRepository;
  dealVersionParties: DealVersionPartyRepository;
  dealVersions: DealVersionRepository;
  draftDealParties: DraftDealPartyRepository;
  draftDeals: DraftDealRepository;
  files: FileRepository;
  organizationInvites: OrganizationInviteRepository;
  organizationMembers: OrganizationMemberRepository;
  organizations: OrganizationRepository;
  sessions: SessionRepository;
  templates: TemplateRepository;
  users: UserRepository;
  walletNonces: WalletNonceRepository;
  wallets: WalletRepository;
}
