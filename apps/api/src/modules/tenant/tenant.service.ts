import { randomUUID } from "node:crypto";

import type { Release11Repositories } from "@blockchain-escrow/db";
import type {
  AssignTenantBillingPlanInput,
  AssignTenantBillingPlanResponse,
  BillingFeeScheduleDetail,
  BillingFeeScheduleTierSummary,
  BillingPlanSummary,
  CreateBillingFeeScheduleInput,
  CreateBillingFeeScheduleResponse,
  CreateBillingPlanInput,
  CreateBillingPlanResponse,
  CreateTenantDomainInput,
  CreateTenantDomainResponse,
  InvoiceDetail,
  InvoiceDetailResponse,
  InvoiceStatus,
  JsonObject,
  ListBillingPlansResponse,
  ListBillingFeeSchedulesResponse,
  ListInvoicesResponse,
  ListTenantDomainsResponse,
  PartnerBrandAssetSummary,
  RegisterPartnerBrandAssetInput,
  RegisterPartnerBrandAssetResponse,
  TenantBillingOverview,
  TenantBillingOverviewResponse,
  TenantPublicContext,
  TenantPublicContextResponse,
  TenantSettingsInput,
  TenantSettingsSummary,
  UpsertTenantSettingsResponse,
  UpdateBillingPlanInput,
  UpdateBillingPlanResponse,
  UpdateInvoiceStatusResponse,
  UsageSummary,
  UsageSummaryParams
} from "@blockchain-escrow/shared";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { RELEASE11_REPOSITORIES } from "../../infrastructure/tokens";

function normalizeHost(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return normalized.replace(/:\d+$/u, "");
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | null {
  const value = headers[name];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(isoTimestamp: string, days: number): string {
  const value = new Date(isoTimestamp);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function getMonthBounds(referenceIso: string): {
  currentStart: string;
  nextStart: string;
  previousStart: string;
} {
  const reference = new Date(referenceIso);
  const currentStart = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const nextStart = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
  const previousStart = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1, 0, 0, 0, 0)
  );

  return {
    currentStart: currentStart.toISOString(),
    nextStart: nextStart.toISOString(),
    previousStart: previousStart.toISOString()
  };
}

function sumBigIntStrings(values: Iterable<string>): string {
  let total = 0n;

  for (const value of values) {
    total += BigInt(value);
  }

  return total.toString();
}

function toPublicContext(input: {
  activeDomain: TenantPublicContext["activeDomain"];
  assets: PartnerBrandAssetSummary[];
  partnerAccountId: string;
  partnerSlug: string;
  settings: TenantSettingsSummary;
}): TenantPublicContext {
  return {
    activeDomain: input.activeDomain,
    brandAssets: input.assets,
    partnerAccountId: input.partnerAccountId,
    partnerSlug: input.partnerSlug,
    settings: input.settings
  };
}

function validateInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus
): boolean {
  switch (from) {
    case "DRAFT":
      return to === "FINALIZED" || to === "VOID";
    case "FINALIZED":
      return to === "SENT" || to === "PAID" || to === "VOID";
    case "SENT":
      return to === "PAID" || to === "DISPUTED" || to === "VOID";
    case "DISPUTED":
      return to === "SENT" || to === "PAID" || to === "VOID";
    case "PAID":
    case "VOID":
      return false;
  }
}

@Injectable()
export class TenantService {
  constructor(
    @Inject(RELEASE11_REPOSITORIES)
    private readonly release11Repositories: Release11Repositories
  ) {}

