import { createBillingFeeScheduleAction, createBillingPlanAction, updateBillingPlanAction } from "../actions";
import { listAllInvoices, listBillingFeeSchedules, listBillingPlans, listPartners } from "../../../lib/operator-api";
import { Card, ConsoleHeader, DataTable, EmptyState, Pill, toneForStatus } from "../ui";

export default async function BillingPage() {
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
        eyebrow="Billing"
        title="Billing Plans"
        subtitle="Manage reusable plans, rate cards, and invoice defaults for tenant assignments."
      />
      <div className="stack">
        <div className="split-grid">
          <Card title="Create Billing Plan">
            <form action={createBillingPlanAction} className="form-grid">
              <div className="field">
                <label htmlFor="code">Code</label>
                <input id="code" name="code" placeholder="EMBEDDED_STARTER" />
              </div>
              <div className="field">
                <label htmlFor="displayName">Display Name</label>
                <input id="displayName" name="displayName" placeholder="Embedded Starter" />
              </div>
              <div className="field">
                <label htmlFor="baseMonthlyFeeMinor">Base Fee Minor</label>
                <input id="baseMonthlyFeeMinor" name="baseMonthlyFeeMinor" placeholder="1000" />
              </div>
              <div className="field">
                <label htmlFor="invoiceDueDays">Invoice Due Days</label>
                <input id="invoiceDueDays" name="invoiceDueDays" placeholder="15" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Create Plan
                </button>
              </div>
            </form>
          </Card>

          <Card title="Add Fee Schedule Tier">
            <form action={createBillingFeeScheduleAction} className="form-grid">
              <div className="field">
                <label htmlFor="billingPlanId">Billing Plan Id</label>
                <input id="billingPlanId" name="billingPlanId" />
              </div>
              <div className="field">
                <label htmlFor="effectiveFrom">Effective From</label>
                <input id="effectiveFrom" name="effectiveFrom" placeholder="2026-05-01T00:00:00.000Z" />
              </div>
              <div className="field">
                <label htmlFor="metric">Metric</label>
                <input id="metric" name="metric" placeholder="PARTNER_API_WRITE_REQUEST" />
              </div>
              <div className="field">
                <label htmlFor="includedUnits">Included Units</label>
                <input id="includedUnits" name="includedUnits" placeholder="100" />
              </div>
              <div className="field">
                <label htmlFor="startsAtUnit">Starts At Unit</label>
                <input id="startsAtUnit" name="startsAtUnit" placeholder="101" />
              </div>
              <div className="field">
                <label htmlFor="upToUnit">Up To Unit</label>
                <input id="upToUnit" name="upToUnit" placeholder="1000" />
              </div>
              <div className="field">
                <label htmlFor="unitPriceMinor">Unit Price Minor</label>
                <input id="unitPriceMinor" name="unitPriceMinor" placeholder="25" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Add Schedule
                </button>
              </div>
            </form>
          </Card>
        </div>

        <Card title="Existing Billing Plans">
          {plans.billingPlans.length === 0 ? (
            <EmptyState body="No billing plans exist yet." />
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
                        <small className="muted">Plan Id</small>
                        <div className="mono">{plan.id}</div>
                      </div>
                      <div>
                        <small className="muted">Base Fee</small>
                        <div>{plan.baseMonthlyFeeMinor} USD minor</div>
                      </div>
                      <div>
                        <small className="muted">Due Days</small>
                        <div>{plan.invoiceDueDays}</div>
                      </div>
                      <div>
                        <small className="muted">Status</small>
                        <div>
                          <Pill tone={toneForStatus(plan.status)} value={plan.status} />
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
                          {plan.status === "ACTIVE" ? "Archive" : "Activate"}
                        </button>
                      </form>
                    </div>
                    {schedules.length === 0 ? (
                      <EmptyState body="No fee schedules exist for this plan yet." />
                    ) : (
                      <DataTable
                        headers={[
                          "Schedule Id",
                          "Effective From",
                          "Metric",
                          "Included",
                          "Starts",
                          "Up To",
                          "Unit Price"
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
                              <td>{tier.upToUnit ?? "unbounded"}</td>
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

        <Card title="Invoice Queue">
          {invoices.invoices.length === 0 ? (
            <EmptyState body="No invoices have been generated yet." />
          ) : (
            <DataTable headers={["Invoice", "Tenant", "Period", "Status", "Total"]}>
              {invoices.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.id}</td>
                  <td>{partnerNames.get(invoice.partnerAccountId) ?? invoice.partnerAccountId}</td>
                  <td className="mono">
                    {invoice.periodStart.slice(0, 10)} to {invoice.periodEnd.slice(0, 10)}
                  </td>
                  <td>
                    <Pill tone={toneForStatus(invoice.status)} value={invoice.status} />
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
