import {
  createPartnerApiKeyAction,
  createPartnerOrganizationLinkAction,
  createPartnerWebhookSubscriptionAction,
  revokePartnerApiKeyAction,
  rotatePartnerWebhookSubscriptionSecretAction,
  updatePartnerWebhookSubscriptionAction
} from "../../actions";
import { getPartnerAccount } from "../../../../lib/operator-api";
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

export default async function PartnerAccountPage(props: PartnerAccountPageProps) {
  const params = await props.params;
  const detail = await getPartnerAccount(params.partnerAccountId);

  return (
    <>
      <ConsoleHeader
        eyebrow="Partner Detail"
        title={detail.partner.name}
        subtitle={`${detail.links.length} links, ${detail.apiKeys.length} API keys, ${detail.subscriptions.length} webhook subscriptions.`}
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
