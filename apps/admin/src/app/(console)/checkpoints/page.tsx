import Link from "next/link";

import { listCheckpoints } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
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
  const { messages } = await getI18n();
  const checkpoints = await listCheckpoints();
  const subjectTypeOptions = [
    "DRAFT_DEAL",
    "ESCROW_AGREEMENT",
    "DEAL_MILESTONE_DISPUTE",
    "FUNDING_TRANSACTION",
    "DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION"
  ] as const;

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.checkpoints.sanctionsEyebrow}
        subtitle={messages.checkpoints.subtitle}
        title={messages.checkpoints.title}
      />
      <div className="split-grid">
        <Card title={messages.checkpoints.createTitle}>
          <form action={createCheckpointAction} className="form-grid">
            <div className="field">
              <label htmlFor="subjectType">{messages.checkpoints.subjectType}</label>
              <select defaultValue="DRAFT_DEAL" id="subjectType" name="subjectType">
                {subjectTypeOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatCode(value, messages.codes.subjectTypes, messages.common.none)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subjectId">{messages.checkpoints.subjectId}</label>
              <input
                id="subjectId"
                name="subjectId"
                placeholder={messages.checkpoints.subjectPlaceholder}
              />
            </div>
            <div className="field">
              <label htmlFor="note">{messages.checkpoints.note}</label>
              <textarea id="note" name="note" placeholder={messages.checkpoints.whyExists} />
            </div>
            <div className="actions-row">
              <button className="button" type="submit">
                {messages.checkpoints.create}
              </button>
            </div>
          </form>
        </Card>
        <Card title={messages.checkpoints.currentQueue}>
          {checkpoints.checkpoints.length === 0 ? (
            <EmptyState body={messages.checkpoints.empty} />
          ) : (
            <DataTable
              headers={[
                messages.checkpoints.status,
                messages.checkpoints.subject,
                messages.checkpoints.chain,
                messages.checkpoints.created,
                messages.checkpoints.open
              ]}
            >
              {checkpoints.checkpoints.slice(0, 12).map((checkpoint) => (
                <tr key={checkpoint.id}>
                  <td>
                    <Pill
                      tone={toneForStatus(checkpoint.status)}
                      value={formatCode(checkpoint.status, messages.statuses, messages.common.none)}
                    />
                  </td>
                  <td>{checkpoint.subject.label ?? checkpoint.subject.subjectId}</td>
                  <td>
                    {checkpoint.subject.chainId !== null
                      ? `${checkpoint.subject.network ?? messages.common.none} (${checkpoint.subject.chainId})`
                      : messages.common.na}
                  </td>
                  <td className="mono">{checkpoint.createdAt}</td>
                  <td>
                    <Link className="link-text" href={`/checkpoints/${checkpoint.id}`}>
                      {messages.checkpoints.detail}
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
