import { getReconciliation } from "../../../lib/operator-api";
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
  const reconciliation = await getReconciliation();

  return (
    <>
      <ConsoleHeader
        eyebrow="Reconciliation"
        subtitle="Funding, settlement execution, disputes, and unresolved operator review pressure."
        title="Reconciliation Queue"
      />
      <MetricGrid
        items={[
          { label: "stale funding", value: reconciliation.staleFundingCount },
          {
            label: "failed funding",
            value: reconciliation.failedFundingCount
          },
          {
            label: "mismatched funding",
            value: reconciliation.mismatchedFundingCount
          },
          {
            label: "stale settlement",
            value: reconciliation.staleSettlementExecutionCount
          },
          {
            label: "failed settlement",
            value: reconciliation.failedSettlementExecutionCount
          },
          {
            label: "mismatched settlement",
            value: reconciliation.mismatchedSettlementExecutionCount
          },
          { label: "open disputes", value: reconciliation.openDisputeCount },
          {
            label: "review pressure",
            value: reconciliation.unresolvedOperatorReviewCount
          }
        ]}
      />
      <Card title="Queue">
        {reconciliation.queue.length === 0 ? (
          <EmptyState body="No reconciliation items currently require intervention." />
        ) : (
          <DataTable headers={["Kind", "Status", "Subject", "Agreement", "Updated"]}>
            {reconciliation.queue.map((item) => (
              <tr key={`${item.kind}:${item.entityId}`}>
                <td>{item.kind}</td>
                <td>
                  <Pill tone={toneForStatus(item.status)} value={item.status} />
                </td>
                <td>{item.subject.label ?? item.subject.subjectId}</td>
                <td className="mono">{item.agreementAddress ?? "n/a"}</td>
                <td className="mono">{item.updatedAt}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
