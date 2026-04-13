import { getReconciliation } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import {
  Card,
  ConsoleHeader,
  DataTable,
  MetricGrid,
  EmptyState,
  Pill,
  toneForStatus
} from "../ui";

export default async function ReconciliationPage() {
  const { messages } = await getI18n();
  const reconciliation = await getReconciliation();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.reconciliation}
        subtitle={messages.reconciliation.subtitle}
        title={messages.reconciliation.title}
      />
      <MetricGrid
        items={[
          { label: messages.codes.metrics.staleFunding, value: reconciliation.staleFundingCount },
          {
            label: messages.codes.metrics.failedFunding,
            value: reconciliation.failedFundingCount
          },
          {
            label: messages.codes.metrics.mismatchedFunding,
            value: reconciliation.mismatchedFundingCount
          },
          {
            label: messages.codes.metrics.staleSettlement,
            value: reconciliation.staleSettlementExecutionCount
          },
          {
            label: messages.codes.metrics.failedSettlement,
            value: reconciliation.failedSettlementExecutionCount
          },
          {
            label: messages.codes.metrics.mismatchedSettlement,
            value: reconciliation.mismatchedSettlementExecutionCount
          },
          { label: messages.codes.metrics.openDisputes, value: reconciliation.openDisputeCount },
          {
            label: messages.codes.metrics.reviewPressure,
            value: reconciliation.unresolvedOperatorReviewCount
          }
        ]}
      />
      <Card title={messages.reconciliation.queue}>
        {reconciliation.queue.length === 0 ? (
          <EmptyState body={messages.reconciliation.empty} />
        ) : (
          <DataTable headers={[messages.reconciliation.kind, messages.reconciliation.status, messages.reconciliation.subject, messages.reconciliation.chain, messages.reconciliation.agreement, messages.reconciliation.updated]}>
            {reconciliation.queue.map((item) => (
              <tr key={`${item.kind}:${item.entityId}`}>
                <td>{item.kind}</td>
                <td>
                  <Pill
                    tone={toneForStatus(item.status)}
                    value={formatCode(item.status, messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{item.subject.label ?? item.subject.subjectId}</td>
                <td className="mono">{item.chainId ?? messages.common.na}</td>
                <td className="mono">{item.agreementAddress ?? messages.common.na}</td>
                <td className="mono">{item.updatedAt}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
