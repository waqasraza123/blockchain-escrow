import Link from "next/link";

import { listProtocolProposals } from "../../../lib/operator-api";
import { getI18n } from "../../../lib/i18n/server";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState
} from "../ui";

export default async function ProtocolProposalsPage() {
  const { messages } = await getI18n();
  const proposals = await listProtocolProposals();

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.protocol.proposalAdmin}
        subtitle={messages.protocol.subtitle}
        title={messages.protocol.title}
      />
      <Card
        actions={
          <Link className="button" href="/protocol-proposals/new">
            {messages.protocol.newProposal}
          </Link>
        }
        title={messages.protocol.drafts}
      >
        {proposals.proposals.length === 0 ? (
          <EmptyState body={messages.protocol.noDrafts} />
        ) : (
          <DataTable headers={[messages.protocol.action, messages.protocol.target, messages.protocol.chain, "Created", messages.protocol.open]}>
            {proposals.proposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.action}</td>
                <td>{proposal.target}</td>
                <td>{proposal.chainId}</td>
                <td className="mono">{proposal.createdAt}</td>
                <td>
                  <Link className="link-text" href={`/protocol-proposals/${proposal.id}`}>
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
