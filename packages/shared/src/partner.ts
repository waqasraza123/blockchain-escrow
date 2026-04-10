import { z } from "zod";

import type {
  ApprovalRequestDetailResponse,
  CreateApprovalRequestResponse,
  ListApprovalRequestsResponse
} from "./approvals";
import type {
  CreateDealVersionResponse,
  CreateDraftDealResponse,
  DraftDealDetailResponse,
  ListDraftDealsResponse
} from "./drafts";
import type {
  CreateCounterpartyDealVersionAcceptanceResponse,
  CreateDealVersionAcceptanceResponse,
  GetCounterpartyDealVersionAcceptanceResponse
} from "./acceptances";
import type {
  CreateFundingTransactionResponse,
  GetFundingPreparationResponse
} from "./funding";
import type {
  CreateDealMilestoneDisputeResponse,
  CreateDealMilestoneReviewResponse,
  CreateDealMilestoneSettlementRequestResponse,
  CreateCounterpartyDealMilestoneSubmissionResponse,
  GetDealVersionSettlementStatementResponse,
  PrepareCounterpartyDealMilestoneSubmissionResponse
} from "./drafts";
import type { CreateFileResponse, FileSummary } from "./files";
import type { EntityId, IsoTimestamp, JsonObject, WalletAddress } from "./primitives";

export const partnerAccountStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type PartnerAccountStatus = z.infer<typeof partnerAccountStatusSchema>;

export const partnerOrganizationLinkStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type PartnerOrganizationLinkStatus = z.infer<
  typeof partnerOrganizationLinkStatusSchema
>;

export const partnerApiKeyStatusSchema = z.enum(["ACTIVE", "REVOKED", "EXPIRED"]);
export type PartnerApiKeyStatus = z.infer<typeof partnerApiKeyStatusSchema>;

export const partnerHostedSessionTypeSchema = z.enum([
  "COUNTERPARTY_VERSION_ACCEPTANCE",
  "COUNTERPARTY_MILESTONE_SUBMISSION",
  "DISPUTE_EVIDENCE_UPLOAD",
  "DEAL_STATUS_REVIEW"
]);
export type PartnerHostedSessionType = z.infer<
  typeof partnerHostedSessionTypeSchema
>;

export const partnerHostedSessionStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED"
]);
export type PartnerHostedSessionStatus = z.infer<
  typeof partnerHostedSessionStatusSchema
>;

export const partnerWebhookSubscriptionStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "DISABLED"
]);
export type PartnerWebhookSubscriptionStatus = z.infer<
  typeof partnerWebhookSubscriptionStatusSchema
>;

export const partnerWebhookDeliveryStatusSchema = z.enum([
  "PENDING",
  "DELIVERING",
  "SUCCEEDED",
  "FAILED"
]);
export type PartnerWebhookDeliveryStatus = z.infer<
  typeof partnerWebhookDeliveryStatusSchema
>;

export const partnerResourceTypeSchema = z.enum([
  "DRAFT_DEAL",
  "DEAL_VERSION",
  "APPROVAL_REQUEST",
  "PARTNER_HOSTED_SESSION"
]);
export type PartnerResourceType = z.infer<typeof partnerResourceTypeSchema>;

export const partnerScopeSchema = z.enum([
  "deals:read",
  "deals:write",
  "funding:write",
  "milestones:write",
  "disputes:write",
  "approvals:read",
  "approvals:write",
  "hosted_sessions:write",
  "webhooks:read"
]);
export type PartnerScope = z.infer<typeof partnerScopeSchema>;

export const partnerWebhookEventTypeSchema = z.enum([
  "draft.deal.created",
  "deal.version.created",
  "deal.version.accepted",
  "deal.version.counterparty_accepted",
  "funding.transaction.updated",
  "draft.deal.activated",
  "milestone.submission.created",
  "milestone.review.created",
  "milestone.settlement_requested",
  "milestone.dispute.opened",
  "milestone.dispute.decided",
  "settlement.execution.updated",
  "approval.request.updated",
  "hosted.session.completed",
  "hosted.session.expired"
]);
export type PartnerWebhookEventType = z.infer<
  typeof partnerWebhookEventTypeSchema
