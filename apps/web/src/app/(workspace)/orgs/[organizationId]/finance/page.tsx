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
import { formatCode } from "../../../../../lib/i18n/format";
import { getI18n } from "../../../../../lib/i18n/server";
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
  const { messages } = await getI18n();
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
        eyebrow={messages.finance.financeCenter}
        subtitle={messages.finance.subtitle}
        title={messages.finance.title}
      />
      <MetricGrid
        items={[
          { label: messages.finance.releasedAmount, value: dashboard.dashboard.releasedAmountMinor },
          { label: messages.finance.refundedAmount, value: dashboard.dashboard.refundedAmountMinor },
          { label: messages.finance.snapshots, value: dashboard.dashboard.statementSnapshotCount },
          { label: messages.finance.pendingExports, value: dashboard.dashboard.pendingFinanceExportCount }
        ]}
      />
      <div className="split-grid">
        <Card title={messages.finance.createExport}>
          <form action={createFinanceExportAction} className="form-stack">
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="returnPath" type="hidden" value={`/orgs/${organizationId}/finance`} />
            <div className="field">
              <label htmlFor="date-from">{messages.finance.dateFrom}</label>
              <input id="date-from" name="dateFrom" type="date" />
            </div>
            <div className="field">
              <label htmlFor="date-to">{messages.finance.dateTo}</label>
              <input id="date-to" name="dateTo" type="date" />
            </div>
            <button className="button" type="submit">
              {messages.finance.queueExportJob}
            </button>
          </form>
        </Card>
        <Card title={messages.finance.costCenters}>
          {costCenters.costCenters.length === 0 ? (
            <EmptyState body="No cost centers are configured for this organization." />
          ) : (
            <DataTable headers={[messages.finance.code, messages.finance.name, messages.finance.status]}>
              {costCenters.costCenters.map((costCenter) => (
                <tr key={costCenter.id}>
                  <td>{costCenter.code}</td>
                  <td>{costCenter.name}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(costCenter.status)}
                      value={formatCode(costCenter.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
      <Card title={messages.finance.approvalPolicies}>
        {policies.approvalPolicies.length === 0 ? (
          <EmptyState body="No approval policies are active yet." />
        ) : (
          <DataTable
            headers={[
              messages.finance.name,
              messages.finance.kind,
              messages.finance.active,
              messages.finance.steps
            ]}
          >
            {policies.approvalPolicies.map((policy) => (
              <tr key={policy.id}>
                <td>{policy.name}</td>
                <td>{policy.kind}</td>
                <td>
                  <Pill
                    tone={policy.active ? "success" : "warning"}
                    value={policy.active ? messages.common.active : formatCode("INACTIVE", messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{policy.steps.length}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
      <div className="split-grid">
        <Card title={messages.finance.statementSnapshots}>
          {snapshots.snapshots.length === 0 ? (
            <EmptyState body="No statement snapshots have been captured yet." />
          ) : (
            <DataTable headers={["Snapshot", messages.finance.version, messages.exports.created]}>
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
        <Card title={messages.finance.exportJobs}>
          {exportJobs.exportJobs.length === 0 ? (
            <EmptyState body="No finance exports have been requested yet." />
          ) : (
            <DataTable
              headers={[
                "Job",
                messages.finance.status,
                messages.finance.artifacts,
                messages.exports.created
              ]}
            >
              {exportJobs.exportJobs.map((job) => (
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
