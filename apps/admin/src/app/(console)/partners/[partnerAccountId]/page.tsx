import {
  activateTenantDomainAction,
  assignBillingPlanAction,
  createTenantDomainAction,
  createPartnerApiKeyAction,
  createPartnerOrganizationLinkAction,
  createPartnerWebhookSubscriptionAction,
  disableTenantDomainAction,
  registerPartnerBrandAssetAction,
  revokePartnerApiKeyAction,
  rotatePartnerWebhookSubscriptionSecretAction,
  updateInvoiceStatusAction,
  upsertTenantSettingsAction,
  verifyTenantDomainAction,
  updatePartnerWebhookSubscriptionAction
} from "../../actions";
import { getPartnerAccount, listBillingFeeSchedules, listBillingPlans } from "../../../../lib/operator-api";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus
} from "../../ui";

type PartnerAccountPageProps = {
  params: Promise<{ partnerAccountId: string }>;
};

function nextInvoiceStatuses(status: string): string[] {
  switch (status) {
    case "DRAFT":
      return ["FINALIZED", "VOID"];
    case "FINALIZED":
      return ["SENT", "PAID", "VOID"];
    case "SENT":
      return ["PAID", "DISPUTED", "VOID"];
    case "DISPUTED":
      return ["SENT", "PAID", "VOID"];
    default:
      return [];
  }
}

