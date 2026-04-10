import { getOrganizationPartnerOverview } from "../../../../../lib/api";
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
  const overview = await getOrganizationPartnerOverview(params.organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Integrations"
        title="Partner Integrations"
        subtitle="Read-only visibility into linked partners, issued keys, hosted sessions, and webhook delivery health."
      />
      <div className="stack">
        <Card title="Linked Partners">
          {overview.partners.length === 0 ? (
            <EmptyState body="No linked partner accounts exist for this organization." />
          ) : (
            <DataTable headers={["Name", "Slug", "Status"]}>
              {overview.partners.map((partner) => (
                <tr key={partner.id}>
                  <td>{partner.name}</td>
                  <td className="mono">{partner.slug}</td>
                  <td>
                    <Pill tone={toneForStatus(partner.status)} value={partner.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <div className="split-grid">
          <Card title="API Keys">
            {overview.apiKeys.length === 0 ? (
              <EmptyState body="No partner API keys have been issued." />
            ) : (
              <DataTable headers={["Display Name", "Prefix", "Status"]}>
                {overview.apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td>{apiKey.displayName}</td>
                    <td className="mono">{apiKey.keyPrefix}</td>
                    <td>
                      <Pill tone={toneForStatus(apiKey.status)} value={apiKey.status} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>

          <Card title="Webhook Subscriptions">
            {overview.subscriptions.length === 0 ? (
              <EmptyState body="No webhook subscriptions exist." />
            ) : (
              <DataTable headers={["Name", "Status", "Last Delivery"]}>
                {overview.subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>{subscription.displayName}</td>
                    <td>
                      <Pill tone={toneForStatus(subscription.status)} value={subscription.status} />
                    </td>
                    <td className="mono">{subscription.lastDeliveryAt ?? "never"}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Card>
        </div>

        <div className="split-grid">
          <Card title="Hosted Sessions">
            {overview.hostedSessions.length === 0 ? (
              <EmptyState body="No hosted sessions have been launched." />
            ) : (
              <DataTable headers={["Type", "Status", "Expires"]}>
                {overview.hostedSessions.map((session) => (
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
          </Card>

          <Card title="Recent Deliveries">
            {overview.recentDeliveries.length === 0 ? (
              <EmptyState body="No partner webhook deliveries have been recorded." />
            ) : (
              <DataTable headers={["Event", "Status", "Attempted"]}>
                {overview.recentDeliveries.map((delivery) => (
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
          </Card>
        </div>
      </div>
    </>
  );
}
