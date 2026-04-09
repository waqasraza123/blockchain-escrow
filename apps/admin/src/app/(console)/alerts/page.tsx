import { listAlerts } from "../../../lib/operator-api";
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
  const alerts = await listAlerts();

  return (
    <>
      <ConsoleHeader
        eyebrow="Compliance"
        subtitle="Deterministic worker alerts for transaction drift, stale queues, disputes, and service signals."
        title="Operator Alerts"
      />
      <Card title="Alerts Queue">
        {alerts.alerts.length === 0 ? (
          <EmptyState body="No alerts are currently stored." />
        ) : (
          <DataTable headers={["Kind", "Status", "Subject", "Updated", "Actions"]}>
            {alerts.alerts.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.kind}</td>
                <td>
                  <Pill tone={toneForStatus(alert.status)} value={alert.status} />
                </td>
                <td>{alert.subject.label ?? alert.subject.subjectId}</td>
                <td className="mono">{alert.lastDetectedAt}</td>
                <td>
                  <div className="actions-row">
                    <form action={acknowledgeAlertAction}>
                      <input name="alertId" type="hidden" value={alert.id} />
                      <input name="note" placeholder="ack note" />
                      <button className="button button-secondary" type="submit">
                        Acknowledge
                      </button>
                    </form>
                    <form action={resolveAlertAction}>
                      <input name="alertId" type="hidden" value={alert.id} />
                      <input name="note" placeholder="resolution note" />
                      <button className="button" type="submit">
                        Resolve
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
