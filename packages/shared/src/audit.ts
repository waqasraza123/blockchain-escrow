import { z } from "zod";

import type { EntityId, IsoTimestamp, JsonObject } from "./primitives";

export const auditActionSchema = z.enum([
  "AUTH_LOGOUT",
  "AUTH_NONCE_ISSUED",
  "AUTH_SESSION_VERIFIED",
  "COUNTERPARTY_CREATED",
  "FILE_CREATED",
  "ORGANIZATION_CREATED",
  "ORGANIZATION_INVITE_REVOKED",
  "ORGANIZATION_INVITE_ACCEPTED",
  "ORGANIZATION_INVITE_CREATED",
  "ORGANIZATION_MEMBER_REMOVED",
  "ORGANIZATION_MEMBER_ROLE_UPDATED"
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntityTypeSchema = z.enum([
  "COUNTERPARTY",
  "FILE",
  "ORGANIZATION",
  "ORGANIZATION_INVITE",
  "ORGANIZATION_MEMBER",
  "SESSION",
  "USER",
  "WALLET"
]);
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>;

export const listAuditLogsParamsSchema = z.object({
  entityId: z.string().trim().min(1),
  entityType: auditEntityTypeSchema
});
export type ListAuditLogsParams = z.infer<typeof listAuditLogsParamsSchema>;

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

export interface ListAuditLogsResponse {
  auditLogs: AuditLogEntry[];
}
