import {
  assignCaseAction,
  addCaseNoteAction,
  updateCaseStatusAction
} from "../../actions";
import { getCase } from "../../../../lib/operator-api";
import { formatCode } from "../../../../lib/i18n/format";
import { getI18n } from "../../../../lib/i18n/server";
import { Card, ConsoleHeader, Pill, toneForStatus } from "../../ui";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const { messages } = await getI18n();
  const detail = await getCase(caseId);
  const statusOptions = [
    { label: messages.cases.open, value: "OPEN" },
    { label: messages.cases.inReview, value: "IN_REVIEW" },
    { label: messages.cases.escalated, value: "ESCALATED" },
    { label: messages.cases.resolved, value: "RESOLVED" }
  ] as const;

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.cases.detailEyebrow}
        subtitle={detail.case.summary}
        title={detail.case.title}
      />
      <Card title={messages.cases.statusCard}>
        <div className="detail-grid">
          <div className="detail-item">
            <span>{messages.cases.status}</span>
            <Pill
              tone={toneForStatus(detail.case.status)}
              value={formatCode(detail.case.status, messages.statuses, messages.common.none)}
            />
          </div>
          <div className="detail-item">
            <span>{messages.cases.severity}</span>
            <Pill
              tone={toneForStatus(detail.case.severity)}
              value={formatCode(detail.case.severity, messages.statuses, messages.common.none)}
            />
          </div>
          <div className="detail-item">
            <span>{messages.cases.assignedOperator}</span>
            <strong>{detail.case.assignedOperatorAccountId ?? messages.common.none}</strong>
          </div>
          <div className="detail-item">
            <span>{messages.cases.subject}</span>
            <strong>{detail.case.subject.label ?? detail.case.subject.subjectId}</strong>
          </div>
        </div>
      </Card>
      <div className="split-grid">
        <Card title={messages.cases.notes}>
          <div className="stack">
            {detail.notes.length === 0 ? (
              <p className="empty-state">{messages.cases.noNotes}</p>
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
              <label htmlFor="bodyMarkdown">{messages.cases.bodyMarkdown}</label>
              <textarea id="bodyMarkdown" name="bodyMarkdown" />
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                {messages.cases.addNote}
              </button>
            </div>
          </form>
        </Card>
        <div className="stack">
          <Card title={messages.cases.assignment}>
            <form action={assignCaseAction} className="form-grid">
              <input name="caseId" type="hidden" value={detail.case.id} />
              <div className="field">
                <label htmlFor="assignedOperatorAccountId">{messages.cases.assignedOperator}</label>
                <input
                  defaultValue={detail.case.assignedOperatorAccountId ?? ""}
                  id="assignedOperatorAccountId"
                  name="assignedOperatorAccountId"
                  placeholder={messages.common.blankToUnassign}
                />
              </div>
              <div className="actions-row">
                <button className="button button-secondary" type="submit">
                  {messages.cases.updateAssignment}
                </button>
              </div>
            </form>
          </Card>
          <Card title={messages.cases.status}>
            <form action={updateCaseStatusAction} className="form-grid">
              <input name="caseId" type="hidden" value={detail.case.id} />
              <div className="field">
                <label htmlFor="status">{messages.cases.status}</label>
                <select defaultValue={detail.case.status} id="status" name="status">
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.cases.updateStatus}
                </button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
