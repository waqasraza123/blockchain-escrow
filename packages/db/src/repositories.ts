import type { EntityId, WalletAddress } from "@blockchain-escrow/shared";

import type {
  AuditLogRecord,
  OrganizationInviteRecord,
  OrganizationMemberRecord,
  OrganizationRecord,
  SessionRecord,
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
  findByAddress(address: WalletAddress): Promise<WalletRecord | null>;
  listByUserId(userId: EntityId): Promise<WalletRecord[]>;
}

export interface WalletNonceRepository {
  consume(id: EntityId): Promise<WalletNonceRecord | null>;
  create(record: WalletNonceRecord): Promise<WalletNonceRecord>;
  findActiveByWalletAddress(
    walletAddress: WalletAddress
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

export interface Release1Repositories {
  auditLogs: AuditLogRepository;
  organizationInvites: OrganizationInviteRepository;
  organizationMembers: OrganizationMemberRepository;
  organizations: OrganizationRepository;
  sessions: SessionRepository;
  users: UserRepository;
  walletNonces: WalletNonceRepository;
  wallets: WalletRepository;
}
