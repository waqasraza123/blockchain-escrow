import {
  Prisma,
  PrismaClient,
  SessionStatus as PrismaSessionStatus,
  OrganizationInviteStatus as PrismaOrganizationInviteStatus,
  OrganizationRole as PrismaOrganizationRole,
  AuditAction as PrismaAuditAction,
  AuditEntityType as PrismaAuditEntityType
} from "@prisma/client";

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
import type {
  AuditLogRepository,
  OrganizationInviteRepository,
  OrganizationMemberRepository,
  OrganizationRepository,
  Release1Repositories,
  SessionRepository,
  UserRepository,
  WalletNonceRepository,
  WalletRepository
} from "./repositories";

function toIsoTimestamp(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toRequiredIsoTimestamp(value: Date): string {
  return value.toISOString();
}

function toDate(value: string): Date {
  return new Date(value);
}

function toPrismaJsonInput(
  value: AuditLogRecord["metadata"]
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function mapUserRecord(record: {
  createdAt: Date;
  id: string;
  updatedAt: Date;
}): UserRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapWalletRecord(record: {
  address: string;
  chainId: number | null;
  createdAt: Date;
  id: string;
  isPrimary: boolean;
  updatedAt: Date;
  userId: string;
}): WalletRecord {
  return {
    address: record.address as WalletRecord["address"],
    chainId: record.chainId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    isPrimary: record.isPrimary,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    userId: record.userId
  };
}

function mapWalletNonceRecord(record: {
  chainId: number;
  consumedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  nonce: string;
  walletAddress: string;
}): WalletNonceRecord {
  return {
    chainId: record.chainId,
    consumedAt: toIsoTimestamp(record.consumedAt),
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    nonce: record.nonce,
    walletAddress: record.walletAddress as WalletNonceRecord["walletAddress"]
  };
}

function mapSessionRecord(record: {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  status: PrismaSessionStatus;
  tokenHash: string;
  userId: string;
  walletId: string;
}): SessionRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    lastSeenAt: toIsoTimestamp(record.lastSeenAt),
    revokedAt: toIsoTimestamp(record.revokedAt),
    status: record.status,
    tokenHash: record.tokenHash,
    userId: record.userId,
    walletId: record.walletId
  };
}

function mapOrganizationRecord(record: {
  createdAt: Date;
  createdByUserId: string;
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
}): OrganizationRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    createdByUserId: record.createdByUserId,
    id: record.id,
    name: record.name,
    slug: record.slug,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapOrganizationMemberRecord(record: {
  createdAt: Date;
  id: string;
  organizationId: string;
  role: PrismaOrganizationRole;
  updatedAt: Date;
  userId: string;
}): OrganizationMemberRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    organizationId: record.organizationId,
    role: record.role,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    userId: record.userId
  };
}

