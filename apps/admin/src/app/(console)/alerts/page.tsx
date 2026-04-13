import { listAlerts } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { acknowledgeAlertAction, resolveAlertAction } from "../actions";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus
} from "../ui";

export default async function AlertsPage() {
  const { messages } = await getI18n();
  const alerts = await listAlerts();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.alerts.compliance}
        subtitle={messages.alerts.subtitle}
        title={messages.alerts.title}
      />
      <Card title={messages.alerts.queue}>
        {alerts.alerts.length === 0 ? (
          <EmptyState body={messages.alerts.empty} />
        ) : (
          <DataTable headers={[messages.alerts.kind, messages.alerts.status, messages.alerts.subject, messages.alerts.chain, messages.alerts.updated, messages.alerts.actions]}>
            {alerts.alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.kind}</td>
                <td>
                  <Pill
                    tone={toneForStatus(alert.status)}
                    value={formatCode(alert.status, messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{alert.subject.label ?? alert.subject.subjectId}</td>
                <td>
                  {alert.subject.chainId !== null
                    ? `${alert.subject.network ?? messages.common.none} (${alert.subject.chainId})`
                    : messages.common.na}
                </td>
                <td className="mono">{alert.lastDetectedAt}</td>
                <td>
                  <div className="actions-row">
                    <form action={acknowledgeAlertAction}>
                      <input name="alertId" type="hidden" value={alert.id} />
                      <input name="note" placeholder={messages.alerts.acknowledgemNote} />
                      <button className="button button-secondary" type="submit">
                        {messages.alerts.acknowledge}
                      </button>
                    </form>
                    <form action={resolveAlertAction}>
                      <input name="alertId" type="hidden" value={alert.id} />
                      <input name="note" placeholder={messages.alerts.resolutionNote} />
                      <button className="button" type="submit">
                        {messages.alerts.resolve}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
