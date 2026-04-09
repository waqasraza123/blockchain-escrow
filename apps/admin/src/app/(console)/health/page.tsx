import { getHealth } from "../../../lib/operator-api";
import { Card, ConsoleHeader, Pill, toneForStatus } from "../ui";

export default async function HealthPage() {
  const health = await getHealth();

  return (
    <>
      <ConsoleHeader
        eyebrow="Health"
        subtitle="API-aggregated service readiness, deployment metadata, and Release 4 cursor freshness."
        title="Platform Health"
      />
      <div className="split-grid">
        {[health.api, health.worker, health.indexer].map((service) => (
          <Card key={service.service} title={service.service.toUpperCase()}>
            <div className="detail-grid">
              <div className="detail-item">
                <span>Status</span>
                <Pill tone={toneForStatus(service.status)} value={service.status} />
              </div>
              <div className="detail-item">
                <span>Ready</span>
                <strong>{service.ready ? "true" : "false"}</strong>
              </div>
            </div>
            <pre className="mono">{JSON.stringify(service.details, null, 2)}</pre>
          </Card>
        ))}
      </div>
      <Card title="Chain Visibility">
        <div className="detail-grid">
          <div className="detail-item">
            <span>Cursor Fresh</span>
            <Pill tone={health.cursorFresh ? "success" : "danger"} value={health.cursorFresh ? "YES" : "NO"} />
          </div>
          <div className="detail-item">
            <span>Cursor Updated</span>
            <strong className="mono">{health.cursorUpdatedAt ?? "unavailable"}</strong>
          </div>
          <div className="detail-item">
            <span>Network</span>
            <strong>{health.manifest?.network ?? "untracked"}</strong>
          </div>
          <div className="detail-item">
            <span>Contract Version</span>
            <strong>{health.manifest?.contractVersion ?? "n/a"}</strong>
          </div>
        </div>
      </Card>
    </>
  );
}