function mapOrganizationInviteRecord(record: {
  acceptedAt: Date | null;
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  invitedByUserId: string;
  organizationId: string;
  role: PrismaOrganizationRole;
  status: PrismaOrganizationInviteStatus;
  tokenHash: string;
  updatedAt: Date;
}): OrganizationInviteRecord {
  return {
    acceptedAt: toIsoTimestamp(record.acceptedAt),
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    email: record.email,
    expiresAt: toRequiredIsoTimestamp(record.expiresAt),
    id: record.id,
    invitedByUserId: record.invitedByUserId,
    organizationId: record.organizationId,
    role: record.role,
    status: record.status,
    tokenHash: record.tokenHash,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapAuditLogRecord(record: {
  action: PrismaAuditAction;
  actorUserId: string | null;
  entityId: string;
  entityType: PrismaAuditEntityType;
  id: string;
  ipAddress: string | null;
  metadata: unknown;
  occurredAt: Date;
  organizationId: string | null;
  userAgent: string | null;
}): AuditLogRecord {
  return {
    action: record.action,
    actorUserId: record.actorUserId,
    entityId: record.entityId,
    entityType: record.entityType,
    id: record.id,
    ipAddress: record.ipAddress,
    metadata: (record.metadata ?? null) as AuditLogRecord["metadata"],
    occurredAt: toRequiredIsoTimestamp(record.occurredAt),
    organizationId: record.organizationId,
    userAgent: record.userAgent
  };
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: UserRecord): Promise<UserRecord> {
    const created = await this.prisma.user.create({
      data: {
        createdAt: toDate(record.createdAt),
        id: record.id,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapUserRecord(created);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? mapUserRecord(record) : null;
  }
}

export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: WalletRecord): Promise<WalletRecord> {
    const created = await this.prisma.wallet.create({
      data: {
        address: record.address,
        chainId: record.chainId,
        createdAt: toDate(record.createdAt),
        id: record.id,
        isPrimary: record.isPrimary,
        updatedAt: toDate(record.updatedAt),
        userId: record.userId
      }
    });

    return mapWalletRecord(created);
  }

  async findByAddress(address: string): Promise<WalletRecord | null> {
    const record = await this.prisma.wallet.findUnique({ where: { address } });
    return record ? mapWalletRecord(record) : null;
  }

  async listByUserId(userId: string): Promise<WalletRecord[]> {
    const records = await this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapWalletRecord);
  }
}

export class PrismaWalletNonceRepository implements WalletNonceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async consume(id: string): Promise<WalletNonceRecord | null> {
    const existing = await this.prisma.walletNonce.findUnique({ where: { id } });

    if (!existing || existing.consumedAt) {
      return existing ? mapWalletNonceRecord(existing) : null;
    }

    const updated = await this.prisma.walletNonce.update({
      where: { id },
      data: { consumedAt: new Date() }
    });

    return mapWalletNonceRecord(updated);
  }

  async create(record: WalletNonceRecord): Promise<WalletNonceRecord> {
    const created = await this.prisma.walletNonce.create({
      data: {
        chainId: record.chainId,
        consumedAt: record.consumedAt ? toDate(record.consumedAt) : null,
        createdAt: toDate(record.createdAt),
        expiresAt: toDate(record.expiresAt),
        id: record.id,
        nonce: record.nonce,
        walletAddress: record.walletAddress
      }
    });

    return mapWalletNonceRecord(created);
  }

  async findActiveByWalletAddress(
    walletAddress: string
  ): Promise<WalletNonceRecord | null> {
    const record = await this.prisma.walletNonce.findFirst({
      where: {
        consumedAt: null,
        expiresAt: { gt: new Date() },
        walletAddress
      },
      orderBy: { createdAt: "desc" }
    });

    return record ? mapWalletNonceRecord(record) : null;
  }
}

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: SessionRecord): Promise<SessionRecord> {
    const created = await this.prisma.session.create({
      data: {
        createdAt: toDate(record.createdAt),
        expiresAt: toDate(record.expiresAt),
        id: record.id,
        lastSeenAt: record.lastSeenAt ? toDate(record.lastSeenAt) : null,
        revokedAt: record.revokedAt ? toDate(record.revokedAt) : null,
        status: record.status,
        tokenHash: record.tokenHash,
        userId: record.userId,
        walletId: record.walletId
      }
    });

    return mapSessionRecord(created);
  }

  async findById(id: string): Promise<SessionRecord | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });
    return record ? mapSessionRecord(record) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const record = await this.prisma.session.findUnique({
      where: { tokenHash }
    });

    return record ? mapSessionRecord(record) : null;
  }

  async revoke(id: string): Promise<SessionRecord | null> {
    const existing = await this.prisma.session.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        status: PrismaSessionStatus.REVOKED
      }
    });

    return mapSessionRecord(updated);
  }

  async touch(id: string): Promise<SessionRecord | null> {
    const existing = await this.prisma.session.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.session.update({
      where: { id },
      data: { lastSeenAt: new Date() }
    });

    return mapSessionRecord(updated);
  }
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(record: OrganizationRecord): Promise<OrganizationRecord> {
    const created = await this.prisma.organization.create({
      data: {
        createdAt: toDate(record.createdAt),
        createdByUserId: record.createdByUserId,
        id: record.id,
        name: record.name,
        slug: record.slug,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapOrganizationRecord(created);
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const record = await this.prisma.organization.findUnique({ where: { id } });
    return record ? mapOrganizationRecord(record) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationRecord | null> {
    const record = await this.prisma.organization.findUnique({ where: { slug } });
    return record ? mapOrganizationRecord(record) : null;
  }

  async listByUserId(userId: string): Promise<OrganizationRecord[]> {
    const records = await this.prisma.organization.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationRecord);
  }
}

export class PrismaOrganizationMemberRepository
  implements OrganizationMemberRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async add(record: OrganizationMemberRecord): Promise<OrganizationMemberRecord> {
    const created = await this.prisma.organizationMember.create({
      data: {
        createdAt: toDate(record.createdAt),
        id: record.id,
        organizationId: record.organizationId,
        role: record.role,
        updatedAt: toDate(record.updatedAt),
        userId: record.userId
      }
    });

    return mapOrganizationMemberRecord(created);
  }

  async findById(id: string): Promise<OrganizationMemberRecord | null> {
    const record = await this.prisma.organizationMember.findUnique({
      where: { id }
    });

    return record ? mapOrganizationMemberRecord(record) : null;
  }

  async findMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationMemberRecord | null> {
    const record = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });

    return record ? mapOrganizationMemberRecord(record) : null;
  }

  async listByOrganizationId(
    organizationId: string
  ): Promise<OrganizationMemberRecord[]> {
    const records = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationMemberRecord);
  }

  async remove(id: string): Promise<OrganizationMemberRecord | null> {
    const existing = await this.prisma.organizationMember.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const deleted = await this.prisma.organizationMember.delete({
      where: { id }
    });

    return mapOrganizationMemberRecord(deleted);
  }

  async updateRole(
    id: string,
    role: OrganizationMemberRecord["role"]
  ): Promise<OrganizationMemberRecord | null> {
    const existing = await this.prisma.organizationMember.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id },
      data: {
        role,
        updatedAt: new Date()
      }
    });

    return mapOrganizationMemberRecord(updated);
  }
}

