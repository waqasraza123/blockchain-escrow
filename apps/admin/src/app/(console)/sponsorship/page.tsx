import { listSponsoredTransactionRequests } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { decideSponsoredTransactionRequestAction } from "../actions";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus
} from "../ui";

export default async function SponsorshipPage() {
  const { messages } = await getI18n();
  const requests = await listSponsoredTransactionRequests();
  const pendingRequests = requests.sponsoredTransactionRequests.filter(
    (entry) => entry.status === "PENDING"
  );
  const decidedRequests = requests.sponsoredTransactionRequests.filter(
    (entry) => entry.status !== "PENDING"
  );

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.sponsorship.pendingQueue}
        subtitle={messages.sponsorship.subtitle}
        title={messages.sponsorship.title}
      />
      <Card title={messages.sponsorship.queue}>
        {pendingRequests.length === 0 ? (
          <EmptyState body={messages.sponsorship.empty} />
        ) : (
          <DataTable
            headers={[
              messages.sponsorship.kind,
              messages.sponsorship.subject,
              messages.sponsorship.wallet,
              messages.sponsorship.requestedBy,
              messages.sponsorship.created,
              messages.sponsorship.actions
            ]}
          >
            {pendingRequests.map((request) => (
              <tr key={request.id}>
                <td>{formatCode(request.kind, {}, messages.common.none)}</td>
                <td>{request.subject.label ?? request.subject.subjectId}</td>
                <td className="mono">{request.walletAddress}</td>
                <td className="mono">{request.requestedByUserId}</td>
                <td className="mono">{request.createdAt}</td>
                <td>
                  <div className="actions-row">
                    <form action={decideSponsoredTransactionRequestAction}>
                      <input
                        name="sponsoredTransactionRequestId"
                        type="hidden"
                        value={request.id}
                      />
                      <input name="status" type="hidden" value="APPROVED" />
                      <button className="button" type="submit">
                        {messages.sponsorship.approve}
                      </button>
                    </form>
                    <form action={decideSponsoredTransactionRequestAction}>
                      <input
                        name="sponsoredTransactionRequestId"
                        type="hidden"
                        value={request.id}
                      />
                      <input name="status" type="hidden" value="REJECTED" />
                      <input
                        name="note"
                        placeholder={messages.sponsorship.reviewNote}
                      />
                      <button className="button button-secondary" type="submit">
                        {messages.sponsorship.reject}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
      <Card title={messages.sponsorship.pendingQueue}>
        {decidedRequests.length === 0 ? (
          <EmptyState body={messages.sponsorship.empty} />
        ) : (
          <DataTable
            headers={[
              messages.sponsorship.kind,
              messages.sponsorship.status,
              messages.sponsorship.subject,
              messages.sponsorship.wallet,
              messages.sponsorship.decisionNote,
              messages.sponsorship.submittedHash
            ]}
          >
            {decidedRequests.map((request) => (
              <tr key={request.id}>
                <td>{formatCode(request.kind, {}, messages.common.none)}</td>
                <td>
                  <Pill
                    tone={toneForStatus(request.status)}
                    value={formatCode(request.status, messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{request.subject.label ?? request.subject.subjectId}</td>
                <td className="mono">{request.walletAddress}</td>
                <td>{request.reason ?? messages.common.none}</td>
                <td className="mono">
                  {request.submittedTransactionHash ?? messages.common.none}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
