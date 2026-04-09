import Link from "next/link";

import { listCases } from "../../../lib/operator-api";
import { createCaseAction } from "../actions";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus
} from "../ui";

export default async function CasesPage() {
  const cases = await listCases();

  return (
    <>
      <ConsoleHeader
        eyebrow="Cases"
        subtitle="Workflow-linked compliance cases with notes, assignment, and status transitions."
        title="Compliance Cases"
      />
      <div className="split-grid">
        <Card title="Open New Case">
          <form action={createCaseAction} className="form-grid">
            <div className="form-grid columns-2">
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
                <label htmlFor="severity">Severity</label>
                <select defaultValue="HIGH" id="severity" name="severity">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="subjectId">Subject Id</label>
              <input id="subjectId" name="subjectId" placeholder="entity id or address" />
            </div>
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" placeholder="Short case title" />
            </div>
            <div className="field">
              <label htmlFor="summary">Summary</label>
              <textarea id="summary" name="summary" placeholder="Describe the issue" />
            </div>
            <div className="form-grid columns-2">
              <div className="field">
                <label htmlFor="alertId">Linked Alert Id</label>
                <input id="alertId" name="alertId" placeholder="optional" />
              </div>
              <div className="field">
                <label htmlFor="checkpointId">Linked Checkpoint Id</label>
                <input id="checkpointId" name="checkpointId" placeholder="optional" />
              </div>
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                Create Case
              </button>
            </div>
          </form>
        </Card>
        <Card title="Current Cases">
          {cases.cases.length === 0 ? (
            <EmptyState body="No compliance cases exist yet." />
          ) : (
            <DataTable headers={["Title", "Status", "Severity", "Updated", "Open"]}>
              {cases.cases.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.title}</td>
                  <td>
                    <Pill tone={toneForStatus(entry.status)} value={entry.status} />
                  </td>
                  <td>
                    <Pill tone={toneForStatus(entry.severity)} value={entry.severity} />
                  </td>
                  <td className="mono">{entry.lastNoteAt ?? entry.createdAt}</td>
                  <td>
                    <Link className="link-text" href={`/cases/${entry.id}`}>
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
