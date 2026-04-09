import Link from "next/link";

import { getDashboard } from "../../lib/operator-api";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  MetricGrid,
  Pill,
  toneForStatus
} from "./ui";

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return (
    <>
      <ConsoleHeader
        eyebrow="Release 8"
        subtitle="Operational visibility across reconciliation, compliance, disputes, and protocol controls."
        title="Operator Dashboard"
      />
      <MetricGrid
        items={dashboard.cards.map((card) => ({
          label: card.key.replaceAll("_", " "),
          value: card.value
        }))}
      />
      <div className="split-grid">
        <Card title="Recent Alerts">
          {dashboard.recentAlerts.length === 0 ? (
            <EmptyState body="No operator alerts are currently open or recently updated." />
          ) : (
            <DataTable headers={["Kind", "Status", "Subject", "Detected"]}>
              {dashboard.recentAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.kind}</td>
                  <td>
                    <Pill tone={toneForStatus(alert.status)} value={alert.status} />
                  </td>
                  <td>{alert.subject.label ?? alert.subject.subjectId}</td>
                  <td className="mono">{alert.lastDetectedAt}</td>
                </tr>
              ))}
            </DataTable>
          )}
          <div className="actions-row">
            <Link className="button button-secondary" href="/alerts">
              Open Alerts Queue
            </Link>
          </div>
        </Card>
        <Card title="Service Health">
          <div className="detail-grid">
            <div className="detail-item">
              <span>API</span>
              <Pill
                tone={toneForStatus(dashboard.health.api.status)}
                value={dashboard.health.api.status}
              />
            </div>
            <div className="detail-item">
              <span>Worker</span>
              <Pill
                tone={toneForStatus(dashboard.health.worker.status)}
                value={dashboard.health.worker.status}
              />
            </div>
            <div className="detail-item">
              <span>Indexer</span>
              <Pill
                tone={toneForStatus(dashboard.health.indexer.status)}
                value={dashboard.health.indexer.status}
              />
            </div>
            <div className="detail-item">
              <span>Cursor</span>
              <Pill
                tone={dashboard.health.cursorFresh ? "success" : "danger"}
                value={dashboard.health.cursorFresh ? "FRESH" : "STALE"}
              />
            </div>
          </div>
          <div className="actions-row">
            <Link className="button button-secondary" href="/health">
              View Health Detail
            </Link>
          </div>
        </Card>
      </div>
      <Card
        actions={
          <Link className="button button-secondary" href="/reconciliation">
            View Queue
          </Link>
        }
        title="Reconciliation Queue"
      >
        {dashboard.reconciliation.queue.length === 0 ? (
          <EmptyState body="No reconciliation items currently require attention." />
        ) : (
          <DataTable headers={["Kind", "Status", "Subject", "Updated"]}>
            {dashboard.reconciliation.queue.slice(0, 12).map((item) => (
              <tr key={`${item.kind}:${item.entityId}`}>
                <td>{item.kind}</td>
                <td>
                  <Pill tone={toneForStatus(item.status)} value={item.status} />
                </td>
                <td>{item.subject.label ?? item.subject.subjectId}</td>
                <td className="mono">{item.updatedAt}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
