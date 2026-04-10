import type {
  BillingFeeScheduleRecord,
  BillingFeeScheduleTierRecord,
  BillingPlanRecord,
  BillingUsageMeterEventRecord,
  PartnerBrandAssetRecord,
  PartnerTenantSettingsRecord,
  Release11Repositories,
  TenantBillingPlanAssignmentRecord,
  TenantDomainRecord,
  TenantInvoiceLineItemRecord,
  TenantInvoiceRecord
} from "@blockchain-escrow/db";

import { InMemoryRelease10Repositories } from "./in-memory-release10-repositories";

function compareIsoTimestamps(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export class InMemoryRelease11Repositories
  extends InMemoryRelease10Repositories
  implements Release11Repositories
{
  readonly billingFeeScheduleRecords: BillingFeeScheduleRecord[] = [];
  readonly billingFeeScheduleTierRecords: BillingFeeScheduleTierRecord[] = [];
  readonly billingPlanRecords: BillingPlanRecord[] = [];
  readonly billingUsageMeterEventRecords: BillingUsageMeterEventRecord[] = [];
  readonly invoiceLineItemRecords: TenantInvoiceLineItemRecord[] = [];
  readonly invoiceRecords: TenantInvoiceRecord[] = [];
  readonly partnerBrandAssetRecords: PartnerBrandAssetRecord[] = [];
  readonly partnerTenantSettingsRecords: PartnerTenantSettingsRecord[] = [];
  readonly tenantBillingPlanAssignmentRecords: TenantBillingPlanAssignmentRecord[] = [];
  readonly tenantDomainRecords: TenantDomainRecord[] = [];

  readonly partnerBrandAssets = {
    create: async (record: PartnerBrandAssetRecord) => {
      this.partnerBrandAssetRecords.push(record);
      return record;
    },
    findById: async (id: string) =>
      this.partnerBrandAssetRecords.find((record) => record.id === id) ?? null,
    listByPartnerAccountId: async (partnerAccountId: string) =>
      this.partnerBrandAssetRecords.filter((record) => record.partnerAccountId === partnerAccountId)
  };

  readonly tenantSettings = {
    findByPartnerAccountId: async (partnerAccountId: string) =>
      this.partnerTenantSettingsRecords.find((record) => record.partnerAccountId === partnerAccountId) ??
      null,
    upsert: async (record: PartnerTenantSettingsRecord) => {
      const existing = this.partnerTenantSettingsRecords.find(
        (entry) => entry.partnerAccountId === record.partnerAccountId
      );
      if (existing) {
        Object.assign(existing, record);
        return existing;
      }
      this.partnerTenantSettingsRecords.push(record);
      return record;
    }
  };

  readonly tenantDomains = {
    create: async (record: TenantDomainRecord) => {
      this.tenantDomainRecords.push(record);
      return record;
    },
    findActiveByHostname: async (hostname: string) =>
      this.tenantDomainRecords.find(
        (record) => record.hostname === hostname && record.status === "ACTIVE"
      ) ?? null,
    findByHostname: async (hostname: string) =>
      this.tenantDomainRecords.find((record) => record.hostname === hostname) ?? null,
    findById: async (id: string) =>
      this.tenantDomainRecords.find((record) => record.id === id) ?? null,
    listByPartnerAccountId: async (partnerAccountId: string) =>
      this.tenantDomainRecords.filter((record) => record.partnerAccountId === partnerAccountId),
    update: async (
      id: string,
      updates: Partial<Omit<TenantDomainRecord, "id" | "partnerAccountId" | "createdAt">>
    ) => {
      const record = this.tenantDomainRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Tenant domain not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly billingPlans = {
    create: async (record: BillingPlanRecord) => {
      this.billingPlanRecords.push(record);
      return record;
    },
    findByCode: async (code: string) =>
      this.billingPlanRecords.find((record) => record.code === code) ?? null,
    findById: async (id: string) =>
      this.billingPlanRecords.find((record) => record.id === id) ?? null,
    listAll: async () =>
      [...this.billingPlanRecords].sort((left, right) =>
        compareIsoTimestamps(left.createdAt, right.createdAt)
      ),
    update: async (
      id: string,
      updates: Partial<Omit<BillingPlanRecord, "id" | "code" | "createdAt">>
    ) => {
      const record = this.billingPlanRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Billing plan not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly billingFeeSchedules = {
    create: async (record: BillingFeeScheduleRecord) => {
      this.billingFeeScheduleRecords.push(record);
      return record;
    },
    findById: async (id: string) =>
      this.billingFeeScheduleRecords.find((record) => record.id === id) ?? null,
    listByBillingPlanId: async (billingPlanId: string) =>
      this.billingFeeScheduleRecords.filter((record) => record.billingPlanId === billingPlanId)
  };

  readonly billingFeeScheduleTiers = {
    create: async (record: BillingFeeScheduleTierRecord) => {
      this.billingFeeScheduleTierRecords.push(record);
      return record;
    },
    listByBillingFeeScheduleId: async (billingFeeScheduleId: string) =>
      this.billingFeeScheduleTierRecords.filter(
        (record) => record.billingFeeScheduleId === billingFeeScheduleId
      )
  };

  readonly tenantBillingPlanAssignments = {
    create: async (record: TenantBillingPlanAssignmentRecord) => {
      this.tenantBillingPlanAssignmentRecords.push(record);
      return record;
    },
    findActiveByPartnerAccountIdAt: async (input: { at: string; partnerAccountId: string }) =>
      this.tenantBillingPlanAssignmentRecords.find(
        (record) =>
          record.partnerAccountId === input.partnerAccountId &&
          new Date(record.effectiveFrom).getTime() <= new Date(input.at).getTime() &&
          (!record.effectiveTo ||
            new Date(record.effectiveTo).getTime() > new Date(input.at).getTime())
      ) ?? null,
    listByPartnerAccountId: async (partnerAccountId: string) =>
      this.tenantBillingPlanAssignmentRecords.filter(
        (record) => record.partnerAccountId === partnerAccountId
      ),
    update: async (
      id: string,
      updates: Partial<
        Omit<TenantBillingPlanAssignmentRecord, "id" | "partnerAccountId" | "createdAt">
      >
    ) => {
      const record = this.tenantBillingPlanAssignmentRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Billing assignment not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly usageMeterEvents = {
    create: async (record: BillingUsageMeterEventRecord) => {
      this.billingUsageMeterEventRecords.push(record);
      return record;
    },
    findByExternalKey: async (externalKey: string) =>
      this.billingUsageMeterEventRecords.find((record) => record.externalKey === externalKey) ??
      null,
    listByPartnerAccountIdWithin: async (input: {
      occurredAtGte: string;
      occurredAtLt: string;
      partnerAccountId: string;
    }) =>
      this.billingUsageMeterEventRecords.filter(
        (record) =>
          record.partnerAccountId === input.partnerAccountId &&
          new Date(record.occurredAt).getTime() >= new Date(input.occurredAtGte).getTime() &&
          new Date(record.occurredAt).getTime() < new Date(input.occurredAtLt).getTime()
      )
  };

  readonly invoices = {
    create: async (record: TenantInvoiceRecord) => {
      this.invoiceRecords.push(record);
      return record;
    },
    findById: async (id: string) =>
      this.invoiceRecords.find((record) => record.id === id) ?? null,
    findByPartnerAccountIdAndPeriod: async (input: {
      partnerAccountId: string;
      periodEnd: string;
      periodStart: string;
    }) =>
      this.invoiceRecords.find(
        (record) =>
          record.partnerAccountId === input.partnerAccountId &&
          record.periodEnd === input.periodEnd &&
          record.periodStart === input.periodStart
      ) ?? null,
    listAll: async () => [...this.invoiceRecords],
    listByPartnerAccountId: async (partnerAccountId: string) =>
      this.invoiceRecords.filter((record) => record.partnerAccountId === partnerAccountId),
    update: async (
      id: string,
      updates: Partial<
        Omit<
          TenantInvoiceRecord,
          | "id"
          | "partnerAccountId"
          | "billingPlanId"
          | "billingFeeScheduleId"
          | "periodStart"
          | "periodEnd"
          | "createdAt"
        >
      >
    ) => {
      const record = this.invoiceRecords.find((entry) => entry.id === id);
      if (!record) throw new Error(`Invoice not found: ${id}`);
      Object.assign(record, updates);
      return record;
    }
  };

  readonly invoiceLineItems = {
    create: async (record: TenantInvoiceLineItemRecord) => {
      this.invoiceLineItemRecords.push(record);
      return record;
    },
    listByInvoiceId: async (invoiceId: string) =>
      this.invoiceLineItemRecords.filter((record) => record.invoiceId === invoiceId)
  };
}
