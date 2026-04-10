CREATE TYPE "PartnerBrandAssetRole" AS ENUM ('LOGO', 'FAVICON');
CREATE TYPE "TenantDomainSurface" AS ENUM ('ENTRYPOINT', 'HOSTED');
CREATE TYPE "TenantDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'DISABLED');
CREATE TYPE "BillingPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "BillingUsageMetric" AS ENUM (
  'PARTNER_API_WRITE_REQUEST',
  'PARTNER_WEBHOOK_DELIVERY_ATTEMPT',
  'PARTNER_WEBHOOK_DELIVERY_SUCCESS',
  'PARTNER_HOSTED_SESSION_CREATED',
  'PARTNER_HOSTED_SESSION_COMPLETED'
);
CREATE TYPE "InvoiceStatus" AS ENUM (
  'DRAFT',
  'FINALIZED',
  'SENT',
  'PAID',
  'DISPUTED',
  'VOID'
);

CREATE TABLE "partner_brand_assets" (
  "id" TEXT NOT NULL,
  "partnerAccountId" TEXT NOT NULL,
  "role" "PartnerBrandAssetRole" NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "byteSize" BIGINT NOT NULL,
  "sha256Hex" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_brand_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_brand_assets_partner_storage_key_uq"
ON "partner_brand_assets"("partnerAccountId", "storageKey");
CREATE INDEX "partner_brand_assets_partner_account_id_idx"
ON "partner_brand_assets"("partnerAccountId");
CREATE INDEX "partner_brand_assets_partner_account_id_role_idx"
ON "partner_brand_assets"("partnerAccountId", "role");

ALTER TABLE "partner_brand_assets"
ADD CONSTRAINT "partner_brand_assets_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_tenant_settings" (
  "partnerAccountId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "supportEmail" TEXT NOT NULL,
  "supportUrl" TEXT NOT NULL,
  "termsOfServiceUrl" TEXT NOT NULL,
  "privacyPolicyUrl" TEXT NOT NULL,
  "logoAssetId" TEXT,
  "faviconAssetId" TEXT,
  "primaryColorHex" TEXT NOT NULL,
  "accentColorHex" TEXT NOT NULL,
  "backgroundColorHex" TEXT NOT NULL,
  "textColorHex" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "partner_tenant_settings_pkey" PRIMARY KEY ("partnerAccountId")
);

CREATE INDEX "partner_tenant_settings_logo_asset_id_idx"
ON "partner_tenant_settings"("logoAssetId");
CREATE INDEX "partner_tenant_settings_favicon_asset_id_idx"
ON "partner_tenant_settings"("faviconAssetId");

ALTER TABLE "partner_tenant_settings"
ADD CONSTRAINT "partner_tenant_settings_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_tenant_settings"
ADD CONSTRAINT "partner_tenant_settings_logoAssetId_fkey"
FOREIGN KEY ("logoAssetId") REFERENCES "partner_brand_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "partner_tenant_settings"
ADD CONSTRAINT "partner_tenant_settings_faviconAssetId_fkey"
FOREIGN KEY ("faviconAssetId") REFERENCES "partner_brand_assets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tenant_domains" (
  "id" TEXT NOT NULL,
  "partnerAccountId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "surface" "TenantDomainSurface" NOT NULL,
  "status" "TenantDomainStatus" NOT NULL,
  "verifiedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_domains_hostname_key" ON "tenant_domains"("hostname");
CREATE INDEX "tenant_domains_partner_account_id_idx"
ON "tenant_domains"("partnerAccountId");
CREATE INDEX "tenant_domains_partner_account_id_surface_idx"
ON "tenant_domains"("partnerAccountId", "surface");
CREATE INDEX "tenant_domains_partner_surface_status_idx"
ON "tenant_domains"("partnerAccountId", "surface", "status");

ALTER TABLE "tenant_domains"
ADD CONSTRAINT "tenant_domains_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "baseMonthlyFeeMinor" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "invoiceDueDays" INTEGER NOT NULL,
  "status" "BillingPlanStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_plans_code_key" ON "billing_plans"("code");
CREATE INDEX "billing_plans_status_idx" ON "billing_plans"("status");

CREATE TABLE "billing_fee_schedules" (
  "id" TEXT NOT NULL,
  "billingPlanId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "billing_fee_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_fee_schedules_plan_effective_from_uq"
ON "billing_fee_schedules"("billingPlanId", "effectiveFrom");
CREATE INDEX "billing_fee_schedules_billing_plan_id_idx"
ON "billing_fee_schedules"("billingPlanId");

ALTER TABLE "billing_fee_schedules"
ADD CONSTRAINT "billing_fee_schedules_billingPlanId_fkey"
FOREIGN KEY ("billingPlanId") REFERENCES "billing_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_fee_schedule_tiers" (
  "id" TEXT NOT NULL,
  "billingFeeScheduleId" TEXT NOT NULL,
  "metric" "BillingUsageMetric" NOT NULL,
  "position" INTEGER NOT NULL,
  "includedUnits" TEXT NOT NULL,
  "startsAtUnit" TEXT NOT NULL,
  "upToUnit" TEXT,
  "unitPriceMinor" TEXT NOT NULL,

  CONSTRAINT "billing_fee_schedule_tiers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_fee_schedule_tiers_schedule_metric_position_uq"
ON "billing_fee_schedule_tiers"("billingFeeScheduleId", "metric", "position");
CREATE INDEX "billing_fee_schedule_tiers_schedule_id_idx"
ON "billing_fee_schedule_tiers"("billingFeeScheduleId");

ALTER TABLE "billing_fee_schedule_tiers"
ADD CONSTRAINT "billing_fee_schedule_tiers_billingFeeScheduleId_fkey"
FOREIGN KEY ("billingFeeScheduleId") REFERENCES "billing_fee_schedules"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_billing_plan_assignments" (
  "id" TEXT NOT NULL,
  "partnerAccountId" TEXT NOT NULL,
  "billingPlanId" TEXT NOT NULL,
  "billingFeeScheduleId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
  "effectiveTo" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tenant_billing_plan_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_billing_assignments_partner_effective_from_uq"
ON "tenant_billing_plan_assignments"("partnerAccountId", "effectiveFrom");
CREATE INDEX "tenant_billing_assignments_partner_idx"
ON "tenant_billing_plan_assignments"("partnerAccountId");
CREATE INDEX "tenant_billing_assignments_plan_idx"
ON "tenant_billing_plan_assignments"("billingPlanId");
CREATE INDEX "tenant_billing_assignments_schedule_idx"
ON "tenant_billing_plan_assignments"("billingFeeScheduleId");

ALTER TABLE "tenant_billing_plan_assignments"
ADD CONSTRAINT "tenant_billing_plan_assignments_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_billing_plan_assignments"
ADD CONSTRAINT "tenant_billing_plan_assignments_billingPlanId_fkey"
FOREIGN KEY ("billingPlanId") REFERENCES "billing_plans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_billing_plan_assignments"
ADD CONSTRAINT "tenant_billing_plan_assignments_billingFeeScheduleId_fkey"
FOREIGN KEY ("billingFeeScheduleId") REFERENCES "billing_fee_schedules"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "billing_usage_meter_events" (
  "id" TEXT NOT NULL,
  "partnerAccountId" TEXT NOT NULL,
  "partnerOrganizationLinkId" TEXT,
  "organizationId" TEXT,
  "metric" "BillingUsageMetric" NOT NULL,
  "quantity" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "externalKey" TEXT,
  "metadata" JSONB,

  CONSTRAINT "billing_usage_meter_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_usage_meter_events_externalKey_key"
ON "billing_usage_meter_events"("externalKey");
CREATE INDEX "billing_usage_meter_events_partner_account_id_idx"
ON "billing_usage_meter_events"("partnerAccountId");
CREATE INDEX "billing_usage_meter_events_partner_org_link_id_idx"
ON "billing_usage_meter_events"("partnerOrganizationLinkId");
CREATE INDEX "billing_usage_meter_events_organization_id_idx"
ON "billing_usage_meter_events"("organizationId");
CREATE INDEX "billing_usage_meter_events_partner_occurred_at_idx"
ON "billing_usage_meter_events"("partnerAccountId", "occurredAt");
CREATE INDEX "billing_usage_meter_events_metric_occurred_at_idx"
ON "billing_usage_meter_events"("metric", "occurredAt");

ALTER TABLE "billing_usage_meter_events"
ADD CONSTRAINT "billing_usage_meter_events_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_usage_meter_events"
ADD CONSTRAINT "billing_usage_meter_events_partnerOrganizationLinkId_fkey"
FOREIGN KEY ("partnerOrganizationLinkId") REFERENCES "partner_organization_links"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_usage_meter_events"
ADD CONSTRAINT "billing_usage_meter_events_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "tenant_invoices" (
  "id" TEXT NOT NULL,
  "partnerAccountId" TEXT NOT NULL,
  "billingPlanId" TEXT NOT NULL,
  "billingFeeScheduleId" TEXT NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "periodEnd" TIMESTAMPTZ(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "subtotalMinor" TEXT NOT NULL,
  "totalMinor" TEXT NOT NULL,
  "dueAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "InvoiceStatus" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tenant_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_invoices_partner_period_uq"
ON "tenant_invoices"("partnerAccountId", "periodStart", "periodEnd");
CREATE INDEX "tenant_invoices_partner_account_id_idx"
ON "tenant_invoices"("partnerAccountId");
CREATE INDEX "tenant_invoices_status_idx"
ON "tenant_invoices"("status");
CREATE INDEX "tenant_invoices_period_idx"
ON "tenant_invoices"("periodStart", "periodEnd");

ALTER TABLE "tenant_invoices"
ADD CONSTRAINT "tenant_invoices_partnerAccountId_fkey"
FOREIGN KEY ("partnerAccountId") REFERENCES "partner_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_invoices"
ADD CONSTRAINT "tenant_invoices_billingPlanId_fkey"
FOREIGN KEY ("billingPlanId") REFERENCES "billing_plans"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_invoices"
ADD CONSTRAINT "tenant_invoices_billingFeeScheduleId_fkey"
FOREIGN KEY ("billingFeeScheduleId") REFERENCES "billing_fee_schedules"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tenant_invoice_line_items" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metric" "BillingUsageMetric",
  "quantity" TEXT NOT NULL,
  "unitPriceMinor" TEXT NOT NULL,
  "amountMinor" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "tenant_invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenant_invoice_line_items_invoice_id_idx"
ON "tenant_invoice_line_items"("invoiceId");

ALTER TABLE "tenant_invoice_line_items"
ADD CONSTRAINT "tenant_invoice_line_items_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "tenant_invoices"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
