import assert from "node:assert/strict";
import test from "node:test";

import { ConflictException } from "@nestjs/common";

import { InMemoryRelease1Repositories } from "./helpers/in-memory-release1-repositories";
import { InMemoryRelease11Repositories } from "./helpers/in-memory-release11-repositories";
import { TenantService } from "../src/modules/tenant/tenant.service";
import { PartnerService } from "../src/modules/partner/partner.service";
import type { PartnerConfiguration } from "../src/modules/partner/partner.tokens";
import type { PartnerApiContext } from "../src/modules/partner/partner-auth.service";
import type { RequestMetadata } from "../src/modules/auth/auth.http";

function getMonthBounds(reference: Date) {
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

async function seedPartnerAccount(repositories: InMemoryRelease11Repositories) {
  const now = new Date().toISOString();

  await repositories.partnerAccounts.create({
    createdAt: now,
    id: "partner-1",
    metadata: null,
    name: "Embedded Partner",
    slug: "embedded-partner",
    status: "ACTIVE",
    updatedAt: now
  });

  return {
    id: "partner-1",
    slug: "embedded-partner"
  };
}

async function seedPartnerLinkAndApiKey(
  repositories: InMemoryRelease11Repositories
): Promise<PartnerApiContext> {
  const now = new Date().toISOString();
  const account = await repositories.partnerAccounts.create({
    createdAt: now,
    id: "partner-1",
    metadata: null,
    name: "Embedded Partner",
    slug: "embedded-partner",
    status: "ACTIVE",
    updatedAt: now
  });
  const link = await repositories.partnerOrganizationLinks.create({
    actingUserId: "user-1",
    actingWalletId: "wallet-1",
    createdAt: now,
    externalReference: null,
    id: "partner-link-1",
    organizationId: "org-1",
    partnerAccountId: account.id,
    status: "ACTIVE",
    updatedAt: now
  });
  const apiKey = await repositories.partnerApiKeys.create({
    createdAt: now,
    displayName: "Primary API Key",
    expiresAt: null,
    id: "partner-api-key-1",
    keyPrefix: "besk_test",
    lastUsedAt: null,
    partnerOrganizationLinkId: link.id,
    revokedAt: null,
    scopes: ["hosted_sessions:write"],
    secretHash: "secret-hash",
    status: "ACTIVE",
    updatedAt: now
  });

  return {
    account,
    actor: {
      user: { id: "user-1" }
    } as PartnerApiContext["actor"],
    apiKey,
    link
  };
}

test("tenant service resolves public tenant context and keeps one active domain per surface", async () => {
  const repositories = new InMemoryRelease11Repositories();
  const tenantService = new TenantService(repositories);
  const partner = await seedPartnerAccount(repositories);

  await tenantService.upsertSettings(partner.id, {
    accentColorHex: "#d0ff5f",
    backgroundColorHex: "#f5f1e8",
    displayName: "Embedded Partner",
    faviconAssetId: null,
    legalName: "Embedded Partner LLC",
    logoAssetId: null,
    primaryColorHex: "#0b1020",
    privacyPolicyUrl: "https://embedded.example.com/privacy",
    supportEmail: "support@embedded.example.com",
    supportUrl: "https://embedded.example.com/support",
    termsOfServiceUrl: "https://embedded.example.com/terms",
    textColorHex: "#141414"
  });

  const firstDomain = await tenantService.createDomain(partner.id, {
    hostname: "tenant-one.example.com",
    surface: "ENTRYPOINT"
  });
  const secondDomain = await tenantService.createDomain(partner.id, {
    hostname: "tenant-two.example.com",
    surface: "ENTRYPOINT"
  });

  await tenantService.updateDomainStatus({ domainId: firstDomain.domain.id, status: "VERIFIED" });
  await tenantService.updateDomainStatus({ domainId: secondDomain.domain.id, status: "VERIFIED" });
  await tenantService.updateDomainStatus({ domainId: firstDomain.domain.id, status: "ACTIVE" });
  await tenantService.updateDomainStatus({ domainId: secondDomain.domain.id, status: "ACTIVE" });

  const domains = await tenantService.listDomains(partner.id);
  const firstStored = domains.domains.find((domain) => domain.id === firstDomain.domain.id);
  const secondStored = domains.domains.find((domain) => domain.id === secondDomain.domain.id);

  assert.equal(firstStored?.status, "DISABLED");
  assert.equal(secondStored?.status, "ACTIVE");

  const byHost = await tenantService.resolvePublicContext({
    headers: { host: "tenant-two.example.com" }
  });
  assert.equal(byHost.tenant?.partnerAccountId, partner.id);
  assert.equal(byHost.tenant?.activeDomain.hostname, "tenant-two.example.com");

  const bySlug = await tenantService.resolvePublicContext({
    slug: partner.slug
  });
  assert.equal(bySlug.tenant?.partnerSlug, partner.slug);
  assert.equal(bySlug.tenant?.settings.displayName, "Embedded Partner");
});

test("tenant service manages billing schedules, usage summaries, and invoice lifecycle transitions", async () => {
  const repositories = new InMemoryRelease11Repositories();
  const tenantService = new TenantService(repositories);
  const partner = await seedPartnerAccount(repositories);
  const now = new Date();
  const { currentStart, nextStart, previousStart } = getMonthBounds(now);

  const createdPlan = await tenantService.createBillingPlan({
    baseMonthlyFeeMinor: "15000",
    code: "EMBEDDED_STARTER",
    currency: "USD",
    displayName: "Embedded Starter",
    invoiceDueDays: 15
  });
  const createdSchedule = await tenantService.createBillingFeeSchedule(
    createdPlan.billingPlan.id,
    {
      effectiveFrom: previousStart,
      tiers: [
        {
          includedUnits: "100",
          metric: "PARTNER_API_WRITE_REQUEST",
          startsAtUnit: "101",
          unitPriceMinor: "25",
          upToUnit: null
        }
      ]
    }
  );

  await tenantService.assignBillingPlan(partner.id, {
    billingFeeScheduleId: createdSchedule.billingFeeSchedule.id,
    billingPlanId: createdPlan.billingPlan.id,
    effectiveFrom: previousStart
  });

  await tenantService.recordUsageEvent({
    metric: "PARTNER_API_WRITE_REQUEST",
    occurredAt: currentStart,
    partnerAccountId: partner.id,
    quantity: "3"
  });
  await tenantService.recordUsageEvent({
    metric: "PARTNER_HOSTED_SESSION_CREATED",
    occurredAt: currentStart,
    partnerAccountId: partner.id,
    quantity: "1"
  });

  const usage = await tenantService.summarizeUsage(partner.id, {
    periodEnd: nextStart,
    periodStart: currentStart
  });
  assert.deepEqual(usage.metrics, [
    { count: "3", metric: "PARTNER_API_WRITE_REQUEST" },
    { count: "1", metric: "PARTNER_HOSTED_SESSION_CREATED" }
  ]);

  const listedSchedules = await tenantService.listBillingFeeSchedules(createdPlan.billingPlan.id);
  assert.equal(listedSchedules.billingFeeSchedules.length, 1);
  assert.equal(listedSchedules.billingFeeSchedules[0]?.tiers.length, 1);

  const invoiceId = "invoice-1";
  await repositories.invoices.create({
    billingFeeScheduleId: createdSchedule.billingFeeSchedule.id,
    billingPlanId: createdPlan.billingPlan.id,
    createdAt: nextStart,
    currency: "USD",
    dueAt: nextStart,
    id: invoiceId,
    partnerAccountId: partner.id,
    periodEnd: nextStart,
    periodStart: currentStart,
    status: "DRAFT",
    subtotalMinor: "15075",
    totalMinor: "15075",
    updatedAt: nextStart
  });
  await repositories.invoiceLineItems.create({
    amountMinor: "15000",
    createdAt: nextStart,
    description: "Embedded Starter base monthly fee",
    id: "line-item-1",
    invoiceId,
    metric: null,
    quantity: "1",
    unitPriceMinor: "15000"
  });

  const billingOverview = await tenantService.buildBillingOverview(partner.id);
  assert.equal(billingOverview.billing.activeAssignment?.billingPlanId, createdPlan.billingPlan.id);
  assert.equal(billingOverview.billing.recentInvoices.length, 1);

  const finalized = await tenantService.updateInvoiceStatus(invoiceId, "FINALIZED");
  assert.equal(finalized.invoice.status, "FINALIZED");

  const paid = await tenantService.updateInvoiceStatus(invoiceId, "PAID");
  assert.equal(paid.invoice.status, "PAID");

  await assert.rejects(
    tenantService.updateInvoiceStatus(invoiceId, "SENT"),
    (error: unknown) =>
      error instanceof ConflictException &&
      error.message === "invoice status transition is invalid"
  );
});

test("partner service prefers active hosted domains and does not double-count idempotent writes", async () => {
  const release1Repositories = new InMemoryRelease1Repositories();
  const release11Repositories = new InMemoryRelease11Repositories();
  const tenantService = new TenantService(release11Repositories);
  const context = await seedPartnerLinkAndApiKey(release11Repositories);

  const hostedDomain = await tenantService.createDomain(context.account.id, {
    hostname: "hosted.embedded.example.com",
    surface: "HOSTED"
  });
  await tenantService.updateDomainStatus({ domainId: hostedDomain.domain.id, status: "VERIFIED" });
  await tenantService.updateDomainStatus({ domainId: hostedDomain.domain.id, status: "ACTIVE" });

  const configuration: PartnerConfiguration = {
    apiKeyPrefix: "besk",
    hostedBaseUrl: "https://platform.example.com",
    hostedCookieName: "bes_hosted_session",
    hostedSessionSecret: "secret",
    hostedSessionTtlSeconds: 3600
  };
  const headers = { "idempotency-key": "idem-1" };
  const requestMetadata: RequestMetadata = {
    cookieHeader: null,
    ipAddress: "127.0.0.1",
    userAgent: "partner-test"
  };
  const partnerService = new PartnerService(
    release1Repositories,
    release11Repositories,
    configuration,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    tenantService,
    {
      hashLaunchToken: (value: string) => `hashed:${value}`,
      requirePartnerContext: async () => context
    } as never,
    {} as never
  );

  const first = await partnerService.createHostedSession(
    headers,
    {
      draftDealId: "draft-1",
      partnerReferenceId: "launch-1",
      type: "DEAL_STATUS_REVIEW"
    },
    requestMetadata
  );
  const second = await partnerService.createHostedSession(
    headers,
    {
      draftDealId: "draft-1",
      partnerReferenceId: "launch-1",
      type: "DEAL_STATUS_REVIEW"
    },
    requestMetadata
  );

  assert.equal(first.hostedSession.launchUrl, second.hostedSession.launchUrl);
  assert.match(
    first.hostedSession.launchUrl ?? "",
    /^https:\/\/hosted\.embedded\.example\.com\/hosted\//
  );
  assert.equal(release11Repositories.partnerHostedSessionRecords.length, 1);

  const usageMetrics = release11Repositories.billingUsageMeterEventRecords.map(
    (record) => record.metric
  );
  assert.deepEqual(usageMetrics, [
    "PARTNER_HOSTED_SESSION_CREATED",
    "PARTNER_API_WRITE_REQUEST"
  ]);
});
