import Link from "next/link";

import { listCases } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
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
  const { messages } = await getI18n();
  const cases = await listCases();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.cases}
        subtitle={messages.cases.subtitle}
        title={messages.cases.title}
      />
      <div className="split-grid">
        <Card title={messages.cases.newCase}>
          <form action={createCaseAction} className="form-grid">
            <div className="form-grid columns-2">
              <div className="field">
                <label htmlFor="subjectType">{messages.cases.subjectType}</label>
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
                <label htmlFor="severity">{messages.cases.severity}</label>
                <select defaultValue="HIGH" id="severity" name="severity">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="subjectId">{messages.cases.subjectId}</label>
              <input id="subjectId" name="subjectId" placeholder="entity id or address" />
            </div>
            <div className="field">
              <label htmlFor="title">{messages.cases.titleLabel}</label>
              <input id="title" name="title" placeholder="Short case title" />
            </div>
            <div className="field">
              <label htmlFor="summary">{messages.cases.summary}</label>
              <textarea id="summary" name="summary" placeholder="Describe the issue" />
            </div>
            <div className="form-grid columns-2">
              <div className="field">
                <label htmlFor="alertId">Linked alert id</label>
                <input id="alertId" name="alertId" placeholder="optional" />
              </div>
              <div className="field">
                <label htmlFor="checkpointId">{messages.cases.checkpointId}</label>
                <input id="checkpointId" name="checkpointId" placeholder="optional" />
              </div>
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                {messages.cases.create}
              </button>
            </div>
          </form>
        </Card>
        <Card title={messages.cases.currentCases}>
          {cases.cases.length === 0 ? (
            <EmptyState body="No compliance cases exist yet." />
          ) : (
            <DataTable headers={[messages.cases.titleLabel, messages.cases.status, messages.cases.severity, "Updated", messages.cases.open]}>
              {cases.cases.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.title}</td>
                  <td>
                    <Pill
                      tone={toneForStatus(entry.status)}
                      value={formatCode(entry.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td>
                    <Pill
                      tone={toneForStatus(entry.severity)}
                      value={formatCode(entry.severity, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td className="mono">{entry.lastNoteAt ?? entry.createdAt}</td>
                  <td>
                    <Link className="link-text" href={`/cases/${entry.id}`}>
                      {messages.cases.detail}
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