  async resolvePublicContext(input: {
    headers?: Record<string, string | string[] | undefined>;
    slug?: string | null;
  }): Promise<TenantPublicContextResponse> {
    const tenantHost =
      normalizeHost(input.headers ? readHeader(input.headers, "x-tenant-host") : null) ??
      normalizeHost(input.headers ? readHeader(input.headers, "host") : null);
    const byHost =
      tenantHost ?
        await this.release11Repositories.tenantDomains.findActiveByHostname(tenantHost)
      : null;
    const partnerAccount =
      byHost
        ? await this.release11Repositories.partnerAccounts.findById(byHost.partnerAccountId)
        : input.slug
          ? await this.release11Repositories.partnerAccounts.findBySlug(input.slug)
          : null;

    if (!partnerAccount) {
      return { tenant: null };
    }

    const [settings, assets, domains] = await Promise.all([
      this.release11Repositories.tenantSettings.findByPartnerAccountId(partnerAccount.id),
      this.release11Repositories.partnerBrandAssets.listByPartnerAccountId(partnerAccount.id),
      this.release11Repositories.tenantDomains.listByPartnerAccountId(partnerAccount.id)
    ]);

    if (!settings) {
      return { tenant: null };
    }

    const activeDomain =
      byHost ??
      domains.find((domain) => domain.status === "ACTIVE" && domain.surface === "ENTRYPOINT") ??
      domains.find((domain) => domain.status === "ACTIVE") ??
      null;

    if (!activeDomain) {
      return { tenant: null };
    }

    return {
      tenant: toPublicContext({
        activeDomain,
        assets,
        partnerAccountId: partnerAccount.id,
        partnerSlug: partnerAccount.slug,
        settings
      })
    };
  }

  async getHostedBaseUrl(
    partnerAccountId: string,
    fallbackBaseUrl: string
  ): Promise<string> {
    const domains =
      await this.release11Repositories.tenantDomains.listByPartnerAccountId(partnerAccountId);
    const hostedDomain =
      domains.find((domain) => domain.surface === "HOSTED" && domain.status === "ACTIVE") ??
      null;

    if (!hostedDomain) {
      return fallbackBaseUrl;
    }

    if (hostedDomain.hostname.startsWith("localhost") || hostedDomain.hostname.startsWith("127.0.0.1")) {
      return `http://${hostedDomain.hostname}`;
    }

    return `https://${hostedDomain.hostname}`;
  }

  async upsertSettings(
    partnerAccountId: string,
    input: TenantSettingsInput
  ): Promise<UpsertTenantSettingsResponse> {
    const account =
      await this.release11Repositories.partnerAccounts.findById(partnerAccountId);

    if (!account) {
      throw new NotFoundException("partner account not found");
    }

    const existing =
      await this.release11Repositories.tenantSettings.findByPartnerAccountId(partnerAccountId);
    const now = nowIso();

    return {
      settings: await this.release11Repositories.tenantSettings.upsert({
        accentColorHex: input.accentColorHex,
        backgroundColorHex: input.backgroundColorHex,
        createdAt: existing?.createdAt ?? now,
        displayName: input.displayName,
        faviconAssetId: input.faviconAssetId ?? null,
        legalName: input.legalName,
        logoAssetId: input.logoAssetId ?? null,
        partnerAccountId,
        primaryColorHex: input.primaryColorHex,
        privacyPolicyUrl: input.privacyPolicyUrl,
        supportEmail: input.supportEmail,
        supportUrl: input.supportUrl,
        termsOfServiceUrl: input.termsOfServiceUrl,
        textColorHex: input.textColorHex,
        updatedAt: now
      })
    };
  }

  async registerBrandAsset(
    partnerAccountId: string,
    input: RegisterPartnerBrandAssetInput
  ): Promise<RegisterPartnerBrandAssetResponse> {
    const account =
      await this.release11Repositories.partnerAccounts.findById(partnerAccountId);

    if (!account) {
      throw new NotFoundException("partner account not found");
    }

    const now = nowIso();

    return {
      asset: await this.release11Repositories.partnerBrandAssets.create({
        byteSize: input.byteSize,
        createdAt: now,
        id: randomUUID(),
        mediaType: input.mediaType,
        originalFilename: input.originalFilename,
        partnerAccountId,
        role: input.role,
        sha256Hex: input.sha256Hex,
        storageKey: input.storageKey,
        updatedAt: now
      })
    };
  }

