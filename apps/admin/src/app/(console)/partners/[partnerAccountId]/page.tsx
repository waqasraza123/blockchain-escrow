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
import { formatCode } from "../../../../lib/i18n/format";
import { getI18n } from "../../../../lib/i18n/server";
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
  const { messages } = await getI18n();
  const detail = await getPartnerAccount(params.partnerAccountId);
  const billingPlans = await listBillingPlans();
  const billingSchedules =
    detail.billing?.activeAssignment ?
      await listBillingFeeSchedules(detail.billing.activeAssignment.billingPlanId)
    : null;
  const invoiceHeaders = [
    messages.partners.invoiceId,
    messages.billing.period,
    messages.billing.status,
    messages.billing.total,
    messages.partners.invoiceActions
  ];

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.partners.detailEyebrow}
        title={detail.partner.name}
        subtitle={`${detail.links.length} ${messages.partners.partnerSummary}`}
      />
      <div className="stack">
        <Card title={messages.partners.partner}>
          <div className="detail-grid">
            <div>
              <small className="muted">{messages.partners.slug}</small>
              <div className="mono">{detail.partner.slug}</div>
            </div>
            <div>
              <small className="muted">{messages.partners.status}</small>
              <div>
                <Pill
                  tone={toneForStatus(detail.partner.status)}
                  value={formatCode(detail.partner.status, messages.statuses, messages.common.none)}
                />
              </div>
            </div>
            <div>
              <small className="muted">{messages.partners.partnerId}</small>
              <div className="mono">{detail.partner.id}</div>
            </div>
          </div>
        </Card>

        <div className="split-grid">
          <Card title={messages.partners.settings}>
            <form action={upsertTenantSettingsAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="displayName">{messages.partners.displayName}</label>
                  <input defaultValue={detail.settings?.displayName ?? ""} id="displayName" name="displayName" />
                </div>
                <div className="field">
                  <label htmlFor="legalName">{messages.partners.legalName}</label>
                  <input defaultValue={detail.settings?.legalName ?? ""} id="legalName" name="legalName" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="supportEmail">{messages.partners.supportEmail}</label>
                  <input defaultValue={detail.settings?.supportEmail ?? ""} id="supportEmail" name="supportEmail" />
                </div>
                <div className="field">
                  <label htmlFor="supportUrl">{messages.partners.supportUrl}</label>
                  <input defaultValue={detail.settings?.supportUrl ?? ""} id="supportUrl" name="supportUrl" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="termsOfServiceUrl">{messages.partners.termsUrl}</label>
                  <input defaultValue={detail.settings?.termsOfServiceUrl ?? ""} id="termsOfServiceUrl" name="termsOfServiceUrl" />
                </div>
                <div className="field">
                  <label htmlFor="privacyPolicyUrl">{messages.partners.privacyUrl}</label>
                  <input defaultValue={detail.settings?.privacyPolicyUrl ?? ""} id="privacyPolicyUrl" name="privacyPolicyUrl" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="logoAssetId">{messages.partners.logoAssetId}</label>
                  <input defaultValue={detail.settings?.logoAssetId ?? ""} id="logoAssetId" name="logoAssetId" />
                </div>
                <div className="field">
                  <label htmlFor="faviconAssetId">{messages.partners.faviconAssetId}</label>
                  <input defaultValue={detail.settings?.faviconAssetId ?? ""} id="faviconAssetId" name="faviconAssetId" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="primaryColorHex">{messages.partners.primary}</label>
                  <input defaultValue={detail.settings?.primaryColorHex ?? "#0b1020"} id="primaryColorHex" name="primaryColorHex" />
                </div>
                <div className="field">
                  <label htmlFor="accentColorHex">{messages.partners.accent}</label>
                  <input defaultValue={detail.settings?.accentColorHex ?? "#d0ff5f"} id="accentColorHex" name="accentColorHex" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="backgroundColorHex">{messages.partners.background}</label>
                  <input defaultValue={detail.settings?.backgroundColorHex ?? "#f5f1e8"} id="backgroundColorHex" name="backgroundColorHex" />
                </div>
                <div className="field">
                  <label htmlFor="textColorHex">{messages.partners.text}</label>
                  <input defaultValue={detail.settings?.textColorHex ?? "#141414"} id="textColorHex" name="textColorHex" />
                </div>
              </div>
              <div className="actions-row">
                <button className="button" type="submit">{messages.partners.saveTenantSettings}</button>
              </div>
            </form>
          </Card>

          <Card title={messages.partners.brandAssets}>
            <form action={registerPartnerBrandAssetAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="role">{messages.partners.role}</label>
                <input id="role" name="role" placeholder="LOGO / FAVICON" />
              </div>
              <div className="field">
                <label htmlFor="originalFilename">{messages.partners.originalFilename}</label>
                <input id="originalFilename" name="originalFilename" />
              </div>
              <div className="field">
                <label htmlFor="mediaType">{messages.partners.mediaType}</label>
                <input id="mediaType" name="mediaType" placeholder="image/svg+xml" />
              </div>
              <div className="field">
                <label htmlFor="byteSize">{messages.partners.byteSize}</label>
                <input id="byteSize" name="byteSize" />
              </div>
              <div className="field">
                <label htmlFor="sha256Hex">{messages.partners.sha256}</label>
                <input id="sha256Hex" name="sha256Hex" />
              </div>
              <div className="field">
                <label htmlFor="storageKey">{messages.partners.storageKey}</label>
                <input id="storageKey" name="storageKey" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">{messages.partners.registerAsset}</button>
              </div>
            </form>
            {detail.brandAssets.length > 0 ? (
              <DataTable headers={[messages.partners.role, messages.partners.filename, messages.partners.storageKey]}>
                {detail.brandAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.role}</td>
                    <td>{asset.originalFilename}</td>
                    <td className="mono">{asset.storageKey}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState body={messages.partners.noAssets} />
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title={messages.partners.domains}>
            <form action={createTenantDomainAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="hostname">{messages.partners.hostname}</label>
                <input id="hostname" name="hostname" placeholder="tenant.example.com" />
              </div>
              <div className="field">
                <label htmlFor="surface">{messages.partners.surface}</label>
                <input id="surface" name="surface" placeholder="ENTRYPOINT / HOSTED" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">{messages.partners.createDomain}</button>
              </div>
            </form>
            {detail.domains.length === 0 ? (
              <EmptyState body={messages.partners.noDomains} />
            ) : (
              <DataTable
                headers={[
                  messages.partners.hostname,
                  messages.partners.surface,
                  messages.partners.status,
                  messages.partners.actions
                ]}
              >
                {detail.domains.map((domain) => (
                  <tr key={domain.id}>
                    <td className="mono">{domain.hostname}</td>
                    <td>{domain.surface}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(domain.status)}
                        value={formatCode(domain.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                    <td>
                      <div className="actions-row">
                        <form action={verifyTenantDomainAction}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="domainId" type="hidden" value={domain.id} />
                          <button className="button button-secondary" type="submit">
                            {messages.partners.verify}
                          </button>
                        </form>
                        <form action={activateTenantDomainAction}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="domainId" type="hidden" value={domain.id} />
                          <button className="button button-secondary" type="submit">{messages.partners.activate}</button>
                        </form>
                        <form action={disableTenantDomainAction}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="domainId" type="hidden" value={domain.id} />
                          <button className="button button-secondary" type="submit">{messages.partners.disable}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>

          <Card title={messages.partners.billingAssignment}>
            <form action={assignBillingPlanAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="billingPlanId">{messages.billing.billingPlanId}</label>
                <input id="billingPlanId" name="billingPlanId" defaultValue={detail.billing?.activeAssignment?.billingPlanId ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="billingFeeScheduleId">{messages.billing.feeScheduleId}</label>
                <input id="billingFeeScheduleId" name="billingFeeScheduleId" defaultValue={detail.billing?.activeAssignment?.billingFeeScheduleId ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="effectiveFrom">{messages.billing.effectiveFrom}</label>
                <input id="effectiveFrom" name="effectiveFrom" placeholder="2026-05-01T00:00:00.000Z" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">{messages.partners.assignPlan}</button>
              </div>
            </form>
            <div className="detail-grid">
              <div>
                <small className="muted">{messages.partners.activeAssignment}</small>
                <div className="mono">{detail.billing?.activeAssignment?.id ?? messages.common.none}</div>
              </div>
              <div>
                <small className="muted">{messages.partners.planId}</small>
                <div className="mono">
                  {detail.billing?.activeAssignment?.billingPlanId ?? messages.common.none}
                </div>
              </div>
              <div>
                <small className="muted">{messages.partners.feeScheduleId}</small>
                <div className="mono">
                  {detail.billing?.activeAssignment?.billingFeeScheduleId ?? messages.common.none}
                </div>
              </div>
              <div>
                <small className="muted">{messages.billing.currentUsageMetrics}</small>
                <div>{detail.billing?.currentUsage?.metrics.length ?? 0}</div>
              </div>
            </div>
            {billingPlans.billingPlans.length > 0 ? (
              <DataTable
                headers={[
                  messages.billing.plan,
                  messages.billing.planId,
                  messages.billing.baseFee,
                  messages.billing.status
                ]}
              >
                {billingPlans.billingPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td>{plan.displayName}</td>
                    <td className="mono">{plan.id}</td>
                    <td>{plan.baseMonthlyFeeMinor}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(plan.status)}
                        value={formatCode(plan.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState body={messages.partners.noPlans} />
            )}
            {billingSchedules?.billingFeeSchedules.length ? (
              <DataTable
                headers={[
                  messages.partners.scheduleId,
                  messages.billing.effectiveFrom,
                  messages.billing.metric,
                  messages.billing.included,
                  messages.billing.starts,
                  messages.billing.upTo,
                  messages.billing.unitPrice
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
                      <td>{tier.upToUnit ?? messages.common.unbounded}</td>
                      <td>{tier.unitPriceMinor}</td>
                    </tr>
                  ))
                )}
              </DataTable>
            ) : null}
          </Card>
        </div>

        <Card title={messages.partners.invoices}>
          <div className="split-grid">
            <div>
              <h3>{messages.partners.currentPeriodUsage}</h3>
              {detail.billing?.currentUsage?.metrics.length ? (
                <DataTable headers={[messages.partners.metric, messages.billing.count]}>
                  {detail.billing.currentUsage.metrics.map((metric) => (
                    <tr key={metric.metric}>
                      <td>{metric.metric}</td>
                      <td>{metric.count}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState body={messages.partners.noUsage} />
              )}
              {detail.billing?.currentUsage ? (
                <p className="muted mono">
                  {detail.billing.currentUsage.periodStart} to {detail.billing.currentUsage.periodEnd}
                </p>
              ) : null}
            </div>
            <div>
              <h3>{messages.partners.previousPeriodUsage}</h3>
              {detail.billing?.previousUsage?.metrics.length ? (
                <DataTable headers={[messages.partners.metric, messages.billing.count]}>
                  {detail.billing.previousUsage.metrics.map((metric) => (
                    <tr key={metric.metric}>
                      <td>{metric.metric}</td>
                      <td>{metric.count}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <EmptyState body={messages.partners.noPreviousUsage} />
              )}
              {detail.billing?.previousUsage ? (
                <p className="muted mono">
                  {detail.billing.previousUsage.periodStart} to {detail.billing.previousUsage.periodEnd}
                </p>
              ) : null}
            </div>
          </div>
          {detail.billing?.recentInvoices.length ? (
            <DataTable headers={invoiceHeaders}>
              {detail.billing.recentInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.id}</td>
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
                  <td>
                    <div className="actions-row">
                      {nextInvoiceStatuses(invoice.status).map((status) => (
                        <form action={updateInvoiceStatusAction} key={`${invoice.id}:${status}`}>
                          <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                          <input name="invoiceId" type="hidden" value={invoice.id} />
                          <input name="status" type="hidden" value={status} />
                          <button className="button button-secondary" type="submit">
                            {formatCode(status, messages.statuses, messages.common.none)}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <EmptyState body={messages.partners.noInvoices} />
          )}
        </Card>

        <div className="split-grid">
          <Card title={messages.partners.createOrganizationLink}>
            <form action={createPartnerOrganizationLinkAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="organizationId">{messages.partners.organizationId}</label>
                <input id="organizationId" name="organizationId" />
              </div>
              <div className="field">
                <label htmlFor="actingUserId">{messages.partners.actingUserId}</label>
                <input id="actingUserId" name="actingUserId" />
              </div>
              <div className="field">
                <label htmlFor="actingWalletId">{messages.partners.actingWalletId}</label>
                <input id="actingWalletId" name="actingWalletId" />
              </div>
              <div className="field">
                <label htmlFor="externalReference">{messages.partners.externalReference}</label>
                <input id="externalReference" name="externalReference" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.partners.createLink}
                </button>
              </div>
            </form>
          </Card>
          <Card title={messages.partners.links}>
            {detail.links.length === 0 ? (
              <EmptyState body={messages.partners.noLinks} />
            ) : (
              <DataTable
                headers={[
                  messages.partners.organization,
                  messages.partners.wallet,
                  messages.partners.status,
                  messages.partners.linkId
                ]}
              >
                {detail.links.map((link) => (
                  <tr key={link.id}>
                    <td className="mono">{link.organizationId}</td>
                    <td className="mono">{link.actingWalletId}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(link.status)}
                        value={formatCode(link.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                    <td className="mono">{link.id}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title={messages.partners.createApiKey}>
            <form action={createPartnerApiKeyAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="partnerOrganizationLinkId">{messages.partners.partnerLinkId}</label>
                <input id="partnerOrganizationLinkId" name="partnerOrganizationLinkId" />
              </div>
              <div className="field">
                <label htmlFor="displayName">{messages.partners.displayName}</label>
                <input id="displayName" name="displayName" />
              </div>
              <div className="field">
                <label htmlFor="expiresAt">{messages.partners.expiresAt}</label>
                <input id="expiresAt" name="expiresAt" placeholder="2026-05-01T00:00:00.000Z" />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.partners.issueKey}
                </button>
              </div>
            </form>
          </Card>
          <Card title={messages.partners.apiKeys}>
            {detail.apiKeys.length === 0 ? (
              <EmptyState body={messages.partners.noApiKeys} />
            ) : (
              <DataTable
                headers={[
                  messages.partners.name,
                  messages.partners.status,
                  messages.partners.scopes,
                  messages.partners.revoke
                ]}
              >
                {detail.apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td>
                      <div>{apiKey.displayName}</div>
                      <div className="mono">{apiKey.keyPrefix}</div>
                    </td>
                    <td>
                      <Pill
                        tone={toneForStatus(apiKey.status)}
                        value={formatCode(apiKey.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                    <td>{apiKey.scopes.join(", ")}</td>
                    <td>
                      <form action={revokePartnerApiKeyAction}>
                        <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
                        <input name="partnerApiKeyId" type="hidden" value={apiKey.id} />
                        <button className="button button-secondary" type="submit">
                          {messages.partners.revoke}
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
          <Card title={messages.partners.createWebhookSubscription}>
            <form action={createPartnerWebhookSubscriptionAction} className="form-grid">
              <input name="partnerAccountId" type="hidden" value={detail.partner.id} />
              <div className="field">
                <label htmlFor="subscriptionLinkId">{messages.partners.partnerLinkId}</label>
                <input id="subscriptionLinkId" name="partnerOrganizationLinkId" />
              </div>
              <div className="field">
                <label htmlFor="subscriptionName">{messages.partners.displayName}</label>
                <input id="subscriptionName" name="displayName" />
              </div>
              <div className="field">
                <label htmlFor="endpointUrl">{messages.partners.endpointUrl}</label>
                <input id="endpointUrl" name="endpointUrl" />
              </div>
              <div className="field">
                <label htmlFor="eventTypes">{messages.partners.eventTypes}</label>
                <textarea
                  id="eventTypes"
                  name="eventTypes"
                  placeholder="draft.deal.created, funding.transaction.updated"
                />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.partners.createSubscription}
                </button>
              </div>
            </form>
          </Card>
          <Card title={messages.partners.subscriptions}>
            {detail.subscriptions.length === 0 ? (
              <EmptyState body={messages.partners.noSubscriptions} />
            ) : (
              <DataTable
                headers={[
                  messages.partners.subscription,
                  messages.partners.status,
                  messages.partners.rotateSecret,
                  messages.partners.pauseResume
                ]}
              >
                {detail.subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>
                      <div>{subscription.displayName}</div>
                      <div className="mono">{subscription.endpointUrl}</div>
                    </td>
                    <td>
                      <Pill
                        tone={toneForStatus(subscription.status)}
                        value={formatCode(
                          subscription.status,
                          messages.statuses,
                          messages.common.none
                        )}
                      />
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
                          {messages.partners.rotate}
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
                          {subscription.status === "ACTIVE"
                            ? messages.partners.pause
                            : messages.partners.activate}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <Card title={messages.partners.hostedAndDeliveries}>
          <div className="split-grid">
            <div>
              <h3>{messages.partners.hostedSessionsTitle}</h3>
              {detail.hostedSessions.length === 0 ? (
                <EmptyState body={messages.partners.noHostedSessions} />
              ) : (
                <DataTable
                  headers={[
                    messages.partners.type,
                    messages.partners.status,
                    messages.partners.expiresAt
                  ]}
                >
                  {detail.hostedSessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.type}</td>
                      <td>
                        <Pill
                          tone={toneForStatus(session.status)}
                          value={formatCode(session.status, messages.statuses, messages.common.none)}
                        />
                      </td>
                      <td className="mono">{session.expiresAt}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </div>
            <div>
              <h3>{messages.partners.recentDeliveries}</h3>
              {detail.recentDeliveries.length === 0 ? (
                <EmptyState body={messages.partners.noDeliveries} />
              ) : (
                <DataTable
                  headers={[
                    messages.partners.eventTypes,
                    messages.partners.status,
                    messages.partners.lastAttempt
                  ]}
                >
                  {detail.recentDeliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>{delivery.eventType}</td>
                      <td>
                        <Pill
                          tone={toneForStatus(delivery.status)}
                          value={formatCode(delivery.status, messages.statuses, messages.common.none)}
                        />
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
