import { z } from "zod";

import type { EntityId, IsoTimestamp, JsonObject } from "./primitives";

export const auditActionSchema = z.enum([
  "AUTH_LOGOUT",
  "AUTH_NONCE_ISSUED",
  "AUTH_SESSION_VERIFIED",
  "COUNTERPARTY_CREATED",
  "DRAFT_DEAL_COUNTERPARTY_WALLET_UPDATED",
  "DEAL_VERSION_ACCEPTANCE_CREATED",
  "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE_CREATED",
  "DEAL_MILESTONE_RELEASE_REQUESTED",
  "DEAL_MILESTONE_REFUND_REQUESTED",
  "DEAL_MILESTONE_REVIEW_APPROVED",
  "DEAL_MILESTONE_REVIEW_REJECTED",
  "DEAL_MILESTONE_SUBMISSION_CREATED",
  "DRAFT_DEAL_ACTIVATED",
  "DEAL_VERSION_CREATED",
  "DRAFT_DEAL_CREATED",
  "FILE_CREATED",
  "FUNDING_TRANSACTION_RECONCILIATION_UPDATED",
  "FUNDING_TRANSACTION_STALE_PENDING",
  "FUNDING_TRANSACTION_SUPERSEDED",
  "FUNDING_TRANSACTION_SUBMITTED",
  "ORGANIZATION_CREATED",
  "ORGANIZATION_INVITE_REVOKED",
  "ORGANIZATION_INVITE_ACCEPTED",
  "ORGANIZATION_INVITE_CREATED",
  "ORGANIZATION_MEMBER_REMOVED",
  "ORGANIZATION_MEMBER_ROLE_UPDATED",
  "TEMPLATE_CREATED"
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntityTypeSchema = z.enum([
  "COUNTERPARTY",
  "DEAL_VERSION_ACCEPTANCE",
  "DEAL_VERSION_COUNTERPARTY_ACCEPTANCE",
  "DEAL_VERSION",
  "DEAL_MILESTONE_SETTLEMENT_REQUEST",
  "DEAL_MILESTONE_REVIEW",
  "DEAL_MILESTONE_SUBMISSION",
  "DRAFT_DEAL",
  "FILE",
  "FUNDING_TRANSACTION",
  "ORGANIZATION",
  "ORGANIZATION_INVITE",
  "ORGANIZATION_MEMBER",
  "SESSION",
  "TEMPLATE",
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
