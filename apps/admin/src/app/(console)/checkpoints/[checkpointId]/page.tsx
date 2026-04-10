import { listCheckpoints } from "../../../../lib/operator-api";
import { formatCode } from "../../../../lib/i18n/format";
import { getI18n } from "../../../../lib/i18n/server";
import { decideCheckpointAction } from "../../actions";
import { Card, ConsoleHeader, Pill, toneForStatus } from "../../ui";

type CheckpointDetailPageProps = {
  params: Promise<{ checkpointId: string }>;
};

export default async function CheckpointDetailPage({
  params
}: CheckpointDetailPageProps) {
  const { checkpointId } = await params;
  const { messages } = await getI18n();
  const checkpoints = await listCheckpoints();
  const checkpoint =
    checkpoints.checkpoints.find((entry) => entry.id === checkpointId) ?? null;

  if (!checkpoint) {
    return (
      <>
        <ConsoleHeader eyebrow={messages.navigation.checkpoints} title={messages.common.notFound} />
        <Card>
          <p className="empty-state">{messages.checkpoints.notFound} <span className="mono">{checkpointId}</span>.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.checkpoints.detailEyebrow}
        subtitle={checkpoint.subject.label ?? checkpoint.subject.subjectId}
        title={checkpoint.id}
      />
      <Card title={messages.checkpoints.title}>
        <div className="detail-grid">
          <div className="detail-item">
            <span>{messages.checkpoints.status}</span>
            <Pill
              tone={toneForStatus(checkpoint.status)}
              value={formatCode(checkpoint.status, messages.statuses, messages.common.none)}
            />
          </div>
          <div className="detail-item">
            <span>{messages.checkpoints.kind}</span>
            <strong>{checkpoint.kind}</strong>
          </div>
          <div className="detail-item">
            <span>Created</span>
            <strong className="mono">{checkpoint.createdAt}</strong>
          </div>
          <div className="detail-item">
            <span>{messages.checkpoints.decision}</span>
            <strong>{checkpoint.decisionNote ?? messages.common.pending}</strong>
          </div>
        </div>
        <p className="muted">{checkpoint.note}</p>
      </Card>
      <Card title={messages.checkpoints.decision}>
        <form action={decideCheckpointAction} className="form-grid">
          <input name="checkpointId" type="hidden" value={checkpoint.id} />
          <div className="field">
            <label htmlFor="status">{messages.checkpoints.status}</label>
            <select defaultValue="CLEARED" id="status" name="status">
              <option value="CLEARED">Cleared</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="note">{messages.checkpoints.decisionNote}</label>
            <textarea id="note" name="note" placeholder={messages.checkpoints.explainDecision} />
          </div>
          <div className="actions-row">
            <button className="button" type="submit">
              {messages.checkpoints.submitDecision}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
