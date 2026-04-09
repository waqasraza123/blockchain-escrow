import { listCheckpoints } from "../../../../lib/operator-api";
import { decideCheckpointAction } from "../../actions";
import { Card, ConsoleHeader, Pill, toneForStatus } from "../../ui";

type CheckpointDetailPageProps = {
  params: Promise<{ checkpointId: string }>;
};

export default async function CheckpointDetailPage({
  params
}: CheckpointDetailPageProps) {
  const { checkpointId } = await params;
  const checkpoints = await listCheckpoints();
  const checkpoint =
    checkpoints.checkpoints.find((entry) => entry.id === checkpointId) ?? null;

  if (!checkpoint) {
    return (
      <>
        <ConsoleHeader eyebrow="Checkpoint" title="Not Found" />
        <Card>
          <p className="empty-state">Checkpoint {checkpointId} was not found.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <ConsoleHeader
        eyebrow="Checkpoint Detail"
        subtitle={checkpoint.subject.label ?? checkpoint.subject.subjectId}
        title={checkpoint.id}
      />
      <Card title="Checkpoint State">
        <div className="detail-grid">
          <div className="detail-item">
            <span>Status</span>
            <Pill tone={toneForStatus(checkpoint.status)} value={checkpoint.status} />
          </div>
          <div className="detail-item">
            <span>Kind</span>
            <strong>{checkpoint.kind}</strong>
          </div>
          <div className="detail-item">
            <span>Created</span>
            <strong className="mono">{checkpoint.createdAt}</strong>
          </div>
          <div className="detail-item">
            <span>Decision</span>
            <strong>{checkpoint.decisionNote ?? "pending"}</strong>
          </div>
        </div>
        <p className="muted">{checkpoint.note}</p>
      </Card>
      <Card title="Decision">
        <form action={decideCheckpointAction} className="form-grid">
          <input name="checkpointId" type="hidden" value={checkpoint.id} />
          <div className="field">
            <label htmlFor="status">Status</label>
            <select defaultValue="CLEARED" id="status" name="status">
              <option value="CLEARED">Cleared</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="note">Decision Note</label>
            <textarea id="note" name="note" placeholder="Explain the decision" />
          </div>
          <div className="actions-row">
            <button className="button" type="submit">
              Submit Decision
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
