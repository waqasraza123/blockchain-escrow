import Link from "next/link";

import {
  createFinanceExportAction
} from "../../../actions";
import {
  getReportingDashboard,
  listApprovalPolicies,
  listCostCenters,
  listFinanceExports,
  listStatementSnapshots
} from "../../../../../lib/api";
import {
  Card,
  DataTable,
  EmptyState,
  MetricGrid,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../../ui";

type FinancePageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function FinancePage(props: FinancePageProps) {
  const { organizationId } = await props.params;
  const [dashboard, costCenters, policies, snapshots, exportJobs] = await Promise.all([
    getReportingDashboard(organizationId),
    listCostCenters(organizationId),
    listApprovalPolicies(organizationId),
    listStatementSnapshots(organizationId),
    listFinanceExports(organizationId)
  ]);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Finance Center"
        subtitle="Cost centers, approval policies, statement history, and export jobs for the active organization."
        title="Finance Controls"
      />
      <MetricGrid
        items={[
          { label: "Released amount", value: dashboard.dashboard.releasedAmountMinor },
          { label: "Refunded amount", value: dashboard.dashboard.refundedAmountMinor },
          { label: "Snapshots", value: dashboard.dashboard.statementSnapshotCount },
          { label: "Pending exports", value: dashboard.dashboard.pendingFinanceExportCount }
        ]}
      />
      <div className="split-grid">
        <Card title="Create Finance Export">
          <form action={createFinanceExportAction} className="form-stack">
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="returnPath" type="hidden" value={`/orgs/${organizationId}/finance`} />
            <div className="field">
              <label htmlFor="date-from">Date from</label>
              <input id="date-from" name="dateFrom" type="date" />
            </div>
            <div className="field">
              <label htmlFor="date-to">Date to</label>
              <input id="date-to" name="dateTo" type="date" />
            </div>
            <button className="button" type="submit">
              Queue export job
            </button>
          </form>
        </Card>
        <Card title="Cost Centers">
          {costCenters.costCenters.length === 0 ? (
            <EmptyState body="No cost centers are configured for this organization." />
          ) : (
            <DataTable headers={["Code", "Name", "Status"]}>
              {costCenters.costCenters.map((costCenter) => (
                <tr key={costCenter.id}>
                  <td>{costCenter.code}</td>
                  <td>{costCenter.name}</td>
                  <td>
                    <Pill tone={toneForStatus(costCenter.status)} value={costCenter.status} />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
      <Card title="Approval Policies">
        {policies.approvalPolicies.length === 0 ? (
          <EmptyState body="No approval policies are active yet." />
        ) : (
          <DataTable headers={["Name", "Kind", "Active", "Steps"]}>
            {policies.approvalPolicies.map((policy) => (
              <tr key={policy.id}>
                <td>{policy.name}</td>
                <td>{policy.kind}</td>
                <td>
                  <Pill tone={policy.active ? "success" : "warning"} value={policy.active ? "ACTIVE" : "INACTIVE"} />
                </td>
                <td>{policy.steps.length}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
      <div className="split-grid">
        <Card title="Statement Snapshots">
          {snapshots.snapshots.length === 0 ? (
            <EmptyState body="No statement snapshots have been captured yet." />
          ) : (
            <DataTable headers={["Snapshot", "Version", "Created"]}>
              {snapshots.snapshots.slice(0, 10).map((snapshot) => (
                <tr key={snapshot.id}>
                  <td>{snapshot.kind}</td>
                  <td>{snapshot.dealVersionId}</td>
                  <td className="mono">{snapshot.createdAt}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
        <Card title="Export Jobs">
          {exportJobs.exportJobs.length === 0 ? (
            <EmptyState body="No finance exports have been requested yet." />
          ) : (
            <DataTable headers={["Job", "Status", "Artifacts", "Created"]}>
              {exportJobs.exportJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/orgs/${organizationId}/exports/${job.id}`}>{job.id}</Link>
                  </td>
                  <td>
                    <Pill tone={toneForStatus(job.status)} value={job.status} />
                  </td>
                  <td>{job.readyArtifactCount}</td>
                  <td className="mono">{job.createdAt}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
