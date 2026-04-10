import { createBillingFeeScheduleAction, createBillingPlanAction, updateBillingPlanAction } from "../actions";
import { listAllInvoices, listBillingFeeSchedules, listBillingPlans, listPartners } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { Card, ConsoleHeader, DataTable, EmptyState, Pill, toneForStatus } from "../ui";

export default async function BillingPage() {
  const { messages } = await getI18n();
  const plans = await listBillingPlans();
  const [partners, invoices, schedulesByPlan] = await Promise.all([
    listPartners(),
    listAllInvoices(),
    Promise.all(
      plans.billingPlans.map(async (plan) => ({
        billingPlanId: plan.id,
        response: await listBillingFeeSchedules(plan.id)
      }))
    )
  ]);
  const partnerNames = new Map(
    partners.partners.map((partner) => [partner.id, partner.name] as const)
  );

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.billing}
        title={messages.billing.title}
        subtitle={messages.billing.subtitle}
      />
      <div className="stack">
        <div className="split-grid">
          <Card title={messages.billing.createPlanTitle}>
            <form action={createBillingPlanAction} className="form-grid">
              <div className="field">
                <label htmlFor="code">{messages.billing.code}</label>
                <input id="code" name="code" placeholder="EMBEDDED_STARTER" />
              </div>
              <div className="field">
                <label htmlFor="displayName">{messages.billing.displayName}</label>
                <input id="displayName" name="displayName" placeholder="Embedded Starter" />
              </div>
              <div className="field">
                <label htmlFor="baseMonthlyFeeMinor">{messages.billing.baseFeeMinor}</label>
                <input id="baseMonthlyFeeMinor" name="baseMonthlyFeeMinor" placeholder="1000" />
              </div>
              <div className="field">
                <label htmlFor="invoiceDueDays">{messages.billing.invoiceDueDays}</label>
                <input id="invoiceDueDays" name="invoiceDueDays" placeholder="15" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.billing.createPlan}
                </button>
              </div>
            </form>
          </Card>

          <Card title={messages.billing.addTier}>
            <form action={createBillingFeeScheduleAction} className="form-grid">
              <div className="field">
                <label htmlFor="billingPlanId">{messages.billing.billingPlanId}</label>
                <input id="billingPlanId" name="billingPlanId" />
              </div>
              <div className="field">
                <label htmlFor="effectiveFrom">{messages.billing.effectiveFrom}</label>
                <input id="effectiveFrom" name="effectiveFrom" placeholder="2026-05-01T00:00:00.000Z" />
              </div>
              <div className="field">
                <label htmlFor="metric">{messages.billing.metric}</label>
                <input id="metric" name="metric" placeholder="PARTNER_API_WRITE_REQUEST" />
              </div>
              <div className="field">
                <label htmlFor="includedUnits">{messages.billing.includedUnits}</label>
                <input id="includedUnits" name="includedUnits" placeholder="100" />
              </div>
              <div className="field">
                <label htmlFor="startsAtUnit">{messages.billing.startsAtUnit}</label>
                <input id="startsAtUnit" name="startsAtUnit" placeholder="101" />
              </div>
              <div className="field">
                <label htmlFor="upToUnit">{messages.billing.upToUnit}</label>
                <input id="upToUnit" name="upToUnit" placeholder="1000" />
              </div>
              <div className="field">
                <label htmlFor="unitPriceMinor">{messages.billing.unitPriceMinor}</label>
                <input id="unitPriceMinor" name="unitPriceMinor" placeholder="25" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.billing.addSchedule}
                </button>
              </div>
            </form>
          </Card>
        </div>

        <Card title={messages.billing.existingPlans}>
          {plans.billingPlans.length === 0 ? (
            <EmptyState body={messages.partners.noPlans} />
          ) : (
            <div className="stack">
              {plans.billingPlans.map((plan) => {
                const schedules =
                  schedulesByPlan.find((entry) => entry.billingPlanId === plan.id)?.response
                    .billingFeeSchedules ?? [];

                return (
                  <Card key={plan.id} title={`${plan.displayName} (${plan.code})`}>
                    <div className="detail-grid">
                      <div>
                        <small className="muted">{messages.billing.planId}</small>
                        <div className="mono">{plan.id}</div>
                      </div>
                      <div>
                        <small className="muted">{messages.billing.baseFee}</small>
                        <div>{plan.baseMonthlyFeeMinor} USD minor</div>
                      </div>
                      <div>
                        <small className="muted">{messages.billing.dueDays}</small>
                        <div>{plan.invoiceDueDays}</div>
                      </div>
                      <div>
                        <small className="muted">{messages.billing.status}</small>
                        <div>
                          <Pill
                            tone={toneForStatus(plan.status)}
                            value={formatCode(plan.status, messages.statuses, messages.common.none)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="actions-row">
                      <form action={updateBillingPlanAction} className="actions-row">
                        <input name="billingPlanId" type="hidden" value={plan.id} />
                        <input
                          name="status"
                          type="hidden"
                          value={plan.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"}
                        />
                        <button className="button button-secondary" type="submit">
                          {plan.status === "ACTIVE" ? messages.billing.archive : messages.partners.activate}
                        </button>
                      </form>
                    </div>
                    {schedules.length === 0 ? (
                      <EmptyState body={messages.partners.noSchedules} />
                    ) : (
                      <DataTable
                        headers={[
                          "Schedule Id",
                          messages.billing.effectiveFrom,
                          messages.billing.metric,
                          messages.billing.included,
                          messages.billing.starts,
                          messages.billing.upTo,
                          messages.billing.unitPrice
                        ]}
                      >
                        {schedules.flatMap((schedule) =>
                          schedule.tiers.map((tier) => (
                            <tr key={tier.id}>
                              <td>
                                <div className="mono">{schedule.id}</div>
                              </td>
                              <td className="mono">{schedule.effectiveFrom}</td>
                              <td>{tier.metric}</td>
                              <td>{tier.includedUnits}</td>
                              <td>{tier.startsAtUnit}</td>
                              <td>{tier.upToUnit ?? messages.common.unbounded}</td>
                              <td>{tier.unitPriceMinor}</td>
                            </tr>
                          ))
                        )}
                      </DataTable>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        <Card title={messages.billing.invoiceQueue}>
          {invoices.invoices.length === 0 ? (
            <EmptyState body={messages.billing.invoicesEmpty} />
          ) : (
            <DataTable
              headers={[
                "Invoice",
                messages.billing.tenant,
                messages.billing.period,
                messages.billing.status,
                messages.billing.total
              ]}
            >
              {invoices.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.id}</td>
                  <td>{partnerNames.get(invoice.partnerAccountId) ?? invoice.partnerAccountId}</td>
                  <td className="mono">
                    {invoice.periodStart.slice(0, 10)} to {invoice.periodEnd.slice(0, 10)}
                  </td>
                  <td>
                    <Pill
                      tone={toneForStatus(invoice.status)}
                      value={formatCode(invoice.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td>{invoice.totalMinor}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