  async createDomain(
    partnerAccountId: string,
    input: CreateTenantDomainInput
  ): Promise<CreateTenantDomainResponse> {
    const account =
      await this.release11Repositories.partnerAccounts.findById(partnerAccountId);

    if (!account) {
      throw new NotFoundException("partner account not found");
    }

    const existing =
      await this.release11Repositories.tenantDomains.findByHostname(input.hostname);

    if (existing) {
      throw new ConflictException("tenant domain hostname already exists");
    }

    const now = nowIso();

    return {
      domain: await this.release11Repositories.tenantDomains.create({
        createdAt: now,
        hostname: input.hostname.toLowerCase(),
        id: randomUUID(),
        partnerAccountId,
        status: "PENDING",
        surface: input.surface,
        updatedAt: now,
        verifiedAt: null
      })
    };
  }

  async listDomains(partnerAccountId: string): Promise<ListTenantDomainsResponse> {
    return {
      domains: await this.release11Repositories.tenantDomains.listByPartnerAccountId(
        partnerAccountId
      )
    };
  }

  async updateDomainStatus(input: {
    domainId: string;
    status: "VERIFIED" | "ACTIVE" | "DISABLED";
  }): Promise<CreateTenantDomainResponse> {
    const domain = await this.release11Repositories.tenantDomains.findById(input.domainId);

    if (!domain) {
      throw new NotFoundException("tenant domain not found");
    }

    const now = nowIso();

    if (input.status === "ACTIVE") {
      if (domain.status !== "VERIFIED" && domain.status !== "ACTIVE") {
        throw new ConflictException("tenant domain must be verified before activation");
      }

      const siblings =
        await this.release11Repositories.tenantDomains.listByPartnerAccountId(
          domain.partnerAccountId
        );
      await Promise.all(
        siblings
          .filter(
            (candidate) =>
              candidate.id !== domain.id &&
              candidate.surface === domain.surface &&
              candidate.status === "ACTIVE"
          )
          .map((candidate) =>
            this.release11Repositories.tenantDomains.update(candidate.id, {
              status: "DISABLED",
              updatedAt: now
            })
          )
      );
    }

    return {
      domain: await this.release11Repositories.tenantDomains.update(domain.id, {
        status: input.status,
        updatedAt: now,
        verifiedAt:
          input.status === "VERIFIED" || input.status === "ACTIVE"
            ? domain.verifiedAt ?? now
            : input.status === "DISABLED"
              ? domain.verifiedAt
              : null
      })
    };
  }

  async createBillingPlan(
    input: CreateBillingPlanInput
  ): Promise<CreateBillingPlanResponse> {
    const existing = await this.release11Repositories.billingPlans.findByCode(input.code);

    if (existing) {
      throw new ConflictException("billing plan code already exists");
    }

    const now = nowIso();

    return {
      billingPlan: await this.release11Repositories.billingPlans.create({
        baseMonthlyFeeMinor: input.baseMonthlyFeeMinor,
        code: input.code,
        createdAt: now,
        currency: input.currency,
        displayName: input.displayName,
        id: randomUUID(),
        invoiceDueDays: input.invoiceDueDays,
        status: "ACTIVE",
        updatedAt: now
      })
    };
  }

