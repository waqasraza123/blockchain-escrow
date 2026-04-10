import { z } from "zod";

import type { EntityId, IsoTimestamp } from "./primitives";

const colorHexSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/u);
const optionalIsoDateTimeSchema = z.string().datetime({ offset: true }).optional();

export const tenantDomainSurfaceSchema = z.enum(["ENTRYPOINT", "HOSTED"]);
export type TenantDomainSurface = z.infer<typeof tenantDomainSurfaceSchema>;

export const tenantDomainStatusSchema = z.enum([
  "PENDING",
  "VERIFIED",
  "ACTIVE",
  "DISABLED"
]);
export type TenantDomainStatus = z.infer<typeof tenantDomainStatusSchema>;

export const billingPlanStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type BillingPlanStatus = z.infer<typeof billingPlanStatusSchema>;

export const billingUsageMetricSchema = z.enum([
  "PARTNER_API_WRITE_REQUEST",
  "PARTNER_WEBHOOK_DELIVERY_ATTEMPT",
  "PARTNER_WEBHOOK_DELIVERY_SUCCESS",
  "PARTNER_HOSTED_SESSION_CREATED",
  "PARTNER_HOSTED_SESSION_COMPLETED"
]);
export type BillingUsageMetric = z.infer<typeof billingUsageMetricSchema>;

export const invoiceStatusSchema = z.enum([
  "DRAFT",
  "FINALIZED",
  "SENT",
  "PAID",
  "DISPUTED",
  "VOID"
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const partnerBrandAssetRoleSchema = z.enum(["LOGO", "FAVICON"]);
export type PartnerBrandAssetRole = z.infer<typeof partnerBrandAssetRoleSchema>;

export const tenantSettingsSchema = z.object({
  accentColorHex: colorHexSchema,
  backgroundColorHex: colorHexSchema,
  displayName: z.string().trim().min(1).max(160),
  faviconAssetId: z.string().trim().min(1).optional().nullable(),
  legalName: z.string().trim().min(1).max(200),
  logoAssetId: z.string().trim().min(1).optional().nullable(),
  primaryColorHex: colorHexSchema,
  privacyPolicyUrl: z.string().url().max(1000),
  supportEmail: z.string().trim().email().max(320),
  supportUrl: z.string().url().max(1000),
  termsOfServiceUrl: z.string().url().max(1000),
  textColorHex: colorHexSchema
});
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;

export const registerPartnerBrandAssetSchema = z.object({
  byteSize: z.number().int().positive(),
  mediaType: z.string().trim().min(1).max(255),
  originalFilename: z.string().trim().min(1).max(255),
  role: partnerBrandAssetRoleSchema,
  sha256Hex: z.string().trim().toLowerCase().regex(/^[a-f0-9]{64}$/u),
  storageKey: z.string().trim().min(1).max(512)
});
export type RegisterPartnerBrandAssetInput = z.infer<
  typeof registerPartnerBrandAssetSchema
>;

export const createTenantDomainSchema = z.object({
  hostname: z.string().trim().min(1).max(255).toLowerCase(),
  surface: tenantDomainSurfaceSchema
});
export type CreateTenantDomainInput = z.infer<typeof createTenantDomainSchema>;

export const tenantDomainParamsSchema = z.object({
  domainId: z.string().trim().min(1)
});
export type TenantDomainParams = z.infer<typeof tenantDomainParamsSchema>;

export const billingPlanParamsSchema = z.object({
  billingPlanId: z.string().trim().min(1)
});
export type BillingPlanParams = z.infer<typeof billingPlanParamsSchema>;

export const billingFeeScheduleParamsSchema = z.object({
  billingFeeScheduleId: z.string().trim().min(1)
});
export type BillingFeeScheduleParams = z.infer<typeof billingFeeScheduleParamsSchema>;

export const invoiceParamsSchema = z.object({
  invoiceId: z.string().trim().min(1)
});
export type InvoiceParams = z.infer<typeof invoiceParamsSchema>;

export const usageSummaryParamsSchema = z.object({
  periodEnd: optionalIsoDateTimeSchema,
  periodStart: optionalIsoDateTimeSchema
});
export type UsageSummaryParams = z.infer<typeof usageSummaryParamsSchema>;

export const createBillingPlanSchema = z.object({
  baseMonthlyFeeMinor: z.string().trim().regex(/^\d+$/u),
  code: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_]+$/u),
  currency: z.literal("USD").default("USD"),
  displayName: z.string().trim().min(1).max(160),
  invoiceDueDays: z.number().int().min(0).max(365)
});
export type CreateBillingPlanInput = z.infer<typeof createBillingPlanSchema>;