>;

const optionalIdSchema = z.string().trim().min(1).optional();
const optionalIsoDateTimeSchema = z.string().datetime({ offset: true }).optional();

export const createPartnerAccountSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
});
export type CreatePartnerAccountInput = z.infer<typeof createPartnerAccountSchema>;

export const partnerAccountParamsSchema = z.object({
  partnerAccountId: z.string().trim().min(1)
});
export type PartnerAccountParams = z.infer<typeof partnerAccountParamsSchema>;

export const createPartnerOrganizationLinkSchema = z.object({
  actingUserId: z.string().trim().min(1),
  actingWalletId: z.string().trim().min(1),
  externalReference: z.string().trim().min(1).max(200).optional(),
  organizationId: z.string().trim().min(1)
});
export type CreatePartnerOrganizationLinkInput = z.infer<
  typeof createPartnerOrganizationLinkSchema
>;

export const partnerOrganizationLinkParamsSchema = z.object({
  partnerOrganizationLinkId: z.string().trim().min(1)
});
export type PartnerOrganizationLinkParams = z.infer<
  typeof partnerOrganizationLinkParamsSchema
>;

export const createPartnerApiKeySchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  expiresAt: optionalIsoDateTimeSchema,
  scopes: z.array(partnerScopeSchema).min(1).max(16).optional()
});
export type CreatePartnerApiKeyInput = z.infer<typeof createPartnerApiKeySchema>;

export const revokePartnerApiKeySchema = z.object({
  reason: z.string().trim().min(1).max(4000).optional()
});
export type RevokePartnerApiKeyInput = z.infer<typeof revokePartnerApiKeySchema>;

export const rotatePartnerApiKeySchema = createPartnerApiKeySchema.extend({
  revokeReason: z.string().trim().min(1).max(4000).optional()
});
export type RotatePartnerApiKeyInput = z.infer<typeof rotatePartnerApiKeySchema>;

export const partnerApiKeyParamsSchema = z.object({
  partnerApiKeyId: z.string().trim().min(1)
});
export type PartnerApiKeyParams = z.infer<typeof partnerApiKeyParamsSchema>;

export const createPartnerWebhookSubscriptionSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  endpointUrl: z.string().url().max(1000),
  eventTypes: z.array(partnerWebhookEventTypeSchema).min(1).max(32)
});
export type CreatePartnerWebhookSubscriptionInput = z.infer<
  typeof createPartnerWebhookSubscriptionSchema
>;

export const updatePartnerWebhookSubscriptionSchema = z.object({
  status: partnerWebhookSubscriptionStatusSchema
});
export type UpdatePartnerWebhookSubscriptionInput = z.infer<
  typeof updatePartnerWebhookSubscriptionSchema
>;

export const partnerWebhookSubscriptionParamsSchema = z.object({
  partnerWebhookSubscriptionId: z.string().trim().min(1)
});
export type PartnerWebhookSubscriptionParams = z.infer<
  typeof partnerWebhookSubscriptionParamsSchema
>;

export const createPartnerHostedSessionSchema = z.object({
  dealMilestoneDisputeId: optionalIdSchema,
  dealVersionId: optionalIdSchema,
  dealVersionMilestoneId: optionalIdSchema,
  draftDealId: optionalIdSchema,
  expiresAt: optionalIsoDateTimeSchema,
  expiresInSeconds: z.number().int().positive().max(604800).optional(),
  partnerReferenceId: z.string().trim().min(1).max(200).optional(),
  type: partnerHostedSessionTypeSchema
});
export type CreatePartnerHostedSessionInput = z.infer<
  typeof createPartnerHostedSessionSchema
>;

export const partnerHostedSessionParamsSchema = z.object({
  hostedSessionId: z.string().trim().min(1)
});
export type PartnerHostedSessionParams = z.infer<
  typeof partnerHostedSessionParamsSchema
>;

export const partnerWriteReferenceSchema = z.object({
  partnerReferenceId: z.string().trim().min(1).max(200).optional()
});
export type PartnerWriteReferenceInput = z.infer<typeof partnerWriteReferenceSchema>;

