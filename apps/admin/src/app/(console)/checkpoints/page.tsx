import Link from "next/link";

import { listCheckpoints } from "../../../lib/operator-api";
import { createCheckpointAction } from "../actions";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus
} from "../ui";

export default async function CheckpointsPage() {
  const checkpoints = await listCheckpoints();

  return (
    <>
      <ConsoleHeader
        eyebrow="Sanctions"
        subtitle="Manual sanctions checkpoints linked to operational subjects."
        title="Compliance Checkpoints"
      />
      <div className="split-grid">
        <Card title="Create Checkpoint">
          <form action={createCheckpointAction} className="form-grid">
            <div className="field">
              <label htmlFor="subjectType">Subject Type</label>
              <select defaultValue="DRAFT_DEAL" id="subjectType" name="subjectType">
                <option value="DRAFT_DEAL">Draft Deal</option>
                <option value="ESCROW_AGREEMENT">Escrow Agreement</option>
                <option value="DEAL_MILESTONE_DISPUTE">Dispute</option>
                <option value="FUNDING_TRANSACTION">Funding Transaction</option>
                <option value="DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION">
                  Settlement Execution Transaction
                </option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="subjectId">Subject Id</label>
              <input id="subjectId" name="subjectId" placeholder="entity id or address" />
            </div>
            <div className="field">
              <label htmlFor="note">Checkpoint Note</label>
              <textarea id="note" name="note" placeholder="Why this checkpoint exists" />
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                Create Checkpoint
              </button>
            </div>
          </form>
        </Card>
        <Card title="Current Queue">
          {checkpoints.checkpoints.length === 0 ? (
            <EmptyState body="No sanctions checkpoints have been created." />
          ) : (
            <DataTable headers={["Status", "Subject", "Created", "Open"]}>
              {checkpoints.checkpoints.slice(0, 12).map((checkpoint) => (
                <tr key={checkpoint.id}>
                  <td>
                    <Pill
                      tone={toneForStatus(checkpoint.status)}
                      value={checkpoint.status}
                    />
                  </td>
                  <td>{checkpoint.subject.label ?? checkpoint.subject.subjectId}</td>
                  <td className="mono">{checkpoint.createdAt}</td>
                  <td>
                    <Link className="link-text" href={`/checkpoints/${checkpoint.id}`}>
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
