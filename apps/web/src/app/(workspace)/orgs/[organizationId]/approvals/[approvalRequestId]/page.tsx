import { decideApprovalStepAction } from "../../../../actions";
import { getApprovalRequest } from "../../../../../../lib/api";
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
  const detail = await getApprovalRequest(organizationId, approvalRequestId);
  const request = detail.approvalRequest;
  const pendingStep = request.steps.find((step) => step.status === "PENDING") ?? null;
  const returnPath = `/orgs/${organizationId}/approvals/${approvalRequestId}`;

  return (
    <>
      <WorkspaceHeader
        eyebrow="Approval Detail"
        subtitle="Review the immutable request fingerprint, subject, and step history."
        title={request.title}
      />
      <div className="split-grid">
        <Card title="Summary">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">Action</span>
              <strong>{request.kind}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Status</span>
              <Pill tone={toneForStatus(request.status)} value={request.status} />
            </div>
            <div className="detail-item">
              <span className="muted">Subject fingerprint</span>
              <strong className="mono">{request.subjectFingerprint}</strong>
            </div>
          </div>
        </Card>
        <Card title="Decision Panel">
          {pendingStep ? (
            <form action={decideApprovalStepAction} className="form-stack">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="approvalRequestId" type="hidden" value={approvalRequestId} />
              <input name="approvalStepId" type="hidden" value={pendingStep.id} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="decision-note">Decision note</label>
                <textarea id="decision-note" name="note" />
              </div>
              <div className="inline-actions">
                <button className="button" name="decision" type="submit" value="APPROVED">
                  Approve step
                </button>
                <button className="button-ghost" name="decision" type="submit" value="REJECTED">
                  Reject step
                </button>
              </div>
            </form>
          ) : (
            <EmptyState body="This approval request has no actionable pending step." />
          )}
        </Card>
      </div>
      <Card title="Step History">
        <DataTable headers={["Position", "Label", "Required role", "Status", "Decided at"]}>
          {request.steps.map((step) => (
            <tr key={step.id}>
              <td>{step.position}</td>
              <td>{step.label}</td>
              <td>{step.requiredRole}</td>
              <td>
                <Pill tone={toneForStatus(step.status)} value={step.status} />
              </td>
              <td className="mono">{step.decidedAt ?? "pending"}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
