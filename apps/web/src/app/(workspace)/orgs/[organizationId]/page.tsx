import Link from "next/link";

import { getReportingDashboard } from "../../../../lib/api";
import { formatCode } from "../../../../lib/i18n/format";
import { getI18n } from "../../../../lib/i18n/server";
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
  const { messages } = await getI18n();
  const dashboard = await getReportingDashboard(organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.dashboard.eyebrow}
        subtitle={messages.dashboard.subtitle}
        title={messages.dashboard.title}
      />
      <MetricGrid
        items={[
          { label: messages.dashboard.pendingApprovals, value: dashboard.dashboard.pendingApprovalRequestCount },
          {
            label: messages.dashboard.approvedApprovals,
            value: dashboard.dashboard.approvedApprovalRequestCount
          },
          { label: messages.dashboard.blockedApprovals, value: dashboard.dashboard.blockedApprovalRequestCount },
          { label: messages.dashboard.fundingTxs, value: dashboard.dashboard.fundingTransactionCount },
          {
            label: messages.dashboard.settlementExecutions,
            value: dashboard.dashboard.settlementExecutionTransactionCount
          },
          { label: messages.dashboard.snapshots, value: dashboard.dashboard.statementSnapshotCount },
          { label: messages.dashboard.pendingExports, value: dashboard.dashboard.pendingFinanceExportCount },
          { label: messages.dashboard.completedExports, value: dashboard.dashboard.completedFinanceExportCount }
        ]}
      />
      <div className="split-grid">
        <Card
          actions={
            <Link className="button-ghost" href={`/orgs/${organizationId}/approvals`}>
              {messages.dashboard.openQueue}
            </Link>
          }
          title={messages.dashboard.recentApprovalRequests}
        >
          {dashboard.recentApprovalRequests.length === 0 ? (
            <EmptyState body={messages.dashboard.noRecentApprovals} />
          ) : (
            <DataTable
              headers={[
                messages.approvals.action,
                messages.approvals.status,
                messages.approvals.subject,
                messages.approvals.requested
              ]}
            >
              {dashboard.recentApprovalRequests.map((request) => (
                <tr key={request.id}>
                  <td>{formatCode(request.kind, messages.codes.actionKinds, messages.common.none)}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(request.status)}
                      value={formatCode(request.status, messages.statuses, messages.common.none)}
                    />
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
              {messages.dashboard.viewFinance}
            </Link>
          }
          title={messages.dashboard.recentFinanceExports}
        >
          {dashboard.recentFinanceExports.length === 0 ? (
            <EmptyState body={messages.dashboard.noRecentFinanceExports} />
          ) : (
            <DataTable
              headers={[
                messages.dashboard.job,
                messages.finance.status,
                messages.finance.artifacts,
                messages.exports.created
              ]}
            >
              {dashboard.recentFinanceExports.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/orgs/${organizationId}/exports/${job.id}`}>{job.id}</Link>
                  </td>
                  <td>
                    <Pill
                      tone={toneForStatus(job.status)}
                      value={formatCode(job.status, messages.statuses, messages.common.none)}
                    />
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
