import type {
  AuditAction,
  AuditEntityType,
  ChainId,
  EntityId,
  IsoTimestamp,
  JsonObject,
  OrganizationInviteStatus,
  OrganizationRole,
  SessionStatus,
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
