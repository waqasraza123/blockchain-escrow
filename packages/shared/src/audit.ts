import type { EntityId, IsoTimestamp, JsonObject } from "./primitives";

export type AuditAction =
  | "AUTH_LOGOUT"
  | "AUTH_NONCE_ISSUED"
  | "AUTH_SESSION_VERIFIED"
  | "ORGANIZATION_CREATED"
  | "ORGANIZATION_INVITE_ACCEPTED"
  | "ORGANIZATION_INVITE_CREATED"
  | "ORGANIZATION_MEMBER_REMOVED"
  | "ORGANIZATION_MEMBER_ROLE_UPDATED";

export type AuditEntityType =
  | "ORGANIZATION"
  | "ORGANIZATION_INVITE"
  | "ORGANIZATION_MEMBER"
  | "SESSION"
  | "USER"
  | "WALLET";

export interface AuditLogEntry {
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