export const updateBillingPlanSchema = z.object({
  baseMonthlyFeeMinor: z.string().trim().regex(/^\d+$/u).optional(),
  currency: z.literal("USD").optional(),
  displayName: z.string().trim().min(1).max(160).optional(),
  invoiceDueDays: z.number().int().min(0).max(365).optional(),
  status: billingPlanStatusSchema.optional()
});
export type UpdateBillingPlanInput = z.infer<typeof updateBillingPlanSchema>;

export const createBillingFeeScheduleTierSchema = z.object({
  includedUnits: z.string().trim().regex(/^\d+$/u),
  metric: billingUsageMetricSchema,
  startsAtUnit: z.string().trim().regex(/^\d+$/u),
  unitPriceMinor: z.string().trim().regex(/^\d+$/u),
  upToUnit: z.string().trim().regex(/^\d+$/u).optional().nullable()
});
export type CreateBillingFeeScheduleTierInput = z.infer<
  typeof createBillingFeeScheduleTierSchema
>;

export const createBillingFeeScheduleSchema = z.object({
  effectiveFrom: z.string().datetime({ offset: true }),
  tiers: z.array(createBillingFeeScheduleTierSchema).min(1).max(64)
});
export type CreateBillingFeeScheduleInput = z.infer<
  typeof createBillingFeeScheduleSchema
>;

export const assignTenantBillingPlanSchema = z.object({
  billingFeeScheduleId: z.string().trim().min(1),
  billingPlanId: z.string().trim().min(1),
  effectiveFrom: z.string().datetime({ offset: true })
});
export type AssignTenantBillingPlanInput = z.infer<
  typeof assignTenantBillingPlanSchema
>;

export const invoiceActionSchema = z.object({
  status: invoiceStatusSchema
});
export type InvoiceActionInput = z.infer<typeof invoiceActionSchema>;

export interface PartnerBrandAssetSummary {
  byteSize: number;
  createdAt: IsoTimestamp;
  id: EntityId;
  mediaType: string;
  originalFilename: string;
  partnerAccountId: EntityId;
  role: PartnerBrandAssetRole;
  sha256Hex: string;
  storageKey: string;
  updatedAt: IsoTimestamp;
}

export interface TenantSettingsSummary {
  accentColorHex: string;
  backgroundColorHex: string;
  createdAt: IsoTimestamp;
  displayName: string;
  faviconAssetId: EntityId | null;
  legalName: string;
  logoAssetId: EntityId | null;
  partnerAccountId: EntityId;
  primaryColorHex: string;
  privacyPolicyUrl: string;
  supportEmail: string;
  supportUrl: string;
  termsOfServiceUrl: string;
  textColorHex: string;
  updatedAt: IsoTimestamp;
}

export interface TenantDomainSummary {
  createdAt: IsoTimestamp;
  hostname: string;
  id: EntityId;
  partnerAccountId: EntityId;
  status: TenantDomainStatus;
  surface: TenantDomainSurface;
  updatedAt: IsoTimestamp;
  verifiedAt: IsoTimestamp | null;
}

export interface BillingPlanSummary {
  baseMonthlyFeeMinor: string;
  code: string;
  createdAt: IsoTimestamp;
  currency: "USD";
  displayName: string;
  id: EntityId;
  invoiceDueDays: number;
  status: BillingPlanStatus;
  updatedAt: IsoTimestamp;
}

