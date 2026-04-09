import {
  assignCaseAction,
  addCaseNoteAction,
  updateCaseStatusAction
} from "../../actions";
import { getCase } from "../../../../lib/operator-api";
import { Card, ConsoleHeader, Pill, toneForStatus } from "../../ui";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const detail = await getCase(caseId);

  return (
    <>
      <ConsoleHeader
        eyebrow="Case Detail"
        subtitle={detail.case.summary}
        title={detail.case.title}
      />
      <Card title="Case State">
        <div className="detail-grid">
          <div className="detail-item">
            <span>Status</span>
            <Pill tone={toneForStatus(detail.case.status)} value={detail.case.status} />
          </div>
          <div className="detail-item">
            <span>Severity</span>
            <Pill
              tone={toneForStatus(detail.case.severity)}
              value={detail.case.severity}
            />
          </div>
          <div className="detail-item">
            <span>Assigned Operator</span>
            <strong>{detail.case.assignedOperatorAccountId ?? "unassigned"}</strong>
          </div>
          <div className="detail-item">
            <span>Subject</span>
            <strong>{detail.case.subject.label ?? detail.case.subject.subjectId}</strong>
          </div>
        </div>
      </Card>
      <div className="split-grid">
        <Card title="Notes">
          <div className="stack">
            {detail.notes.length === 0 ? (
              <p className="empty-state">No case notes recorded yet.</p>
            ) : (
              detail.notes.map((note) => (
                <div className="detail-item" key={note.id}>
                  <span className="mono">{note.createdAt}</span>
                  <strong>{note.authorOperatorAccountId}</strong>
                  <p>{note.bodyMarkdown}</p>
                </div>
              ))
            )}
          </div>
          <form action={addCaseNoteAction} className="form-grid">
            <input name="caseId" type="hidden" value={detail.case.id} />
            <div className="field">
              <label htmlFor="bodyMarkdown">Add Note</label>
              <textarea id="bodyMarkdown" name="bodyMarkdown" />
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                Add Note
              </button>
            </div>
          </form>
        </Card>
        <div className="stack">
          <Card title="Assignment">
            <form action={assignCaseAction} className="form-grid">
              <input name="caseId" type="hidden" value={detail.case.id} />
              <div className="field">
                <label htmlFor="assignedOperatorAccountId">Operator Account Id</label>
                <input
                  defaultValue={detail.case.assignedOperatorAccountId ?? ""}
                  id="assignedOperatorAccountId"
                  name="assignedOperatorAccountId"
                  placeholder="blank to unassign"
                />
              </div>
              <div className="actions-row">
                <button className="button button-secondary" type="submit">
                  Update Assignment
                </button>
              </div>
            </form>
          </Card>
          <Card title="Status">
            <form action={updateCaseStatusAction} className="form-grid">
              <input name="caseId" type="hidden" value={detail.case.id} />
              <div className="field">
                <label htmlFor="status">Next Status</label>
                <select defaultValue={detail.case.status} id="status" name="status">
                  <option value="OPEN">Open</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="ESCALATED">Escalated</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Update Status
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