export class PrismaOrganizationInviteRepository
  implements OrganizationInviteRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async accept(id: string): Promise<OrganizationInviteRecord | null> {
    const existing = await this.prisma.organizationInvite.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.organizationInvite.update({
      where: { id },
      data: {
        acceptedAt: new Date(),
        status: PrismaOrganizationInviteStatus.ACCEPTED,
        updatedAt: new Date()
      }
    });

    return mapOrganizationInviteRecord(updated);
  }

  async create(record: OrganizationInviteRecord): Promise<OrganizationInviteRecord> {
    const created = await this.prisma.organizationInvite.create({
      data: {
        acceptedAt: record.acceptedAt ? toDate(record.acceptedAt) : null,
        createdAt: toDate(record.createdAt),
        email: record.email,
        expiresAt: toDate(record.expiresAt),
        id: record.id,
        invitedByUserId: record.invitedByUserId,
        organizationId: record.organizationId,
        role: record.role,
        status: record.status,
        tokenHash: record.tokenHash,
        updatedAt: toDate(record.updatedAt)
      }
    });

    return mapOrganizationInviteRecord(created);
  }

  async findById(id: string): Promise<OrganizationInviteRecord | null> {
    const record = await this.prisma.organizationInvite.findUnique({
      where: { id }
    });

    return record ? mapOrganizationInviteRecord(record) : null;
  }

  async findByTokenHash(
    tokenHash: string
  ): Promise<OrganizationInviteRecord | null> {
    const record = await this.prisma.organizationInvite.findUnique({
      where: { tokenHash }
    });

    return record ? mapOrganizationInviteRecord(record) : null;
  }

  async listPendingByOrganizationId(
    organizationId: string
  ): Promise<OrganizationInviteRecord[]> {
    const records = await this.prisma.organizationInvite.findMany({
      where: {
        organizationId,
        status: PrismaOrganizationInviteStatus.PENDING
      },
      orderBy: { createdAt: "asc" }
    });

    return records.map(mapOrganizationInviteRecord);
  }

  async revoke(id: string): Promise<OrganizationInviteRecord | null> {
    const existing = await this.prisma.organizationInvite.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    const updated = await this.prisma.organizationInvite.update({
      where: { id },
      data: {
        status: PrismaOrganizationInviteStatus.REVOKED,
        updatedAt: new Date()
      }
    });

    return mapOrganizationInviteRecord(updated);
  }
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(record: AuditLogRecord): Promise<AuditLogRecord> {
    const created = await this.prisma.auditLog.create({
      data: {
        action: record.action,
        actorUserId: record.actorUserId,
        entityId: record.entityId,
        entityType: record.entityType,
        id: record.id,
        ipAddress: record.ipAddress,
        metadata: toPrismaJsonInput(record.metadata),
        occurredAt: toDate(record.occurredAt),
        organizationId: record.organizationId,
        userAgent: record.userAgent
      }
    });

    return mapAuditLogRecord(created);
  }

  async listByEntity(
    entityType: AuditLogRecord["entityType"],
    entityId: string
  ): Promise<AuditLogRecord[]> {
    const records = await this.prisma.auditLog.findMany({
      where: {
        entityId,
        entityType
      },
      orderBy: { occurredAt: "asc" }
    });

    return records.map(mapAuditLogRecord);
  }
}

export class PrismaRelease1Repositories implements Release1Repositories {
  readonly auditLogs: AuditLogRepository;
  readonly organizationInvites: OrganizationInviteRepository;
  readonly organizationMembers: OrganizationMemberRepository;
  readonly organizations: OrganizationRepository;
  readonly sessions: SessionRepository;
  readonly users: UserRepository;
  readonly walletNonces: WalletNonceRepository;
  readonly wallets: WalletRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.auditLogs = new PrismaAuditLogRepository(prisma);
    this.organizationInvites = new PrismaOrganizationInviteRepository(prisma);
    this.organizationMembers = new PrismaOrganizationMemberRepository(prisma);
    this.organizations = new PrismaOrganizationRepository(prisma);
    this.sessions = new PrismaSessionRepository(prisma);
    this.users = new PrismaUserRepository(prisma);
    this.walletNonces = new PrismaWalletNonceRepository(prisma);
    this.wallets = new PrismaWalletRepository(prisma);
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export function createRelease1Repositories(
  prismaClient?: PrismaClient
): PrismaRelease1Repositories {
  return new PrismaRelease1Repositories(prismaClient ?? new PrismaClient());
}
