import { getOrganizationPartnerOverview } from "../../../../../lib/api";
import { formatCode } from "../../../../../lib/i18n/format";
import { getI18n } from "../../../../../lib/i18n/server";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  WorkspaceHeader,
  toneForStatus
} from "../../../ui";

type IntegrationsPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function IntegrationsPage(props: IntegrationsPageProps) {
  const params = await props.params;
  const { messages } = await getI18n();
  const overview = await getOrganizationPartnerOverview(params.organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.navigation.integrations}
        title={messages.integrations.partnerIntegrations}
        subtitle={messages.integrations.subtitle}
      />
      <div className="stack">
        <Card title={messages.integrations.linkedPartners}>
          {overview.partners.length === 0 ? (
            <EmptyState body={messages.integrations.noLinkedPartners} />
          ) : (
            <DataTable
              headers={[
                messages.integrations.name,
                messages.integrations.slug,
                messages.integrations.status,
                messages.integrations.brand
              ]}
            >
              {overview.partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name}</td>
                  <td className="mono">{partner.slug}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(partner.status)}
                      value={formatCode(partner.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td>
                    {overview.settings.find((setting) => setting.partnerAccountId === partner.id)
                      ?.displayName ?? messages.common.notConfigured}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card title={messages.integrations.domains}>
          {overview.domains.length === 0 ? (
            <EmptyState body={messages.integrations.noDomains} />
          ) : (
            <DataTable
              headers={[
                "Hostname",
                messages.integrations.surface,
                messages.integrations.status
              ]}
            >
              {overview.domains.map((domain) => (
                <tr key={domain.id}>
                  <td className="mono">{domain.hostname}</td>
                  <td>{formatCode(domain.surface, messages.codes.surfaces, messages.common.none)}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(domain.status)}
                      value={formatCode(domain.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <div className="split-grid">
          <Card title={messages.integrations.apiKeys}>
            {overview.apiKeys.length === 0 ? (
              <EmptyState body={messages.integrations.noApiKeys} />
            ) : (
              <DataTable
                headers={[
                  messages.integrations.displayName,
                  messages.integrations.prefix,
                  messages.integrations.status
                ]}
              >
                {overview.apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td>{apiKey.displayName}</td>
                    <td className="mono">{apiKey.keyPrefix}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(apiKey.status)}
                        value={formatCode(apiKey.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>

          <Card title={messages.integrations.webhookSubscriptions}>
            {overview.subscriptions.length === 0 ? (
              <EmptyState body={messages.integrations.noSubscriptions} />
            ) : (
              <DataTable
                headers={[
                  messages.integrations.name,
                  messages.integrations.status,
                  messages.integrations.lastDelivery
                ]}
              >
                {overview.subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>{subscription.displayName}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(subscription.status)}
                        value={formatCode(subscription.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                    <td className="mono">{subscription.lastDeliveryAt ?? messages.common.never}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title={messages.integrations.hostedSessions}>
            {overview.hostedSessions.length === 0 ? (
              <EmptyState body={messages.integrations.noHostedSessions} />
            ) : (
              <DataTable
                headers={[
                  messages.integrations.type,
                  messages.integrations.status,
                  messages.integrations.expires
                ]}
              >
                {overview.hostedSessions.map((session) => (
                  <tr key={session.id}>
                    <td>{formatCode(session.type, messages.codes.hostedSessionTypes, messages.common.none)}</td>
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
          </Card>

          <Card title={messages.integrations.recentDeliveries}>
            {overview.recentDeliveries.length === 0 ? (
              <EmptyState body={messages.integrations.noDeliveries} />
            ) : (
              <DataTable headers={[messages.integrations.event, messages.integrations.status, "Attempted"]}>
                {overview.recentDeliveries.map((delivery) => (
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
          </Card>
        </div>

        <Card title={messages.integrations.billingInvoices}>
          {overview.billing.length === 0 ||
          overview.billing.every((entry) => entry.recentInvoices.length === 0) ? (
            <EmptyState body={messages.integrations.noBilling} />
          ) : (
            <DataTable
              headers={[
                messages.integrations.tenant,
                messages.integrations.invoice,
                messages.integrations.status,
                messages.integrations.total
              ]}
            >
              {overview.billing.flatMap((entry) =>
                entry.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="mono">{entry.partnerAccountId}</td>
                    <td className="mono">{invoice.id}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(invoice.status)}
                        value={formatCode(invoice.status, messages.statuses, messages.common.none)}
                      />
                    </td>
                    <td>{invoice.totalMinor}</td>
                  </tr>
                ))
              )}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