  async updateBillingPlan(
    billingPlanId: string,
    input: UpdateBillingPlanInput
  ): Promise<UpdateBillingPlanResponse> {
    const plan = await this.release11Repositories.billingPlans.findById(billingPlanId);

    if (!plan) {
      throw new NotFoundException("billing plan not found");
    }

    return {
      billingPlan: await this.release11Repositories.billingPlans.update(billingPlanId, {
        ...(input.baseMonthlyFeeMinor ? { baseMonthlyFeeMinor: input.baseMonthlyFeeMinor } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.invoiceDueDays !== undefined
          ? { invoiceDueDays: input.invoiceDueDays }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        updatedAt: nowIso()
      })
    };
  }

  async listBillingPlans(): Promise<ListBillingPlansResponse> {
    return {
      billingPlans: await this.release11Repositories.billingPlans.listAll()
    };
  }

  async listBillingFeeSchedules(
    billingPlanId: string
  ): Promise<ListBillingFeeSchedulesResponse> {
    const plan = await this.release11Repositories.billingPlans.findById(billingPlanId);

    if (!plan) {
      throw new NotFoundException("billing plan not found");
    }

    const schedules =
      await this.release11Repositories.billingFeeSchedules.listByBillingPlanId(billingPlanId);

    return {
      billingFeeSchedules: await Promise.all(
        schedules.map(async (schedule) => ({
          ...schedule,
          tiers:
            await this.release11Repositories.billingFeeScheduleTiers.listByBillingFeeScheduleId(
              schedule.id
            )
        }))
      )
    };
  }

  async createBillingFeeSchedule(
    billingPlanId: string,
    input: CreateBillingFeeScheduleInput
  ): Promise<CreateBillingFeeScheduleResponse> {
    const plan = await this.release11Repositories.billingPlans.findById(billingPlanId);

    if (!plan) {
      throw new NotFoundException("billing plan not found");
    }

    const now = nowIso();
    const billingFeeSchedule =
      await this.release11Repositories.billingFeeSchedules.create({
        billingPlanId,
        createdAt: now,
        effectiveFrom: input.effectiveFrom,
        id: randomUUID(),
        updatedAt: now
      });

    const tiers: BillingFeeScheduleTierSummary[] = [];

    for (const [index, tier] of input.tiers.entries()) {
      tiers.push(
        await this.release11Repositories.billingFeeScheduleTiers.create({
          billingFeeScheduleId: billingFeeSchedule.id,
          id: randomUUID(),
          includedUnits: tier.includedUnits,
          metric: tier.metric,
          position: index,
          startsAtUnit: tier.startsAtUnit,
          unitPriceMinor: tier.unitPriceMinor,
          upToUnit: tier.upToUnit ?? null
        })
      );
    }

    return {
      billingFeeSchedule: {
        ...billingFeeSchedule,
        tiers
      }
    };
  }

  async assignBillingPlan(
    partnerAccountId: string,
    input: AssignTenantBillingPlanInput
  ): Promise<AssignTenantBillingPlanResponse> {
    const [account, plan, schedule] = await Promise.all([
      this.release11Repositories.partnerAccounts.findById(partnerAccountId),
      this.release11Repositories.billingPlans.findById(input.billingPlanId),
      this.release11Repositories.billingFeeSchedules.findById(input.billingFeeScheduleId)
    ]);

    if (!account) {
      throw new NotFoundException("partner account not found");
    }

    if (!plan) {
      throw new NotFoundException("billing plan not found");
    }

    if (!schedule || schedule.billingPlanId !== plan.id) {
      throw new NotFoundException("billing fee schedule not found");
    }

    const existing =
      await this.release11Repositories.tenantBillingPlanAssignments.findActiveByPartnerAccountIdAt(
        {
          at: input.effectiveFrom,
          partnerAccountId
        }
      );

    if (existing) {
      await this.release11Repositories.tenantBillingPlanAssignments.update(existing.id, {
        effectiveTo: input.effectiveFrom
      });
    }

    return {
      assignment: await this.release11Repositories.tenantBillingPlanAssignments.create({
        billingFeeScheduleId: input.billingFeeScheduleId,
        billingPlanId: input.billingPlanId,
        createdAt: nowIso(),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: null,
        id: randomUUID(),
        partnerAccountId
      })
    };
  }

  async recordUsageEvent(input: {
    externalKey?: string | null;
    metadata?: Record<string, unknown> | null;
    metric: Parameters<Release11Repositories["usageMeterEvents"]["create"]>[0]["metric"];
    occurredAt?: string;
    organizationId?: string | null;
    partnerAccountId: string;
    partnerOrganizationLinkId?: string | null;
    quantity?: string;
  }): Promise<void> {
    if (input.externalKey) {
      const existing =
        await this.release11Repositories.usageMeterEvents.findByExternalKey(input.externalKey);

      if (existing) {
        return;
      }
    }

    await this.release11Repositories.usageMeterEvents.create({
      externalKey: input.externalKey ?? null,
      id: randomUUID(),
      metadata: (input.metadata ?? null) as JsonObject | null,
      metric: input.metric,
      occurredAt: input.occurredAt ?? nowIso(),
      organizationId: input.organizationId ?? null,
      partnerAccountId: input.partnerAccountId,
      partnerOrganizationLinkId: input.partnerOrganizationLinkId ?? null,
      quantity: input.quantity ?? "1"
    });
  }

  async summarizeUsage(
    partnerAccountId: string,
    params?: UsageSummaryParams
  ): Promise<UsageSummary> {
    const now = nowIso();
    const { currentStart, nextStart } = getMonthBounds(now);
    const periodStart = params?.periodStart ?? currentStart;
    const periodEnd = params?.periodEnd ?? nextStart;
    const events =
      await this.release11Repositories.usageMeterEvents.listByPartnerAccountIdWithin({
        occurredAtGte: periodStart,
        occurredAtLt: periodEnd,
        partnerAccountId
      });
    const totals = new Map<string, bigint>();

    for (const event of events) {
      const current = totals.get(event.metric) ?? 0n;
      totals.set(event.metric, current + BigInt(event.quantity));
    }

    return {
      metrics: [...totals.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([metric, count]) => ({
          count: count.toString(),
          metric: metric as UsageSummary["metrics"][number]["metric"]
        })),
      periodEnd,
      periodStart
    };
  }

  async buildBillingOverview(
    partnerAccountId: string
  ): Promise<TenantBillingOverviewResponse> {
    const now = nowIso();
    const { currentStart, nextStart, previousStart } = getMonthBounds(now);
    const [activeAssignment, currentUsage, previousUsage, recentInvoices] =
      await Promise.all([
        this.release11Repositories.tenantBillingPlanAssignments.findActiveByPartnerAccountIdAt({
          at: now,
          partnerAccountId
        }),
        this.summarizeUsage(partnerAccountId, {
          periodEnd: nextStart,
          periodStart: currentStart
        }),
        this.summarizeUsage(partnerAccountId, {
          periodEnd: currentStart,
          periodStart: previousStart
        }),
        this.release11Repositories.invoices.listByPartnerAccountId(partnerAccountId)
      ]);

    return {
      billing: {
        activeAssignment,
        currentUsage,
        previousUsage,
        recentInvoices: recentInvoices.slice(0, 12)
      }
    };
  }

  async listInvoices(partnerAccountId: string): Promise<ListInvoicesResponse> {
    return {
      invoices: await this.release11Repositories.invoices.listByPartnerAccountId(partnerAccountId)
    };
  }

  async listAllInvoices(): Promise<ListInvoicesResponse> {
    return {
      invoices: await this.release11Repositories.invoices.listAll()
    };
  }

  async getInvoice(invoiceId: string): Promise<InvoiceDetailResponse> {
    return {
      invoice: await this.buildInvoiceDetail(invoiceId)
    };
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus
  ): Promise<UpdateInvoiceStatusResponse> {
    const invoice = await this.release11Repositories.invoices.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundException("invoice not found");
    }

    if (!validateInvoiceTransition(invoice.status, status)) {
      throw new ConflictException("invoice status transition is invalid");
    }

    await this.release11Repositories.invoices.update(invoiceId, {
      status,
      updatedAt: nowIso()
    });

    return {
      invoice: await this.buildInvoiceDetail(invoiceId)
    };
  }

  async getPartnerDetailExtension(partnerAccountId: string): Promise<{
    billing: TenantBillingOverview | null;
    brandAssets: PartnerBrandAssetSummary[];
    domains: ListTenantDomainsResponse["domains"];
    settings: TenantSettingsSummary | null;
  }> {
    const [settings, brandAssets, domains, billing] = await Promise.all([
      this.release11Repositories.tenantSettings.findByPartnerAccountId(partnerAccountId),
      this.release11Repositories.partnerBrandAssets.listByPartnerAccountId(partnerAccountId),
      this.release11Repositories.tenantDomains.listByPartnerAccountId(partnerAccountId),
      this.buildBillingOverview(partnerAccountId).catch(() => ({ billing: null }))
    ]);

    return {
      billing: billing.billing,
      brandAssets,
      domains,
      settings
    };
  }

  private async buildInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
    const invoice = await this.release11Repositories.invoices.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundException("invoice not found");
    }

    return {
      ...invoice,
      lineItems: await this.release11Repositories.invoiceLineItems.listByInvoiceId(invoiceId)
    };
  }
}
