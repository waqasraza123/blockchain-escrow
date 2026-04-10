CREATE TYPE "PartnerAccountStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "PartnerOrganizationLinkStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "PartnerApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "PartnerHostedSessionType" AS ENUM (
  'COUNTERPARTY_VERSION_ACCEPTANCE',
  'COUNTERPARTY_MILESTONE_SUBMISSION',
  'DISPUTE_EVIDENCE_UPLOAD',
  'DEAL_STATUS_REVIEW'
);
CREATE TYPE "PartnerHostedSessionStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED'
);
CREATE TYPE "PartnerWebhookSubscriptionStatus" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'DISABLED'
);
CREATE TYPE "PartnerWebhookDeliveryStatus" AS ENUM (
  'PENDING',
  'DELIVERING',
  'SUCCEEDED',
  'FAILED'
);
CREATE TYPE "PartnerResourceType" AS ENUM (
  'DRAFT_DEAL',
  'DEAL_VERSION',
  'APPROVAL_REQUEST',
  'PARTNER_HOSTED_SESSION'
);

ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_ACCOUNT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_API_KEY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_API_KEY_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_HOSTED_SESSION_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_HOSTED_SESSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_HOSTED_SESSION_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_ORGANIZATION_LINK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_WEBHOOK_DELIVERY_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_WEBHOOK_DELIVERY_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_WEBHOOK_SUBSCRIPTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PARTNER_WEBHOOK_SUBSCRIPTION_UPDATED';

ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_ACCOUNT';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_API_KEY';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_HOSTED_SESSION';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_IDEMPOTENCY_KEY';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_ORGANIZATION_LINK';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_RESOURCE_REFERENCE';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_WEBHOOK_DELIVERY';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_WEBHOOK_DELIVERY_ATTEMPT';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_WEBHOOK_EVENT';
ALTER TYPE "AuditEntityType" ADD VALUE 'PARTNER_WEBHOOK_SUBSCRIPTION';

CREATE TABLE "partner_accounts" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "PartnerAccountStatus" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_accounts_slug_key" ON "partner_accounts"("slug");
CREATE INDEX "partner_accounts_status_idx" ON "partner_accounts"("status");
CREATE INDEX "partner_accounts_created_at_idx" ON "partner_accounts"("createdAt");

