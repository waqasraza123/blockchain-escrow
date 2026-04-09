import Link from "next/link";

import { listProtocolProposals } from "../../../lib/operator-api";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState
} from "../ui";

export default async function ProtocolProposalsPage() {
  const proposals = await listProtocolProposals();

  return (
    <>
      <ConsoleHeader
        eyebrow="Protocol Admin"
        subtitle="Safe-oriented proposal drafts for registry, config, and pause changes."
        title="Protocol Proposals"
      />
      <Card
        actions={
          <Link className="button" href="/protocol-proposals/new">
            New Proposal
          </Link>
        }
        title="Draft Proposals"
      >
        {proposals.proposals.length === 0 ? (
          <EmptyState body="No Safe proposal drafts have been created yet." />
        ) : (
          <DataTable headers={["Action", "Target", "Chain", "Created", "Open"]}>
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