export interface BillingFeeScheduleTierSummary {
  billingFeeScheduleId: EntityId;
  id: EntityId;
  includedUnits: string;
  metric: BillingUsageMetric;
  startsAtUnit: string;
  unitPriceMinor: string;
  upToUnit: string | null;
}

export interface BillingFeeScheduleSummary {
  billingPlanId: EntityId;
  createdAt: IsoTimestamp;
  effectiveFrom: IsoTimestamp;
  id: EntityId;
  updatedAt: IsoTimestamp;
}

export interface BillingFeeScheduleDetail extends BillingFeeScheduleSummary {
  tiers: BillingFeeScheduleTierSummary[];
}

export interface TenantBillingPlanAssignmentSummary {
  billingFeeScheduleId: EntityId;
  billingPlanId: EntityId;
  createdAt: IsoTimestamp;
  effectiveFrom: IsoTimestamp;
  effectiveTo: IsoTimestamp | null;
  id: EntityId;
  partnerAccountId: EntityId;
}

export interface UsageMetricSummary {
  count: string;
  metric: BillingUsageMetric;
}

export interface UsageSummary {
  metrics: UsageMetricSummary[];
  periodEnd: IsoTimestamp;
  periodStart: IsoTimestamp;
}

export interface InvoiceLineItemSummary {
  amountMinor: string;
  description: string;
  id: EntityId;
  invoiceId: EntityId;
  metric: BillingUsageMetric | null;
  quantity: string;
  unitPriceMinor: string;
}

export interface InvoiceSummary {
  createdAt: IsoTimestamp;
  currency: "USD";
  dueAt: IsoTimestamp;
  id: EntityId;
  partnerAccountId: EntityId;
  periodEnd: IsoTimestamp;
  periodStart: IsoTimestamp;
  status: InvoiceStatus;
  subtotalMinor: string;
  totalMinor: string;
  updatedAt: IsoTimestamp;
}

export interface InvoiceDetail extends InvoiceSummary {
  lineItems: InvoiceLineItemSummary[];
}

export interface TenantBillingOverview {
  activeAssignment: TenantBillingPlanAssignmentSummary | null;
  currentUsage: UsageSummary | null;
  previousUsage: UsageSummary | null;
  recentInvoices: InvoiceSummary[];
}

export interface TenantPublicContext {
  activeDomain: TenantDomainSummary;
  brandAssets: PartnerBrandAssetSummary[];
  partnerAccountId: EntityId;
  partnerSlug: string;
  settings: TenantSettingsSummary;
}

export interface UpsertTenantSettingsResponse {
  settings: TenantSettingsSummary;
}

export interface RegisterPartnerBrandAssetResponse {
  asset: PartnerBrandAssetSummary;
}

export interface CreateTenantDomainResponse {
  domain: TenantDomainSummary;
}

export interface ListTenantDomainsResponse {
  domains: TenantDomainSummary[];
}

export interface CreateBillingPlanResponse {
  billingPlan: BillingPlanSummary;
}

export interface UpdateBillingPlanResponse {
  billingPlan: BillingPlanSummary;
}

export interface ListBillingPlansResponse {
  billingPlans: BillingPlanSummary[];
}

export interface ListBillingFeeSchedulesResponse {
  billingFeeSchedules: BillingFeeScheduleDetail[];
}

export interface CreateBillingFeeScheduleResponse {
  billingFeeSchedule: BillingFeeScheduleDetail;
}

export interface AssignTenantBillingPlanResponse {
  assignment: TenantBillingPlanAssignmentSummary;
}

export interface TenantBillingOverviewResponse {
  billing: TenantBillingOverview;
}

export interface InvoiceDetailResponse {
  invoice: InvoiceDetail;
}

export interface ListInvoicesResponse {
  invoices: InvoiceSummary[];
}

export interface UpdateInvoiceStatusResponse {
  invoice: InvoiceDetail;
}

export interface TenantPublicContextResponse {
  tenant: TenantPublicContext | null;
}