CREATE TABLE "partner_organization_links" (
  "id" TEXT NOT NULL,
  "partnerAccountId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actingUserId" TEXT NOT NULL,
  "actingWalletId" TEXT NOT NULL,
  "externalReference" TEXT,
  "status" "PartnerOrganizationLinkStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_organization_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_org_links_partner_org_key"
ON "partner_organization_links"("partnerAccountId", "organizationId");
CREATE INDEX "partner_org_links_organization_id_idx"
ON "partner_organization_links"("organizationId");
CREATE INDEX "partner_org_links_partner_account_id_idx"
ON "partner_organization_links"("partnerAccountId");
CREATE INDEX "partner_org_links_status_idx"
ON "partner_organization_links"("status");

ALTER TABLE "partner_organization_links"
ADD CONSTRAINT "partner_organization_links_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_api_keys" (
  "id" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "expiresAt" TIMESTAMPTZ(3),
  "lastUsedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "status" "PartnerApiKeyStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_api_keys_keyPrefix_key" ON "partner_api_keys"("keyPrefix");
CREATE INDEX "partner_api_keys_link_id_idx" ON "partner_api_keys"("partnerOrganizationLinkId");
CREATE INDEX "partner_api_keys_status_idx" ON "partner_api_keys"("status");
CREATE INDEX "partner_api_keys_last_used_at_idx" ON "partner_api_keys"("lastUsedAt");

ALTER TABLE "partner_api_keys"
ADD CONSTRAINT "partner_api_keys_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_idempotency_keys" (
  "id" TEXT NOT NULL,
  "partnerApiKeyId" TEXT NOT NULL,
  "requestMethod" TEXT NOT NULL,
  "requestPath" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseStatusCode" INTEGER NOT NULL,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_idempotency_scope_key"
ON "partner_idempotency_keys"("partnerApiKeyId", "requestMethod", "requestPath", "requestKey");
CREATE INDEX "partner_idempotency_created_at_idx" ON "partner_idempotency_keys"("createdAt");

ALTER TABLE "partner_idempotency_keys"
ADD CONSTRAINT "partner_idempotency_keys_partnerApiKeyId_fkey"
FOREIGN KEY ("partnerApiKeyId") REFERENCES "partner_api_keys"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_resource_references" (
  "id" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT NOT NULL,
  "resourceType" "PartnerResourceType" NOT NULL,
  "resourceId" TEXT NOT NULL,
  "partnerReferenceId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_resource_references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_resource_refs_link_ref_key"
ON "partner_resource_references"("partnerOrganizationLinkId", "partnerReferenceId");
CREATE UNIQUE INDEX "partner_resource_refs_link_resource_key"
ON "partner_resource_references"("partnerOrganizationLinkId", "resourceType", "resourceId");
CREATE INDEX "partner_resource_refs_resource_idx"
ON "partner_resource_references"("resourceType", "resourceId");

ALTER TABLE "partner_resource_references"
ADD CONSTRAINT "partner_resource_references_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_hosted_sessions" (
  "id" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT NOT NULL,
  "partnerApiKeyId" TEXT,
  "type" "PartnerHostedSessionType" NOT NULL,
  "status" "PartnerHostedSessionStatus" NOT NULL,
  "draftDealId" TEXT,
  "dealVersionId" TEXT,
  "dealVersionMilestoneId" TEXT,
  "dealMilestoneDisputeId" TEXT,
  "partnerReferenceId" TEXT,
  "launchTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "activatedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_hosted_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_hosted_sessions_launchTokenHash_key"
ON "partner_hosted_sessions"("launchTokenHash");
CREATE INDEX "partner_hosted_sessions_link_id_idx"
ON "partner_hosted_sessions"("partnerOrganizationLinkId");
CREATE INDEX "partner_hosted_sessions_status_idx"
ON "partner_hosted_sessions"("status");
CREATE INDEX "partner_hosted_sessions_expires_at_idx"
ON "partner_hosted_sessions"("expiresAt");

ALTER TABLE "partner_hosted_sessions"
ADD CONSTRAINT "partner_hosted_sessions_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_hosted_sessions"
ADD CONSTRAINT "partner_hosted_sessions_partnerApiKeyId_fkey"
FOREIGN KEY ("partnerApiKeyId") REFERENCES "partner_api_keys"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "partner_webhook_subscriptions" (
  "id" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "endpointUrl" TEXT NOT NULL,
  "eventTypes" TEXT[] NOT NULL,
  "secretHash" TEXT NOT NULL,
  "status" "PartnerWebhookSubscriptionStatus" NOT NULL,
  "lastDeliveryAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_webhook_subs_link_id_idx"
ON "partner_webhook_subscriptions"("partnerOrganizationLinkId");
CREATE INDEX "partner_webhook_subs_status_idx"
ON "partner_webhook_subscriptions"("status");

ALTER TABLE "partner_webhook_subscriptions"
ADD CONSTRAINT "partner_webhook_subscriptions_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_webhook_events" (
  "id" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "draftDealId" TEXT,
  "hostedSessionId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_webhook_events_link_id_idx"
ON "partner_webhook_events"("partnerOrganizationLinkId");
CREATE INDEX "partner_webhook_events_organization_id_idx"
ON "partner_webhook_events"("organizationId");
CREATE INDEX "partner_webhook_events_event_type_idx"
ON "partner_webhook_events"("eventType");

ALTER TABLE "partner_webhook_events"
ADD CONSTRAINT "partner_webhook_events_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_webhook_events"
ADD CONSTRAINT "partner_webhook_events_hostedSessionId_fkey"
FOREIGN KEY ("hostedSessionId") REFERENCES "partner_hosted_sessions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "partner_webhook_deliveries" (
  "id" TEXT NOT NULL,
  "partnerWebhookEventId" TEXT NOT NULL,
  "partnerWebhookSubscriptionId" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT NOT NULL,
  "status" "PartnerWebhookDeliveryStatus" NOT NULL,
  "errorMessage" TEXT,
  "nextAttemptAt" TIMESTAMPTZ(3),
  "lastAttemptAt" TIMESTAMPTZ(3),
  "deliveredAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_webhook_deliveries_event_id_idx"
ON "partner_webhook_deliveries"("partnerWebhookEventId");
CREATE INDEX "partner_webhook_deliveries_sub_id_idx"
ON "partner_webhook_deliveries"("partnerWebhookSubscriptionId");
CREATE INDEX "partner_webhook_deliveries_link_id_idx"
ON "partner_webhook_deliveries"("partnerOrganizationLinkId");
CREATE INDEX "partner_webhook_deliveries_status_attempt_idx"
ON "partner_webhook_deliveries"("status", "nextAttemptAt");

ALTER TABLE "partner_webhook_deliveries"
ADD CONSTRAINT "partner_webhook_deliveries_partnerWebhookEventId_fkey"
FOREIGN KEY ("partnerWebhookEventId") REFERENCES "partner_webhook_events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_webhook_deliveries"
ADD CONSTRAINT "partner_webhook_deliveries_partnerWebhookSubscriptionId_fkey"
FOREIGN KEY ("partnerWebhookSubscriptionId") REFERENCES "partner_webhook_subscriptions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_webhook_deliveries"
ADD CONSTRAINT "partner_webhook_deliveries_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_webhook_delivery_attempts" (
  "id" TEXT NOT NULL,
  "partnerWebhookDeliveryId" TEXT NOT NULL,
  "attemptedAt" TIMESTAMPTZ(3) NOT NULL,
  "finishedAt" TIMESTAMPTZ(3),
  "durationMs" INTEGER,
  "responseStatusCode" INTEGER,
  "errorMessage" TEXT,
  "nextRetryAt" TIMESTAMPTZ(3),

  CONSTRAINT "partner_webhook_delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "partner_webhook_attempts_delivery_id_idx"
ON "partner_webhook_delivery_attempts"("partnerWebhookDeliveryId");
CREATE INDEX "partner_webhook_attempts_attempted_at_idx"
ON "partner_webhook_delivery_attempts"("attemptedAt");

ALTER TABLE "partner_webhook_delivery_attempts"
ADD CONSTRAINT "partner_webhook_delivery_attempts_partnerWebhookDeliveryId_fkey"
FOREIGN KEY ("partnerWebhookDeliveryId") REFERENCES "partner_webhook_deliveries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
