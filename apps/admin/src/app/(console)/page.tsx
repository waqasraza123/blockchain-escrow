import Link from "next/link";

import { getDashboard } from "../../lib/operator-api";
import { formatCode } from "../../lib/i18n/format";
import { getI18n } from "../../lib/i18n/server";
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
  const { messages } = await getI18n();
  const dashboard = await getDashboard();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.dashboard.eyebrow}
        subtitle={messages.dashboard.subtitle}
        title={messages.dashboard.title}
      />
      <MetricGrid
        items={dashboard.cards.map((card) => ({
          label: formatCode(card.key, {}, messages.common.none),
          value: card.value
        }))}
      />
      <div className="split-grid">
        <Card title={messages.dashboard.recentAlerts}>
          {dashboard.recentAlerts.length === 0 ? (
            <EmptyState body={messages.dashboard.noAlerts} />
          ) : (
            <DataTable headers={["Kind", "Status", "Subject", "Detected"]}>
              {dashboard.recentAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{alert.kind}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(alert.status)}
                      value={formatCode(alert.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td>{alert.subject.label ?? alert.subject.subjectId}</td>
                  <td className="mono">{alert.lastDetectedAt}</td>
                </tr>
              ))}
          </DataTable>
          )}
          <div className="actions-row">
            <Link className="button button-secondary" href="/alerts">
              {messages.dashboard.alertsQueue}
            </Link>
          </div>
        </Card>
        <Card title={messages.dashboard.serviceHealth}>
          <div className="detail-grid">
            <div className="detail-item">
              <span>API</span>
              <Pill
                tone={toneForStatus(dashboard.health.api.status)}
                value={formatCode(dashboard.health.api.status, messages.statuses, messages.common.none)}
              />
            </div>
            <div className="detail-item">
              <span>Worker</span>
              <Pill
                tone={toneForStatus(dashboard.health.worker.status)}
                value={formatCode(
                  dashboard.health.worker.status,
                  messages.statuses,
                  messages.common.none
                )}
              />
            </div>
            <div className="detail-item">
              <span>Indexer</span>
              <Pill
                tone={toneForStatus(dashboard.health.indexer.status)}
                value={formatCode(
                  dashboard.health.indexer.status,
                  messages.statuses,
                  messages.common.none
                )}
              />
            </div>
            <div className="detail-item">
              <span>Cursor</span>
              <Pill
                tone={dashboard.health.cursorFresh ? "success" : "danger"}
                value={
                  dashboard.health.cursorFresh
                    ? formatCode("FRESH", messages.statuses, messages.common.none)
                    : formatCode("STALE", messages.statuses, messages.common.none)
                }
              />
            </div>
          </div>
          <div className="actions-row">
            <Link className="button button-secondary" href="/health">
              {messages.dashboard.viewHealth}
            </Link>
          </div>
        </Card>
      </div>
      <Card
        actions={
          <Link className="button button-secondary" href="/reconciliation">
            {messages.dashboard.viewQueue}
          </Link>
        }
        title={messages.dashboard.queueTitle}
      >
        {dashboard.reconciliation.queue.length === 0 ? (
          <EmptyState body={messages.dashboard.noReconciliation} />
        ) : (
          <DataTable headers={["Kind", "Status", "Subject", "Updated"]}>
            {dashboard.reconciliation.queue.slice(0, 12).map((item) => (
              <tr key={`${item.kind}:${item.entityId}`}>
                <td>{item.kind}</td>
                <td>
                  <Pill
                    tone={toneForStatus(item.status)}
                    value={formatCode(item.status, messages.statuses, messages.common.none)}
                  />
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
