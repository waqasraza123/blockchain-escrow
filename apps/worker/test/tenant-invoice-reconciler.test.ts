import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryRelease11Repositories } from "../../api/test/helpers/in-memory-release11-repositories";
import { TenantInvoiceReconciler } from "../src/tenant-invoice-reconciler";

test("TenantInvoiceReconciler creates one monthly draft invoice and stays idempotent", async () => {
  const repositories = new InMemoryRelease11Repositories();
  const now = "2026-04-10T10:00:00.000Z";

  await repositories.partnerAccounts.create({
    createdAt: "2026-01-01T00:00:00.000Z",
    id: "partner-1",
    metadata: null,
    name: "Acme Embedded",
    slug: "acme-embedded",
    status: "ACTIVE",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  await repositories.billingPlans.create({
    baseMonthlyFeeMinor: "1000",
    code: "EMBEDDED_STARTER",
    createdAt: "2026-01-01T00:00:00.000Z",
    currency: "USD",
    displayName: "Embedded Starter",
    id: "plan-1",
    invoiceDueDays: 15,
    status: "ACTIVE",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  await repositories.billingFeeSchedules.create({
    billingPlanId: "plan-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    id: "schedule-1",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  await repositories.billingFeeScheduleTiers.create({
    billingFeeScheduleId: "schedule-1",
    id: "tier-1",
    includedUnits: "10",
    metric: "PARTNER_API_WRITE_REQUEST",
    position: 0,
    startsAtUnit: "11",
    unitPriceMinor: "25",
    upToUnit: null
  });
  await repositories.tenantBillingPlanAssignments.create({
    billingFeeScheduleId: "schedule-1",
    billingPlanId: "plan-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    id: "assignment-1",
    partnerAccountId: "partner-1"
  });
  await repositories.usageMeterEvents.create({
    externalKey: "usage-1",
    id: "usage-1",
    metadata: null,
    metric: "PARTNER_API_WRITE_REQUEST",
    occurredAt: "2026-03-05T00:00:00.000Z",
    organizationId: null,
    partnerAccountId: "partner-1",
    partnerOrganizationLinkId: null,
    quantity: "15"
  });

  const reconciler = new TenantInvoiceReconciler(repositories, () => now);

  const first = await reconciler.reconcileOnce();
  const second = await reconciler.reconcileOnce();

  assert.deepEqual(first, {
    createdTenantInvoiceCount: 1,
    skippedTenantInvoiceCount: 0
  });
  assert.deepEqual(second, {
    createdTenantInvoiceCount: 0,
    skippedTenantInvoiceCount: 1
  });
  assert.equal(repositories.invoiceRecords.length, 1);
  assert.equal(repositories.invoiceRecords[0]?.subtotalMinor, "1125");
  assert.equal(repositories.invoiceLineItemRecords.length, 2);
  assert.equal(repositories.invoiceLineItemRecords[0]?.amountMinor, "1000");
  assert.equal(repositories.invoiceLineItemRecords[1]?.amountMinor, "125");
});
