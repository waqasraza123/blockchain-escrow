import { getHealth } from "../../../lib/operator-api";
import { formatBoolean, formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import {
  Card,
  ConsoleHeader,
  DataTable,
  MetricGrid,
  Pill,
  toneForStatus
} from "../ui";

export default async function HealthPage() {
  const { messages } = await getI18n();
  const health = await getHealth();
  const serviceTitles = {
    api: messages.dashboard.api,
    indexer: messages.dashboard.indexer,
    worker: messages.dashboard.worker
  };

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.health}
        subtitle={messages.health.serviceStatus}
        title={messages.health.title}
      />
      <MetricGrid
        items={[
          { label: messages.health.visibleChains, value: health.visibleChainCount },
          {
            label: messages.health.freshVisibleChains,
            value: health.freshVisibleChainCount
          },
          {
            label: messages.health.staleVisibleChains,
            value: health.staleVisibleChainCount
          }
        ]}
      />
      <div className="split-grid">
        {[health.api, health.worker, health.indexer].map((service) => (
          <Card
            key={service.service}
            title={serviceTitles[service.service as keyof typeof serviceTitles] ?? service.service}
          >
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
            <Pill
              tone={health.cursorFresh ? "success" : "danger"}
              value={formatBoolean(health.cursorFresh, messages)}
            />
          </div>
          <div className="detail-item">
            <span>{messages.health.cursorUpdated}</span>
            <strong className="mono">{health.cursorUpdatedAt ?? messages.common.na}</strong>
          </div>
        </div>
        <DataTable
          headers={[
            messages.health.network,
            messages.health.chainId,
            messages.health.contractVersion,
            messages.health.cursorFresh,
            messages.health.cursorKey,
            messages.health.cursorUpdated
          ]}
        >
          {health.visibleChains.map((chain) => (
            <tr key={chain.chainId}>
              <td>{chain.network}</td>
              <td className="mono">{chain.chainId}</td>
              <td>{chain.contractVersion}</td>
              <td>
                <Pill
                  tone={chain.cursorFresh ? "success" : "danger"}
                  value={formatBoolean(chain.cursorFresh, messages)}
                />
              </td>
              <td className="mono">{chain.cursorKey}</td>
              <td className="mono">{chain.cursorUpdatedAt ?? messages.common.na}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
