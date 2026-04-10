import { getFinanceExportJob } from "../../../../../../lib/api";
import { getI18n } from "../../../../../../lib/i18n/server";
import { formatCode } from "../../../../../../lib/i18n/format";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../../../ui";

type ExportDetailPageProps = {
  params: Promise<{ exportJobId: string; organizationId: string }>;
};

export default async function ExportDetailPage(props: ExportDetailPageProps) {
  const { exportJobId, organizationId } = await props.params;
  const { messages } = await getI18n();
  const detail = await getFinanceExportJob(organizationId, exportJobId);
  const job = detail.exportJob;

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.exports.detailEyebrow}
        subtitle={messages.exports.detailSubtitle}
        title={job.id}
      />
      <div className="split-grid">
        <Card title={messages.exports.jobSummary}>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">{messages.exports.status}</span>
              <Pill
                tone={toneForStatus(job.status)}
                value={formatCode(job.status, messages.statuses, messages.common.none)}
              />
            </div>
            <div className="detail-item">
              <span className="muted">{messages.exports.started}</span>
              <strong className="mono">{job.startedAt ?? messages.common.notStarted}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.exports.finished}</span>
              <strong className="mono">{job.finishedAt ?? messages.common.notFinished}</strong>
            </div>
          </div>
        </Card>
        <Card title={messages.exports.filters}>
          <pre className="code-block">{JSON.stringify(job.filters, null, 2)}</pre>
        </Card>
      </div>
      <Card title={messages.exports.artifacts}>
        {job.artifacts.length === 0 ? (
          <EmptyState body={messages.exports.workerPending} />
        ) : (
          <DataTable
            headers={[
              messages.exports.filename,
              messages.exports.format,
              messages.exports.size,
              messages.exports.preview
            ]}
          >
            {job.artifacts.map((artifact) => (
              <tr key={artifact.id}>
                <td>{artifact.filename}</td>
                <td>{artifact.format}</td>
                <td>{artifact.sizeBytes}</td>
                <td>
                  <pre className="code-block">
                    {artifact.body.slice(0, 1200)}
                    {artifact.body.length > 1200 ? "\n..." : ""}
                  </pre>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
