import { decideApprovalStepAction } from "../../../../actions";
import { getApprovalRequest } from "../../../../../../lib/api";
import { formatCode } from "../../../../../../lib/i18n/format";
import { getI18n } from "../../../../../../lib/i18n/server";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../../../ui";

type ApprovalDetailPageProps = {
  params: Promise<{ approvalRequestId: string; organizationId: string }>;
};

export default async function ApprovalDetailPage(props: ApprovalDetailPageProps) {
  const { approvalRequestId, organizationId } = await props.params;
  const { messages } = await getI18n();
  const detail = await getApprovalRequest(organizationId, approvalRequestId);
  const request = detail.approvalRequest;
  const pendingStep = request.steps.find((step) => step.status === "PENDING") ?? null;
  const returnPath = `/orgs/${organizationId}/approvals/${approvalRequestId}`;

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.approvals.detailEyebrow}
        subtitle={messages.approvals.detailSubtitle}
        title={request.title}
      />
      <div className="split-grid">
        <Card title={messages.approvals.summary}>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">{messages.approvals.summaryAction}</span>
              <strong>{formatCode(request.kind, messages.codes.actionKinds, messages.common.none)}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.approvals.summaryStatus}</span>
              <Pill
                tone={toneForStatus(request.status)}
                value={formatCode(request.status, messages.statuses, messages.common.none)}
              />
            </div>
            <div className="detail-item">
              <span className="muted">{messages.approvals.subjectFingerprint}</span>
              <strong className="mono">{request.subjectFingerprint}</strong>
            </div>
          </div>
        </Card>
        <Card title={messages.approvals.decisionPanel}>
          {pendingStep ? (
            <form action={decideApprovalStepAction} className="form-stack">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="approvalRequestId" type="hidden" value={approvalRequestId} />
              <input name="approvalStepId" type="hidden" value={pendingStep.id} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="decision-note">{messages.approvals.decisionNote}</label>
                <textarea id="decision-note" name="note" />
              </div>
              <div className="inline-actions">
                <button className="button" name="decision" type="submit" value="APPROVED">
                  {messages.approvals.approveStep}
                </button>
                <button className="button-ghost" name="decision" type="submit" value="REJECTED">
                  {messages.approvals.rejectStep}
                </button>
              </div>
            </form>
          ) : (
            <EmptyState body={messages.approvals.noPendingStep} />
          )}
        </Card>
      </div>
      <Card title={messages.approvals.stepHistory}>
        <DataTable
          headers={[
            messages.approvals.position,
            messages.approvals.label,
            messages.approvals.requiredRole,
            messages.approvals.status,
            messages.approvals.decidedAt
          ]}
        >
          {request.steps.map((step) => (
            <tr key={step.id}>
              <td>{step.position}</td>
              <td>{step.label}</td>
              <td>{step.requiredRole}</td>
              <td>
                <Pill
                  tone={toneForStatus(step.status)}
                  value={formatCode(step.status, messages.statuses, messages.common.none)}
                />
              </td>
              <td className="mono">{step.decidedAt ?? messages.common.pending}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