export interface PartnerAccountSummary {
  createdAt: IsoTimestamp;
  id: EntityId;
  metadata: JsonObject | null;
  name: string;
  slug: string;
  status: PartnerAccountStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerOrganizationLinkSummary {
  actingUserId: EntityId;
  actingWalletId: EntityId;
  createdAt: IsoTimestamp;
  externalReference: string | null;
  id: EntityId;
  organizationId: EntityId;
  partnerAccountId: EntityId;
  status: PartnerOrganizationLinkStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerApiKeySummary {
  createdAt: IsoTimestamp;
  displayName: string;
  expiresAt: IsoTimestamp | null;
  id: EntityId;
  keyPrefix: string;
  lastUsedAt: IsoTimestamp | null;
  partnerOrganizationLinkId: EntityId;
  revokedAt: IsoTimestamp | null;
  scopes: PartnerScope[];
  status: PartnerApiKeyStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerApiKeyWithSecret extends PartnerApiKeySummary {
  apiKey: string;
}

export interface PartnerWebhookSubscriptionSummary {
  createdAt: IsoTimestamp;
  displayName: string;
  endpointUrl: string;
  eventTypes: PartnerWebhookEventType[];
  id: EntityId;
  lastDeliveryAt: IsoTimestamp | null;
  partnerOrganizationLinkId: EntityId;
  status: PartnerWebhookSubscriptionStatus;
  updatedAt: IsoTimestamp;
}

export interface PartnerWebhookDeliveryAttemptSummary {
  attemptedAt: IsoTimestamp;
  durationMs: number | null;
  errorMessage: string | null;
  finishedAt: IsoTimestamp | null;
  id: EntityId;
  nextRetryAt: IsoTimestamp | null;
  responseStatusCode: number | null;
}

export interface PartnerWebhookDeliverySummary {
  createdAt: IsoTimestamp;
  deliveredAt: IsoTimestamp | null;
  errorMessage: string | null;
  eventType: PartnerWebhookEventType;
  id: EntityId;
  lastAttemptAt: IsoTimestamp | null;
  nextAttemptAt: IsoTimestamp | null;
  partnerOrganizationLinkId: EntityId;
  partnerWebhookSubscriptionId: EntityId;
  status: PartnerWebhookDeliveryStatus;
}

export interface PartnerWebhookDeliveryDetail extends PartnerWebhookDeliverySummary {
  attempts: PartnerWebhookDeliveryAttemptSummary[];
  payload: JsonObject;
  subscription: PartnerWebhookSubscriptionSummary;
}

export interface PartnerHostedSessionSummary {
  completedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  dealMilestoneDisputeId: EntityId | null;
  dealVersionId: EntityId | null;
  dealVersionMilestoneId: EntityId | null;
  draftDealId: EntityId | null;
  expiresAt: IsoTimestamp;
  id: EntityId;
  partnerOrganizationLinkId: EntityId;
  partnerReferenceId: string | null;
  status: PartnerHostedSessionStatus;
  type: PartnerHostedSessionType;
  updatedAt: IsoTimestamp;
}

export interface PartnerHostedSessionDetail extends PartnerHostedSessionSummary {
  launchUrl: string | null;
}

export interface PartnerPublicAccountResponse {
  account: PartnerAccountSummary;
  apiKey: PartnerApiKeySummary;
  link: PartnerOrganizationLinkSummary;
}

export interface CreatePartnerAccountResponse {
  partnerAccount: PartnerAccountSummary;
}

export interface ListPartnerAccountsResponse {
  partners: PartnerAccountSummary[];
}

export interface PartnerAccountDetailResponse {
  apiKeys: PartnerApiKeySummary[];
  hostedSessions: PartnerHostedSessionSummary[];
  partner: PartnerAccountSummary;
  recentDeliveries: PartnerWebhookDeliverySummary[];
  subscriptions: PartnerWebhookSubscriptionSummary[];
  links: PartnerOrganizationLinkSummary[];
}

export interface CreatePartnerOrganizationLinkResponse {
  link: PartnerOrganizationLinkSummary;
}

export interface CreatePartnerApiKeyResponse {
  apiKey: PartnerApiKeyWithSecret;
}

export interface RevokePartnerApiKeyResponse {
  apiKey: PartnerApiKeySummary;
}

export interface RotatePartnerApiKeyResponse {
  previousApiKey: PartnerApiKeySummary;
  replacementApiKey: PartnerApiKeyWithSecret;
}

export interface CreatePartnerWebhookSubscriptionResponse {
  subscription: PartnerWebhookSubscriptionSummary;
}

export interface UpdatePartnerWebhookSubscriptionResponse {
  subscription: PartnerWebhookSubscriptionSummary;
}

export interface RotatePartnerWebhookSubscriptionSecretResponse {
  secret: string;
  subscription: PartnerWebhookSubscriptionSummary;
}

export interface CreatePartnerHostedSessionResponse {
  hostedSession: PartnerHostedSessionDetail;
}

export interface ListPartnerHostedSessionsResponse {
  hostedSessions: PartnerHostedSessionSummary[];
}

export interface PartnerHostedSessionResponse {
  hostedSession: PartnerHostedSessionDetail;
}

export interface OrganizationPartnerOverviewResponse {
  apiKeys: PartnerApiKeySummary[];
  hostedSessions: PartnerHostedSessionSummary[];
  partners: PartnerAccountSummary[];
  recentDeliveries: PartnerWebhookDeliverySummary[];
  subscriptions: PartnerWebhookSubscriptionSummary[];
}

export const hostedLaunchTokenParamsSchema = z.object({
  launchToken: z.string().trim().min(1)
});
export type HostedLaunchTokenParams = z.infer<typeof hostedLaunchTokenParamsSchema>;

export interface HostedLaunchSessionResponse {
  hostedSession: PartnerHostedSessionSummary;
}

export interface HostedSessionExchangeResponse {
  expiresAt: IsoTimestamp;
  sessionToken: string;
}

export interface HostedSessionContextResponse {
  acceptance: GetCounterpartyDealVersionAcceptanceResponse | null;
  draft: DraftDealDetailResponse | null;
  dispute: CreateDealMilestoneDisputeResponse["dispute"] | null;
  hostedSession: PartnerHostedSessionSummary;
  settlementStatement: GetDealVersionSettlementStatementResponse | null;
}

export interface HostedSessionStatusResponse {
  hostedSession: PartnerHostedSessionSummary;
}

export interface HostedDisputeEvidenceLinkResponse {
  file: FileSummary;
}

export type PartnerDraftListResponse = ListDraftDealsResponse;
export type PartnerDraftDetailResponse = DraftDealDetailResponse;
export type PartnerCreateDraftResponse = CreateDraftDealResponse;
export type PartnerCreateVersionSnapshotResponse = CreateDealVersionResponse;
export type PartnerCreateVersionAcceptanceResponse = CreateDealVersionAcceptanceResponse;
export type PartnerCreateFundingTransactionResponse = CreateFundingTransactionResponse;
export type PartnerFundingPreparationResponse = GetFundingPreparationResponse;
export type PartnerSettlementStatementResponse = GetDealVersionSettlementStatementResponse;
export type PartnerCreateMilestoneReviewResponse = CreateDealMilestoneReviewResponse;
export type PartnerCreateMilestoneSettlementRequestResponse =
  CreateDealMilestoneSettlementRequestResponse;
export type PartnerCreateMilestoneDisputeResponse = CreateDealMilestoneDisputeResponse;
export type PartnerListApprovalRequestsResponse = ListApprovalRequestsResponse;
export type PartnerApprovalRequestDetailResponse = ApprovalRequestDetailResponse;
export type PartnerCreateApprovalRequestResponse = CreateApprovalRequestResponse;
export type HostedCounterpartyAcceptanceResponse =
  CreateCounterpartyDealVersionAcceptanceResponse;
export type HostedCounterpartySubmissionPreparationResponse =
  PrepareCounterpartyDealMilestoneSubmissionResponse;
export type HostedCounterpartySubmissionResponse =
  CreateCounterpartyDealMilestoneSubmissionResponse;
export type HostedFileCreateResponse = CreateFileResponse;
