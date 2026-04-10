import { Prisma, PrismaClient } from "@prisma/client";

import { createRelease10Repositories } from "./prisma-release10-repositories";
import type {
  BillingFeeScheduleRecord,
  BillingFeeScheduleTierRecord,
  BillingPlanRecord,
  BillingUsageMeterEventRecord,
  PartnerBrandAssetRecord,
  PartnerTenantSettingsRecord,
  TenantBillingPlanAssignmentRecord,
  TenantDomainRecord,
  TenantInvoiceLineItemRecord,
  TenantInvoiceRecord
} from "./records";
import type {
  BillingFeeScheduleRepository,
  BillingFeeScheduleTierRepository,
  BillingPlanRepository,
  BillingUsageMeterEventRepository,
  PartnerBrandAssetRepository,
  PartnerTenantSettingsRepository,
  Release11Repositories,
  TenantBillingPlanAssignmentRepository,
  TenantDomainRepository,
  TenantInvoiceLineItemRepository,
  TenantInvoiceRepository
} from "./repositories";

type DatabaseClient = PrismaClient;

function toIsoTimestamp(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toRequiredIsoTimestamp(value: Date): string {
  return value.toISOString();
}

function toDate(value: string): Date {
  return new Date(value);
}

function toNumber(value: bigint): number {
  return Number(value);
}

function toPrismaJsonInput(
  value: Prisma.InputJsonValue | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

function mapPartnerBrandAssetRecord(record: {
  byteSize: bigint;
  createdAt: Date;
  id: string;
  mediaType: string;
  originalFilename: string;
  partnerAccountId: string;
  role: PartnerBrandAssetRecord["role"];
  sha256Hex: string;
  storageKey: string;
  updatedAt: Date;
}): PartnerBrandAssetRecord {
  return {
    byteSize: toNumber(record.byteSize),
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    id: record.id,
    mediaType: record.mediaType,
    originalFilename: record.originalFilename,
    partnerAccountId: record.partnerAccountId,
    role: record.role,
    sha256Hex: record.sha256Hex,
    storageKey: record.storageKey,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapPartnerTenantSettingsRecord(record: {
  accentColorHex: string;
  backgroundColorHex: string;
  createdAt: Date;
  displayName: string;
  faviconAssetId: string | null;
  legalName: string;
  logoAssetId: string | null;
  partnerAccountId: string;
  primaryColorHex: string;
  privacyPolicyUrl: string;
  supportEmail: string;
  supportUrl: string;
  termsOfServiceUrl: string;
  textColorHex: string;
  updatedAt: Date;
}): PartnerTenantSettingsRecord {
  return {
    accentColorHex: record.accentColorHex,
    backgroundColorHex: record.backgroundColorHex,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    displayName: record.displayName,
    faviconAssetId: record.faviconAssetId,
    legalName: record.legalName,
    logoAssetId: record.logoAssetId,
    partnerAccountId: record.partnerAccountId,
    primaryColorHex: record.primaryColorHex,
    privacyPolicyUrl: record.privacyPolicyUrl,
    supportEmail: record.supportEmail,
    supportUrl: record.supportUrl,
    termsOfServiceUrl: record.termsOfServiceUrl,
    textColorHex: record.textColorHex,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapTenantDomainRecord(record: {
  createdAt: Date;
  hostname: string;
  id: string;
  partnerAccountId: string;
  status: TenantDomainRecord["status"];
  surface: TenantDomainRecord["surface"];
  updatedAt: Date;
  verifiedAt: Date | null;
}): TenantDomainRecord {
  return {
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    hostname: record.hostname,
    id: record.id,
    partnerAccountId: record.partnerAccountId,
    status: record.status,
    surface: record.surface,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt),
    verifiedAt: toIsoTimestamp(record.verifiedAt)
  };
}

function mapBillingPlanRecord(record: {
  baseMonthlyFeeMinor: string;
  code: string;
  createdAt: Date;
  currency: string;
  displayName: string;
  id: string;
  invoiceDueDays: number;
  status: BillingPlanRecord["status"];
  updatedAt: Date;
}): BillingPlanRecord {
  return {
    baseMonthlyFeeMinor: record.baseMonthlyFeeMinor,
    code: record.code,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    currency: record.currency as BillingPlanRecord["currency"],
    displayName: record.displayName,
    id: record.id,
    invoiceDueDays: record.invoiceDueDays,
    status: record.status,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapBillingFeeScheduleRecord(record: {
  billingPlanId: string;
  createdAt: Date;
  effectiveFrom: Date;
  id: string;
  updatedAt: Date;
}): BillingFeeScheduleRecord {
  return {
    billingPlanId: record.billingPlanId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    effectiveFrom: toRequiredIsoTimestamp(record.effectiveFrom),
    id: record.id,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapBillingFeeScheduleTierRecord(record: {
  billingFeeScheduleId: string;
  id: string;
  includedUnits: string;
  metric: BillingFeeScheduleTierRecord["metric"];
  position: number;
  startsAtUnit: string;
  unitPriceMinor: string;
  upToUnit: string | null;
}): BillingFeeScheduleTierRecord {
  return {
    billingFeeScheduleId: record.billingFeeScheduleId,
    id: record.id,
    includedUnits: record.includedUnits,
    metric: record.metric,
    position: record.position,
    startsAtUnit: record.startsAtUnit,
    unitPriceMinor: record.unitPriceMinor,
    upToUnit: record.upToUnit
  };
}

function mapTenantBillingPlanAssignmentRecord(record: {
  billingFeeScheduleId: string;
  billingPlanId: string;
  createdAt: Date;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  id: string;
  partnerAccountId: string;
}): TenantBillingPlanAssignmentRecord {
  return {
    billingFeeScheduleId: record.billingFeeScheduleId,
    billingPlanId: record.billingPlanId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    effectiveFrom: toRequiredIsoTimestamp(record.effectiveFrom),
    effectiveTo: toIsoTimestamp(record.effectiveTo),
    id: record.id,
    partnerAccountId: record.partnerAccountId
  };
}

function mapBillingUsageMeterEventRecord(record: {
  externalKey: string | null;
  id: string;
  metadata: Prisma.JsonValue | null;
  metric: BillingUsageMeterEventRecord["metric"];
  occurredAt: Date;
  organizationId: string | null;
  partnerAccountId: string;
  partnerOrganizationLinkId: string | null;
  quantity: string;
}): BillingUsageMeterEventRecord {
  return {
    externalKey: record.externalKey,
    id: record.id,
    metadata: (record.metadata ?? null) as BillingUsageMeterEventRecord["metadata"],
    metric: record.metric,
    occurredAt: toRequiredIsoTimestamp(record.occurredAt),
    organizationId: record.organizationId,
    partnerAccountId: record.partnerAccountId,
    partnerOrganizationLinkId: record.partnerOrganizationLinkId,
    quantity: record.quantity
  };
}

function mapTenantInvoiceRecord(record: {
  billingFeeScheduleId: string;
  billingPlanId: string;
  createdAt: Date;
  currency: string;
  dueAt: Date;
  id: string;
  partnerAccountId: string;
  periodEnd: Date;
  periodStart: Date;
  status: TenantInvoiceRecord["status"];
  subtotalMinor: string;
  totalMinor: string;
  updatedAt: Date;
}): TenantInvoiceRecord {
  return {
    billingFeeScheduleId: record.billingFeeScheduleId,
    billingPlanId: record.billingPlanId,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    currency: record.currency as TenantInvoiceRecord["currency"],
    dueAt: toRequiredIsoTimestamp(record.dueAt),
    id: record.id,
    partnerAccountId: record.partnerAccountId,
    periodEnd: toRequiredIsoTimestamp(record.periodEnd),
    periodStart: toRequiredIsoTimestamp(record.periodStart),
    status: record.status,
    subtotalMinor: record.subtotalMinor,
    totalMinor: record.totalMinor,
    updatedAt: toRequiredIsoTimestamp(record.updatedAt)
  };
}

function mapTenantInvoiceLineItemRecord(record: {
  amountMinor: string;
  createdAt: Date;
  description: string;
  id: string;
  invoiceId: string;
  metric: TenantInvoiceLineItemRecord["metric"];
  quantity: string;
  unitPriceMinor: string;
}): TenantInvoiceLineItemRecord {
  return {
    amountMinor: record.amountMinor,
    createdAt: toRequiredIsoTimestamp(record.createdAt),
    description: record.description,
    id: record.id,
    invoiceId: record.invoiceId,
    metric: record.metric,
    quantity: record.quantity,
    unitPriceMinor: record.unitPriceMinor
  };
}

export function createRelease11Repositories(prisma: DatabaseClient): Release11Repositories {
  const release10 = createRelease10Repositories(prisma);

  const partnerBrandAssets: PartnerBrandAssetRepository = {
    create: async (record) =>
      mapPartnerBrandAssetRecord(
        await prisma.partnerBrandAsset.create({
          data: {
            byteSize: BigInt(record.byteSize),
            createdAt: toDate(record.createdAt),
            id: record.id,
            mediaType: record.mediaType,
            originalFilename: record.originalFilename,
            partnerAccountId: record.partnerAccountId,
            role: record.role,
            sha256Hex: record.sha256Hex,
            storageKey: record.storageKey,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.partnerBrandAsset.findUnique({ where: { id } });
      return record ? mapPartnerBrandAssetRecord(record) : null;
    },
    listByPartnerAccountId: async (partnerAccountId) =>
      (
        await prisma.partnerBrandAsset.findMany({
          orderBy: { createdAt: "asc" },
          where: { partnerAccountId }
        })
      ).map(mapPartnerBrandAssetRecord)
  };

  const tenantSettings: PartnerTenantSettingsRepository = {
    findByPartnerAccountId: async (partnerAccountId) => {
      const record = await prisma.partnerTenantSettings.findUnique({
        where: { partnerAccountId }
      });
      return record ? mapPartnerTenantSettingsRecord(record) : null;
    },
    upsert: async (record) =>
      mapPartnerTenantSettingsRecord(
        await prisma.partnerTenantSettings.upsert({
          create: {
            accentColorHex: record.accentColorHex,
            backgroundColorHex: record.backgroundColorHex,
            createdAt: toDate(record.createdAt),
            displayName: record.displayName,
            faviconAssetId: record.faviconAssetId,
            legalName: record.legalName,
            logoAssetId: record.logoAssetId,
            partnerAccountId: record.partnerAccountId,
            primaryColorHex: record.primaryColorHex,
            privacyPolicyUrl: record.privacyPolicyUrl,
            supportEmail: record.supportEmail,
            supportUrl: record.supportUrl,
            termsOfServiceUrl: record.termsOfServiceUrl,
            textColorHex: record.textColorHex,
            updatedAt: toDate(record.updatedAt)
          },
          update: {
            accentColorHex: record.accentColorHex,
            backgroundColorHex: record.backgroundColorHex,
            displayName: record.displayName,
            faviconAssetId: record.faviconAssetId,
            legalName: record.legalName,
            logoAssetId: record.logoAssetId,
            primaryColorHex: record.primaryColorHex,
            privacyPolicyUrl: record.privacyPolicyUrl,
            supportEmail: record.supportEmail,
            supportUrl: record.supportUrl,
            termsOfServiceUrl: record.termsOfServiceUrl,
            textColorHex: record.textColorHex,
            updatedAt: toDate(record.updatedAt)
          },
          where: { partnerAccountId: record.partnerAccountId }
        })
      )
  };

  const tenantDomains: TenantDomainRepository = {
    create: async (record) =>
      mapTenantDomainRecord(
        await prisma.tenantDomain.create({
          data: {
            createdAt: toDate(record.createdAt),
            hostname: record.hostname,
            id: record.id,
            partnerAccountId: record.partnerAccountId,
            status: record.status,
            surface: record.surface,
            updatedAt: toDate(record.updatedAt),
            verifiedAt: record.verifiedAt ? toDate(record.verifiedAt) : null
          }
        })
      ),
    findActiveByHostname: async (hostname) => {
      const record = await prisma.tenantDomain.findFirst({
        where: {
          hostname: hostname.toLowerCase(),
          status: "ACTIVE"
        }
      });
      return record ? mapTenantDomainRecord(record) : null;
    },
    findByHostname: async (hostname) => {
      const record = await prisma.tenantDomain.findUnique({
        where: { hostname: hostname.toLowerCase() }
      });
      return record ? mapTenantDomainRecord(record) : null;
    },
    findById: async (id) => {
      const record = await prisma.tenantDomain.findUnique({ where: { id } });
      return record ? mapTenantDomainRecord(record) : null;
    },
    listByPartnerAccountId: async (partnerAccountId) =>
      (
        await prisma.tenantDomain.findMany({
          orderBy: [{ surface: "asc" }, { createdAt: "asc" }],
          where: { partnerAccountId }
        })
      ).map(mapTenantDomainRecord),
    update: async (id, updates) =>
      mapTenantDomainRecord(
        await prisma.tenantDomain.update({
          data: {
            ...(updates.hostname ? { hostname: updates.hostname.toLowerCase() } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.surface ? { surface: updates.surface } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {}),
            ...(updates.verifiedAt !== undefined
              ? { verifiedAt: updates.verifiedAt ? toDate(updates.verifiedAt) : null }
              : {})
          },
          where: { id }
        })
      )
  };

  const billingPlans: BillingPlanRepository = {
    create: async (record) =>
      mapBillingPlanRecord(
        await prisma.billingPlan.create({
          data: {
            baseMonthlyFeeMinor: record.baseMonthlyFeeMinor,
            code: record.code,
            createdAt: toDate(record.createdAt),
            currency: record.currency,
            displayName: record.displayName,
            id: record.id,
            invoiceDueDays: record.invoiceDueDays,
            status: record.status,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findByCode: async (code) => {
      const record = await prisma.billingPlan.findUnique({ where: { code } });
      return record ? mapBillingPlanRecord(record) : null;
    },
    findById: async (id) => {
      const record = await prisma.billingPlan.findUnique({ where: { id } });
      return record ? mapBillingPlanRecord(record) : null;
    },
    listAll: async () =>
      (await prisma.billingPlan.findMany({ orderBy: { createdAt: "asc" } })).map(
        mapBillingPlanRecord
      ),
    update: async (id, updates) =>
      mapBillingPlanRecord(
        await prisma.billingPlan.update({
          data: {
            ...(updates.baseMonthlyFeeMinor
              ? { baseMonthlyFeeMinor: updates.baseMonthlyFeeMinor }
              : {}),
            ...(updates.currency ? { currency: updates.currency } : {}),
            ...(updates.displayName ? { displayName: updates.displayName } : {}),
            ...(updates.invoiceDueDays !== undefined
              ? { invoiceDueDays: updates.invoiceDueDays }
              : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {})
          },
          where: { id }
        })
      )
  };

  const billingFeeSchedules: BillingFeeScheduleRepository = {
    create: async (record) =>
      mapBillingFeeScheduleRecord(
        await prisma.billingFeeSchedule.create({
          data: {
            billingPlanId: record.billingPlanId,
            createdAt: toDate(record.createdAt),
            effectiveFrom: toDate(record.effectiveFrom),
            id: record.id,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.billingFeeSchedule.findUnique({ where: { id } });
      return record ? mapBillingFeeScheduleRecord(record) : null;
    },
    listByBillingPlanId: async (billingPlanId) =>
      (
        await prisma.billingFeeSchedule.findMany({
          orderBy: { effectiveFrom: "desc" },
          where: { billingPlanId }
        })
      ).map(mapBillingFeeScheduleRecord)
  };

  const billingFeeScheduleTiers: BillingFeeScheduleTierRepository = {
    create: async (record) =>
      mapBillingFeeScheduleTierRecord(
        await prisma.billingFeeScheduleTier.create({
          data: {
            billingFeeScheduleId: record.billingFeeScheduleId,
            id: record.id,
            includedUnits: record.includedUnits,
            metric: record.metric,
            position: record.position,
            startsAtUnit: record.startsAtUnit,
            unitPriceMinor: record.unitPriceMinor,
            upToUnit: record.upToUnit
          }
        })
      ),
    listByBillingFeeScheduleId: async (billingFeeScheduleId) =>
      (
        await prisma.billingFeeScheduleTier.findMany({
          orderBy: [{ metric: "asc" }, { position: "asc" }],
          where: { billingFeeScheduleId }
        })
      ).map(mapBillingFeeScheduleTierRecord)
  };

  const tenantBillingPlanAssignments: TenantBillingPlanAssignmentRepository = {
    create: async (record) =>
      mapTenantBillingPlanAssignmentRecord(
        await prisma.tenantBillingPlanAssignment.create({
          data: {
            billingFeeScheduleId: record.billingFeeScheduleId,
            billingPlanId: record.billingPlanId,
            createdAt: toDate(record.createdAt),
            effectiveFrom: toDate(record.effectiveFrom),
            effectiveTo: record.effectiveTo ? toDate(record.effectiveTo) : null,
            id: record.id,
            partnerAccountId: record.partnerAccountId
          }
        })
      ),
    findActiveByPartnerAccountIdAt: async (input) => {
      const at = toDate(input.at);
      const record = await prisma.tenantBillingPlanAssignment.findFirst({
        orderBy: { effectiveFrom: "desc" },
        where: {
          partnerAccountId: input.partnerAccountId,
          effectiveFrom: { lte: at },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }]
        }
      });
      return record ? mapTenantBillingPlanAssignmentRecord(record) : null;
    },
    listByPartnerAccountId: async (partnerAccountId) =>
      (
        await prisma.tenantBillingPlanAssignment.findMany({
          orderBy: { effectiveFrom: "desc" },
          where: { partnerAccountId }
        })
      ).map(mapTenantBillingPlanAssignmentRecord),
    update: async (id, updates) =>
      mapTenantBillingPlanAssignmentRecord(
        await prisma.tenantBillingPlanAssignment.update({
          data: {
            ...(updates.billingFeeScheduleId
              ? { billingFeeScheduleId: updates.billingFeeScheduleId }
              : {}),
            ...(updates.billingPlanId ? { billingPlanId: updates.billingPlanId } : {}),
            ...(updates.effectiveFrom
              ? { effectiveFrom: toDate(updates.effectiveFrom) }
              : {}),
            ...(updates.effectiveTo !== undefined
              ? { effectiveTo: updates.effectiveTo ? toDate(updates.effectiveTo) : null }
              : {})
          },
          where: { id }
        })
      )
  };

  const usageMeterEvents: BillingUsageMeterEventRepository = {
    create: async (record) =>
      mapBillingUsageMeterEventRecord(
        await prisma.billingUsageMeterEvent.create({
          data: {
            externalKey: record.externalKey,
            id: record.id,
            metadata: toPrismaJsonInput(record.metadata),
            metric: record.metric,
            occurredAt: toDate(record.occurredAt),
            organizationId: record.organizationId,
            partnerAccountId: record.partnerAccountId,
            partnerOrganizationLinkId: record.partnerOrganizationLinkId,
            quantity: record.quantity
          }
        })
      ),
    findByExternalKey: async (externalKey) => {
      const record = await prisma.billingUsageMeterEvent.findUnique({
        where: { externalKey }
      });
      return record ? mapBillingUsageMeterEventRecord(record) : null;
    },
    listByPartnerAccountIdWithin: async (input) =>
      (
        await prisma.billingUsageMeterEvent.findMany({
          orderBy: { occurredAt: "asc" },
          where: {
            occurredAt: {
              gte: toDate(input.occurredAtGte),
              lt: toDate(input.occurredAtLt)
            },
            partnerAccountId: input.partnerAccountId
          }
        })
      ).map(mapBillingUsageMeterEventRecord)
  };

  const invoices: TenantInvoiceRepository = {
    create: async (record) =>
      mapTenantInvoiceRecord(
        await prisma.tenantInvoice.create({
          data: {
            billingFeeScheduleId: record.billingFeeScheduleId,
            billingPlanId: record.billingPlanId,
            createdAt: toDate(record.createdAt),
            currency: record.currency,
            dueAt: toDate(record.dueAt),
            id: record.id,
            partnerAccountId: record.partnerAccountId,
            periodEnd: toDate(record.periodEnd),
            periodStart: toDate(record.periodStart),
            status: record.status,
            subtotalMinor: record.subtotalMinor,
            totalMinor: record.totalMinor,
            updatedAt: toDate(record.updatedAt)
          }
        })
      ),
    findById: async (id) => {
      const record = await prisma.tenantInvoice.findUnique({ where: { id } });
      return record ? mapTenantInvoiceRecord(record) : null;
    },
    findByPartnerAccountIdAndPeriod: async (input) => {
      const record = await prisma.tenantInvoice.findFirst({
        where: {
          partnerAccountId: input.partnerAccountId,
          periodEnd: toDate(input.periodEnd),
          periodStart: toDate(input.periodStart)
        }
      });
      return record ? mapTenantInvoiceRecord(record) : null;
    },
    listAll: async () =>
      (await prisma.tenantInvoice.findMany({ orderBy: { createdAt: "desc" } })).map(
        mapTenantInvoiceRecord
      ),
    listByPartnerAccountId: async (partnerAccountId) =>
      (
        await prisma.tenantInvoice.findMany({
          orderBy: { periodStart: "desc" },
          where: { partnerAccountId }
        })
      ).map(mapTenantInvoiceRecord),
    update: async (id, updates) =>
      mapTenantInvoiceRecord(
        await prisma.tenantInvoice.update({
          data: {
            ...(updates.currency ? { currency: updates.currency } : {}),
            ...(updates.dueAt ? { dueAt: toDate(updates.dueAt) } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.subtotalMinor ? { subtotalMinor: updates.subtotalMinor } : {}),
            ...(updates.totalMinor ? { totalMinor: updates.totalMinor } : {}),
            ...(updates.updatedAt ? { updatedAt: toDate(updates.updatedAt) } : {})
          },
          where: { id }
        })
      )
  };

  const invoiceLineItems: TenantInvoiceLineItemRepository = {
    create: async (record) =>
      mapTenantInvoiceLineItemRecord(
        await prisma.tenantInvoiceLineItem.create({
          data: {
            amountMinor: record.amountMinor,
            createdAt: toDate(record.createdAt),
            description: record.description,
            id: record.id,
            invoiceId: record.invoiceId,
            metric: record.metric,
            quantity: record.quantity,
            unitPriceMinor: record.unitPriceMinor
          }
        })
      ),
    listByInvoiceId: async (invoiceId) =>
      (
        await prisma.tenantInvoiceLineItem.findMany({
          orderBy: { createdAt: "asc" },
          where: { invoiceId }
        })
      ).map(mapTenantInvoiceLineItemRecord)
  };

  return {
    ...release10,
    billingFeeScheduleTiers,
    billingFeeSchedules,
    billingPlans,
    invoices,
    invoiceLineItems,
    partnerBrandAssets,
    tenantBillingPlanAssignments,
    tenantDomains,
    tenantSettings,
    usageMeterEvents
  };
}
