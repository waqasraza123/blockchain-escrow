import Link from "next/link";

import { getReportingDashboard } from "../../../../lib/api";
import {
  Card,
  DataTable,
  EmptyState,
  MetricGrid,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../ui";

type DashboardPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function DashboardPage(props: DashboardPageProps) {
  const { organizationId } = await props.params;
  const dashboard = await getReportingDashboard(organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Release 9"
        subtitle="Approvals, statement history, and export operations for the active organization."
        title="Organization Dashboard"
      />
      <MetricGrid
        items={[
          { label: "Pending approvals", value: dashboard.dashboard.pendingApprovalRequestCount },
          { label: "Approved approvals", value: dashboard.dashboard.approvedApprovalRequestCount },
          { label: "Blocked approvals", value: dashboard.dashboard.blockedApprovalRequestCount },
          { label: "Funding txs", value: dashboard.dashboard.fundingTransactionCount },
          {
            label: "Settlement executions",
            value: dashboard.dashboard.settlementExecutionTransactionCount
          },
          { label: "Snapshots", value: dashboard.dashboard.statementSnapshotCount },
          { label: "Pending exports", value: dashboard.dashboard.pendingFinanceExportCount },
          { label: "Completed exports", value: dashboard.dashboard.completedFinanceExportCount }
        ]}
      />
      <div className="split-grid">
        <Card
          actions={
            <Link className="button-ghost" href={`/orgs/${organizationId}/approvals`}>
              Open queue
            </Link>
          }
          title="Recent Approval Requests"
        >
          {dashboard.recentApprovalRequests.length === 0 ? (
            <EmptyState body="No approval requests are currently open or recently updated." />
          ) : (
            <DataTable headers={["Action", "Status", "Subject", "Requested"]}>
              {dashboard.recentApprovalRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.kind}</td>
                  <td>
                    <Pill tone={toneForStatus(request.status)} value={request.status} />
                  </td>
                  <td>{request.subject.label ?? request.subject.id}</td>
                  <td className="mono">{request.requestedAt}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
        <Card
          actions={
            <Link className="button-ghost" href={`/orgs/${organizationId}/finance`}>
              View finance
            </Link>
          }
          title="Recent Finance Exports"
        >
          {dashboard.recentFinanceExports.length === 0 ? (
            <EmptyState body="No finance export jobs have been requested yet." />
          ) : (
            <DataTable headers={["Job", "Status", "Artifacts", "Created"]}>
              {dashboard.recentFinanceExports.map((job) => (
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
