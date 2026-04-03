import type {
  EntityId,
  IsoTimestamp,
  OrganizationRole,
  WalletAddress
} from "@blockchain-escrow/shared";

export interface SessionActor {
  authenticatedAt: IsoTimestamp;
  sessionId: EntityId;
  userId: EntityId;
  walletAddress: WalletAddress;
  walletId: EntityId;
}

export interface OrganizationScope {
  organizationId: EntityId;
  role: OrganizationRole;
}

export interface RequestContext {
  actor: SessionActor | null;
  ipAddress: string | null;
  organizationScope: OrganizationScope | null;
  requestId: string;
  userAgent: string | null;
}
