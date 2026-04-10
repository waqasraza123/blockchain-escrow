import { getHealth } from "../../../lib/operator-api";
import { formatBoolean, formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { Card, ConsoleHeader, Pill, toneForStatus } from "../ui";

export default async function HealthPage() {
  const { messages } = await getI18n();
  const health = await getHealth();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.health}
        subtitle={messages.health.serviceStatus}
        title={messages.health.title}
      />
      <div className="split-grid">
        {[health.api, health.worker, health.indexer].map((service) => (
          <Card key={service.service} title={service.service.toUpperCase()}>
            <div className="detail-grid">
              <div className="detail-item">
                <span>{messages.health.status}</span>
                <Pill
                  tone={toneForStatus(service.status)}
                  value={formatCode(service.status, messages.statuses, messages.common.none)}
                />
              </div>
              <div className="detail-item">
                <span>{messages.health.ready}</span>
                <strong>{formatBoolean(service.ready, messages)}</strong>
              </div>
            </div>
            <pre className="mono">{JSON.stringify(service.details, null, 2)}</pre>
          </Card>
        ))}
      </div>
      <Card title={messages.health.chainVisibility}>
        <div className="detail-grid">
          <div className="detail-item">
            <span>{messages.health.cursorFresh}</span>
            <Pill tone={health.cursorFresh ? "success" : "danger"} value={formatBoolean(health.cursorFresh, messages)} />
          </div>
          <div className="detail-item">
            <span>{messages.health.cursorUpdated}</span>
            <strong className="mono">{health.cursorUpdatedAt ?? messages.common.na}</strong>
          </div>
          <div className="detail-item">
            <span>{messages.health.network}</span>
            <strong>{health.manifest?.network ?? messages.common.na}</strong>
          </div>
          <div className="detail-item">
            <span>{messages.health.contractVersion}</span>
            <strong>{health.manifest?.contractVersion ?? messages.common.na}</strong>
          </div>
        </div>
      </Card>
    </>
  );
}
