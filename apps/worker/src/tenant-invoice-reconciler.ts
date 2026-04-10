import { randomUUID } from "node:crypto";

import type { Release11Repositories } from "@blockchain-escrow/db";

export interface TenantInvoiceReconciliationResult {
  readonly createdTenantInvoiceCount: number;
  readonly skippedTenantInvoiceCount: number;
}

function addDays(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function getPreviousMonthBounds(referenceIso: string): {
  at: string;
  periodEnd: string;
  periodStart: string;
} {
  const reference = new Date(referenceIso);
  const periodEnd = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const periodStart = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1, 0, 0, 0, 0)
  );

  return {
    at: new Date(periodEnd.getTime() - 1).toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodStart: periodStart.toISOString()
  };
}

function computeTierCharge(input: {
  quantity: bigint;
  tiers: Array<{
    includedUnits: string;
    startsAtUnit: string;
    unitPriceMinor: string;
    upToUnit: string | null;
  }>;
}): {
  amountMinor: string;
  quantity: string;
  unitPriceMinor: string;
}[] {
  const charges: Array<{
    amountMinor: string;
    quantity: string;
    unitPriceMinor: string;
  }> = [];

  for (const tier of input.tiers) {
    const includedUnits = BigInt(tier.includedUnits);
    const tierStart = BigInt(tier.startsAtUnit);
    const effectiveStart = tierStart > includedUnits ? tierStart : includedUnits + 1n;
    const tierEnd = tier.upToUnit ? BigInt(tier.upToUnit) : input.quantity;

    if (input.quantity < effectiveStart) {
      continue;
    }

    const effectiveEnd = input.quantity < tierEnd ? input.quantity : tierEnd;

    if (effectiveEnd < effectiveStart) {
      continue;
    }

    const chargeQuantity = effectiveEnd - effectiveStart + 1n;
    const unitPriceMinor = BigInt(tier.unitPriceMinor);

    if (chargeQuantity <= 0n || unitPriceMinor <= 0n) {
      continue;
    }

    charges.push({
      amountMinor: (chargeQuantity * unitPriceMinor).toString(),
      quantity: chargeQuantity.toString(),
      unitPriceMinor: unitPriceMinor.toString()
    });
  }

  return charges;
}

export class TenantInvoiceReconciler {
  constructor(
    private readonly release11Repositories: Release11Repositories,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async reconcileOnce(): Promise<TenantInvoiceReconciliationResult> {
    const { at, periodEnd, periodStart } = getPreviousMonthBounds(this.now());
    const partners = await this.release11Repositories.partnerAccounts.listAll();
    let createdTenantInvoiceCount = 0;
    let skippedTenantInvoiceCount = 0;

    for (const partner of partners) {
      const existing =
        await this.release11Repositories.invoices.findByPartnerAccountIdAndPeriod({
          partnerAccountId: partner.id,
          periodEnd,
          periodStart
        });

      if (existing) {
        skippedTenantInvoiceCount += 1;
        continue;
      }

      const assignment =
        await this.release11Repositories.tenantBillingPlanAssignments.findActiveByPartnerAccountIdAt(
          {
            at,
            partnerAccountId: partner.id
          }
        );

      if (!assignment) {
        skippedTenantInvoiceCount += 1;
        continue;
      }

      const [plan, schedule, tiers, usageEvents] = await Promise.all([
        this.release11Repositories.billingPlans.findById(assignment.billingPlanId),
        this.release11Repositories.billingFeeSchedules.findById(assignment.billingFeeScheduleId),
        this.release11Repositories.billingFeeScheduleTiers.listByBillingFeeScheduleId(
          assignment.billingFeeScheduleId
        ),
        this.release11Repositories.usageMeterEvents.listByPartnerAccountIdWithin({
          occurredAtGte: periodStart,
          occurredAtLt: periodEnd,
          partnerAccountId: partner.id
        })
      ]);

      if (!plan || !schedule) {
        skippedTenantInvoiceCount += 1;
        continue;
      }

      const invoiceId = randomUUID();
      const createdAt = this.now();
      let subtotalMinor = BigInt(plan.baseMonthlyFeeMinor);

      await this.release11Repositories.invoices.create({
        billingFeeScheduleId: schedule.id,
        billingPlanId: plan.id,
        createdAt,
        currency: "USD",
        dueAt: addDays(periodEnd, plan.invoiceDueDays),
        id: invoiceId,
        partnerAccountId: partner.id,
        periodEnd,
        periodStart,
        status: "DRAFT",
        subtotalMinor: "0",
        totalMinor: "0",
        updatedAt: createdAt
      });

      await this.release11Repositories.invoiceLineItems.create({
        amountMinor: plan.baseMonthlyFeeMinor,
        createdAt,
        description: `${plan.displayName} base monthly fee`,
        id: randomUUID(),
        invoiceId,
        metric: null,
        quantity: "1",
        unitPriceMinor: plan.baseMonthlyFeeMinor
      });

      const usageByMetric = new Map<string, bigint>();
      for (const event of usageEvents) {
        const current = usageByMetric.get(event.metric) ?? 0n;
        usageByMetric.set(event.metric, current + BigInt(event.quantity));
      }

      for (const [metric, quantity] of usageByMetric.entries()) {
        const metricTiers = tiers
          .filter((tier) => tier.metric === metric)
          .sort((left, right) => left.position - right.position);

        for (const charge of computeTierCharge({ quantity, tiers: metricTiers })) {
          subtotalMinor += BigInt(charge.amountMinor);
          await this.release11Repositories.invoiceLineItems.create({
            amountMinor: charge.amountMinor,
            createdAt,
            description: `${metric} usage`,
            id: randomUUID(),
            invoiceId,
            metric: metric as Parameters<
              Release11Repositories["invoiceLineItems"]["create"]
            >[0]["metric"],
            quantity: charge.quantity,
            unitPriceMinor: charge.unitPriceMinor
          });
        }
      }

      await this.release11Repositories.invoices.update(invoiceId, {
        status: "DRAFT",
        subtotalMinor: subtotalMinor.toString(),
        totalMinor: subtotalMinor.toString(),
        updatedAt: createdAt
      });
      createdTenantInvoiceCount += 1;
    }

    return {
      createdTenantInvoiceCount,
      skippedTenantInvoiceCount
    };
  }
}