export default async function PartnerAccountPage(props: PartnerAccountPageProps) {
  const params = await props.params;
  const detail = await getPartnerAccount(params.partnerAccountId);
  const billingPlans = await listBillingPlans();
  const billingSchedules =
    detail.billing?.activeAssignment ?
      await listBillingFeeSchedules(detail.billing.activeAssignment.billingPlanId)
    : null;

  return (
    <>
      <ConsoleHeader
        eyebrow="Partner Detail"
        title={detail.partner.name}
        subtitle={`${detail.links.length} links, ${detail.apiKeys.length} API keys, ${detail.subscriptions.length} webhook subscriptions, ${detail.domains.length} tenant domains.`}
      />
      <div className="stack">
        <Card title="Partner">
          <div className="detail-grid">
            <div>
              <small className="muted">Slug</small>
              <div className="mono">{detail.partner.slug}</div>
            </div>
            <div>
              <small className="muted">Status</small>
              <div>
                <Pill tone={toneForStatus(detail.partner.status)} value={detail.partner.status} />
              </div>
            </div>
            <div>
              <small className="muted">Partner Id</small>
              <div className="mono">{detail.partner.id}</div>
            </div>
          </div>
        </Card>

        <div className="split-grid">
          <Card title="Tenant Settings">
            <form action={upsertTenantSettingsAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="displayName">Display Name</label>
                  <input defaultValue={detail.settings?.displayName ?? ""} id="displayName" name="displayName" />
                </div>
                <div className="field">
                  <label htmlFor="legalName">Legal Name</label>
                  <input defaultValue={detail.settings?.legalName ?? ""} id="legalName" name="legalName" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="supportEmail">Support Email</label>
                  <input defaultValue={detail.settings?.supportEmail ?? ""} id="supportEmail" name="supportEmail" />
                </div>
                <div className="field">
                  <label htmlFor="supportUrl">Support URL</label>
                  <input defaultValue={detail.settings?.supportUrl ?? ""} id="supportUrl" name="supportUrl" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="termsOfServiceUrl">Terms URL</label>
                  <input defaultValue={detail.settings?.termsOfServiceUrl ?? ""} id="termsOfServiceUrl" name="termsOfServiceUrl" />
                </div>
                <div className="field">
                  <label htmlFor="privacyPolicyUrl">Privacy URL</label>
                  <input defaultValue={detail.settings?.privacyPolicyUrl ?? ""} id="privacyPolicyUrl" name="privacyPolicyUrl" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="logoAssetId">Logo Asset Id</label>
                  <input defaultValue={detail.settings?.logoAssetId ?? ""} id="logoAssetId" name="logoAssetId" />
                </div>
                <div className="field">
                  <label htmlFor="faviconAssetId">Favicon Asset Id</label>
                  <input defaultValue={detail.settings?.faviconAssetId ?? ""} id="faviconAssetId" name="faviconAssetId" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="primaryColorHex">Primary</label>
                  <input defaultValue={detail.settings?.primaryColorHex ?? "#0b1020"} id="primaryColorHex" name="primaryColorHex" />
                </div>
                <div className="field">
                  <label htmlFor="accentColorHex">Accent</label>
                  <input defaultValue={detail.settings?.accentColorHex ?? "#d0ff5f"} id="accentColorHex" name="accentColorHex" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="backgroundColorHex">Background</label>
                  <input defaultValue={detail.settings?.backgroundColorHex ?? "#f5f1e8"} id="backgroundColorHex" name="backgroundColorHex" />
                </div>
                <div className="field">
                  <label htmlFor="textColorHex">Text</label>
                  <input defaultValue={detail.settings?.textColorHex ?? "#141414"} id="textColorHex" name="textColorHex" />
                </div>
              </div>
              <div className="actions-row">
                <button className="button" type="submit">Save Tenant Settings</button>
              </div>
            </form>
          </Card>

          <Card title="Brand Assets">
            <form action={registerPartnerBrandAssetAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="role">Role</label>
                <input id="role" name="role" placeholder="LOGO or FAVICON" />
              </div>
              <div className="field">
                <label htmlFor="originalFilename">Original Filename</label>
                <input id="originalFilename" name="originalFilename" />
              </div>
              <div className="field">
                <label htmlFor="mediaType">Media Type</label>
                <input id="mediaType" name="mediaType" placeholder="image/svg+xml" />
              </div>
              <div className="field">
                <label htmlFor="byteSize">Byte Size</label>
                <input id="byteSize" name="byteSize" />
              </div>
              <div className="field">
                <label htmlFor="sha256Hex">SHA-256</label>
                <input id="sha256Hex" name="sha256Hex" />
              </div>
              <div className="field">
                <label htmlFor="storageKey">Storage Key</label>
                <input id="storageKey" name="storageKey" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">Register Asset</button>
              </div>
            </form>
            {detail.brandAssets.length > 0 ? (
              <DataTable headers={["Role", "Filename", "Storage Key"]}>
                {detail.brandAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.role}</td>
                    <td>{asset.originalFilename}</td>
                    <td className="mono">{asset.storageKey}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState body="No brand assets registered." />
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title="Tenant Domains">
            <form action={createTenantDomainAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="hostname">Hostname</label>
                <input id="hostname" name="hostname" placeholder="tenant.example.com" />
              </div>
              <div className="field">
                <label htmlFor="surface">Surface</label>
                <input id="surface" name="surface" placeholder="ENTRYPOINT or HOSTED" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">Create Domain</button>
              </div>
            </form>
            {detail.domains.length === 0 ? (
              <EmptyState body="No tenant domains exist." />
            ) : (
              <DataTable headers={["Hostname", "Surface", "Status", "Actions"]}>
                {detail.domains.map((domain) => (
                  <tr key={domain.id}>
                    <td className="mono">{domain.hostname}</td>
                    <td>{domain.surface}</td>
                    <td>
                      <Pill tone={toneForStatus(domain.status)} value={domain.status} />
                    </td>
                    <td>
                      <div className="actions-row">
                        <form action={verifyTenantDomainAction}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="domainId" type="hidden" value={domain.id} />
                          <button className="button button-secondary" type="submit">Verify</button>
                        </form>
                        <form action={activateTenantDomainAction}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="domainId" type="hidden" value={domain.id} />
                          <button className="button button-secondary" type="submit">Activate</button>
                        </form>
                        <form action={disableTenantDomainAction}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="domainId" type="hidden" value={domain.id} />
                          <button className="button button-secondary" type="submit">Disable</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>

          <Card title="Billing Assignment">
            <form action={assignBillingPlanAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="billingPlanId">Billing Plan Id</label>
                <input id="billingPlanId" name="billingPlanId" defaultValue={detail.billing?.activeAssignment?.billingPlanId ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="billingFeeScheduleId">Fee Schedule Id</label>
                <input id="billingFeeScheduleId" name="billingFeeScheduleId" defaultValue={detail.billing?.activeAssignment?.billingFeeScheduleId ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="effectiveFrom">Effective From</label>
                <input id="effectiveFrom" name="effectiveFrom" placeholder="2026-05-01T00:00:00.000Z" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">Assign Billing Plan</button>
              </div>
            </form>
            <div className="detail-grid">
              <div>
                <small className="muted">Current Assignment</small>
                <div className="mono">{detail.billing?.activeAssignment?.id ?? "none"}</div>
              </div>
              <div>
                <small className="muted">Plan Id</small>
                <div className="mono">
                  {detail.billing?.activeAssignment?.billingPlanId ?? "none"}
                </div>
              </div>
              <div>
                <small className="muted">Fee Schedule Id</small>
                <div className="mono">
                  {detail.billing?.activeAssignment?.billingFeeScheduleId ?? "none"}
                </div>
              </div>
              <div>
                <small className="muted">Current Usage Metrics</small>
                <div>{detail.billing?.currentUsage?.metrics.length ?? 0}</div>
              </div>
            </div>
            {billingPlans.billingPlans.length > 0 ? (
              <DataTable headers={["Plan", "Plan Id", "Base Fee", "Status"]}>
                {billingPlans.billingPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.displayName}</td>
                    <td className="mono">{plan.id}</td>
                    <td>{plan.baseMonthlyFeeMinor}</td>
                    <td>
                      <Pill tone={toneForStatus(plan.status)} value={plan.status} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState body="No billing plans are available yet." />
            )}
            {billingSchedules?.billingFeeSchedules.length ? (
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
                {billingSchedules.billingFeeSchedules.flatMap((schedule) =>
                  schedule.tiers.map((tier) => (
                    <tr key={tier.id}>
                      <td className="mono">{schedule.id}</td>
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
            ) : null}
          </Card>
        </div>

        <Card title="Usage and Invoices">
          <div className="split-grid">
            <div>
              <h3>Current Period Usage</h3>
              {detail.billing?.currentUsage?.metrics.length ? (
                <DataTable headers={["Metric", "Count"]}>
                  {detail.billing.currentUsage.metrics.map((metric) => (
                    <tr key={metric.metric}>
                      <td>{metric.metric}</td>
                      <td>{metric.count}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState body="No current-period usage has been metered." />
              )}
              {detail.billing?.currentUsage ? (
                <p className="muted mono">
                  {detail.billing.currentUsage.periodStart} to {detail.billing.currentUsage.periodEnd}
                </p>
              ) : null}
            </div>
            <div>
              <h3>Previous Period Usage</h3>
              {detail.billing?.previousUsage?.metrics.length ? (
                <DataTable headers={["Metric", "Count"]}>
                  {detail.billing.previousUsage.metrics.map((metric) => (
                    <tr key={metric.metric}>
                      <td>{metric.metric}</td>
                      <td>{metric.count}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState body="No previous-period usage has been metered." />
              )}
              {detail.billing?.previousUsage ? (
                <p className="muted mono">
                  {detail.billing.previousUsage.periodStart} to {detail.billing.previousUsage.periodEnd}
                </p>
              ) : null}
            </div>
          </div>
          {detail.billing?.recentInvoices.length ? (
            <DataTable headers={["Invoice", "Period", "Status", "Total", "Actions"]}>
              {detail.billing.recentInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.id}</td>
                  <td className="mono">
                    {invoice.periodStart.slice(0, 10)} to {invoice.periodEnd.slice(0, 10)}
                  </td>
                  <td>
                    <Pill tone={toneForStatus(invoice.status)} value={invoice.status} />
                  </td>
                  <td>{invoice.totalMinor}</td>
                  <td>
                    <div className="actions-row">
                      {nextInvoiceStatuses(invoice.status).map((status) => (
                        <form action={updateInvoiceStatusAction} key={`${invoice.id}:${status}`}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="invoiceId" type="hidden" value={invoice.id} />
                          <input name="status" type="hidden" value={status} />
                          <button className="button button-secondary" type="submit">
                            {status}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState body="No invoices have been generated for this tenant yet." />
          )}
        </Card>

        <div className="split-grid">
          <Card title="Create Organization Link">
            <form action={createPartnerOrganizationLinkAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="organizationId">Organization Id</label>
                <input id="organizationId" name="organizationId" />
              </div>
              <div className="field">
                <label htmlFor="actingUserId">Acting User Id</label>
                <input id="actingUserId" name="actingUserId" />
              </div>
              <div className="field">
                <label htmlFor="actingWalletId">Acting Wallet Id</label>
                <input id="actingWalletId" name="actingWalletId" />
              </div>
              <div className="field">
                <label htmlFor="externalReference">External Reference</label>
                <input id="externalReference" name="externalReference" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Create Link
                </button>
              </div>
            </form>
          </Card>
          <Card title="Links">
            {detail.links.length === 0 ? (
              <EmptyState body="No organization links exist yet." />
            ) : (
              <DataTable headers={["Organization", "Wallet", "Status", "Link Id"]}>
                {detail.links.map((link) => (
                  <tr key={link.id}>
                    <td className="mono">{link.organizationId}</td>
                    <td className="mono">{link.actingWalletId}</td>
                    <td>
                      <Pill tone={toneForStatus(link.status)} value={link.status} />
                    </td>
                    <td className="mono">{link.id}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title="Create API Key">
            <form action={createPartnerApiKeyAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="partnerOrganizationLinkId">Partner Link Id</label>
                <input id="partnerOrganizationLinkId" name="partnerOrganizationLinkId" />
              </div>
              <div className="field">
                <label htmlFor="displayName">Display Name</label>
                <input id="displayName" name="displayName" />
              </div>
              <div className="field">
                <label htmlFor="expiresAt">Expires At</label>
                <input id="expiresAt" name="expiresAt" placeholder="2026-05-01T00:00:00.000Z" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Issue Key
                </button>
              </div>
            </form>
          </Card>
          <Card title="API Keys">
            {detail.apiKeys.length === 0 ? (
              <EmptyState body="No API keys have been issued." />
            ) : (
              <DataTable headers={["Name", "Status", "Scopes", "Revoke"]}>
                {detail.apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td>
                      <div>{apiKey.displayName}</div>
                      <div className="mono">{apiKey.keyPrefix}</div>
                    </td>
                    <td>
                      <Pill tone={toneForStatus(apiKey.status)} value={apiKey.status} />
                    </td>
                    <td>{apiKey.scopes.join(", ")}</td>
                    <td>
                      <form action={revokePartnerApiKeyAction}>
                        <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                        <input name="partnerApiKeyId" type="hidden" value={apiKey.id} />
                        <button className="button button-secondary" type="submit">
                          Revoke
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title="Create Webhook Subscription">
            <form action={createPartnerWebhookSubscriptionAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="subscriptionLinkId">Partner Link Id</label>
                <input id="subscriptionLinkId" name="partnerOrganizationLinkId" />
              </div>
              <div className="field">
                <label htmlFor="subscriptionName">Display Name</label>
                <input id="subscriptionName" name="displayName" />
              </div>
              <div className="field">
                <label htmlFor="endpointUrl">Endpoint URL</label>
                <input id="endpointUrl" name="endpointUrl" />
              </div>
              <div className="field">
                <label htmlFor="eventTypes">Event Types</label>
                <textarea
                  id="eventTypes"
                  name="eventTypes"
                  placeholder="draft.deal.created, funding.transaction.updated"
                />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Create Subscription
                </button>
              </div>
            </form>
          </Card>
          <Card title="Subscriptions">
            {detail.subscriptions.length === 0 ? (
              <EmptyState body="No webhook subscriptions exist." />
            ) : (
              <DataTable headers={["Subscription", "Status", "Rotate Secret", "Pause/Resume"]}>
                {detail.subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>
                      <div>{subscription.displayName}</div>
                      <div className="mono">{subscription.endpointUrl}</div>
                    </td>
                    <td>
                      <Pill tone={toneForStatus(subscription.status)} value={subscription.status} />
                    </td>
                    <td>
                      <form action={rotatePartnerWebhookSubscriptionSecretAction}>
                        <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                        <input
                          name="partnerWebhookSubscriptionId"
                          type="hidden"
                          value={subscription.id}
                        />
                        <button className="button button-secondary" type="submit">
                          Rotate
                        </button>
                      </form>
                    </td>
                    <td>
                      <form action={updatePartnerWebhookSubscriptionAction}>
                        <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                        <input
                          name="partnerWebhookSubscriptionId"
                          type="hidden"
                          value={subscription.id}
                        />
                        <input
                          name="status"
                          type="hidden"
                          value={subscription.status === "ACTIVE" ? "PAUSED" : "ACTIVE"}
                        />
                        <button className="button button-secondary" type="submit">
                          {subscription.status === "ACTIVE" ? "Pause" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <Card title="Hosted Sessions and Deliveries">
          <div className="split-grid">
            <div>
              <h3>Hosted Sessions</h3>
              {detail.hostedSessions.length === 0 ? (
                <EmptyState body="No hosted sessions have been created." />
              ) : (
                <DataTable headers={["Type", "Status", "Expires"]}>
                  {detail.hostedSessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.type}</td>
                      <td>
                        <Pill tone={toneForStatus(session.status)} value={session.status} />
                      </td>
                      <td className="mono">{session.expiresAt}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
            <div>
              <h3>Recent Deliveries</h3>
              {detail.recentDeliveries.length === 0 ? (
                <EmptyState body="No webhook deliveries have been recorded." />
              ) : (
                <DataTable headers={["Event", "Status", "Last Attempt"]}>
                  {detail.recentDeliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>{delivery.eventType}</td>
                      <td>
                        <Pill tone={toneForStatus(delivery.status)} value={delivery.status} />
                      </td>
                      <td className="mono">{delivery.lastAttemptAt ?? delivery.createdAt}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
