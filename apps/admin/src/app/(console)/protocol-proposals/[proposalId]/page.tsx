import { getProtocolProposal } from "../../../../lib/operator-api";
import { Card, ConsoleHeader } from "../../ui";

type ProtocolProposalDetailPageProps = {
  params: Promise<{ proposalId: string }>;
};

export default async function ProtocolProposalDetailPage({
  params
}: ProtocolProposalDetailPageProps) {
  const { proposalId } = await params;
  const proposal = await getProtocolProposal(proposalId);

  return (
    <>
      <ConsoleHeader
        eyebrow="Proposal Detail"
        subtitle={proposal.proposal.description}
        title={proposal.proposal.action}
      />
      <Card title="Proposal Metadata">
        <div className="detail-grid">
          <div className="detail-item">
            <span>Target</span>
            <strong>{proposal.proposal.target}</strong>
          </div>
          <div className="detail-item">
            <span>Chain</span>
            <strong>{proposal.proposal.chainId}</strong>
          </div>
          <div className="detail-item">
            <span>Target Address</span>
            <code className="mono">{proposal.proposal.targetAddress}</code>
          </div>
          <div className="detail-item">
            <span>Value</span>
            <strong>{proposal.proposal.value}</strong>
          </div>
        </div>
      </Card>
      <div className="split-grid">
        <Card title="Input">
          <pre className="mono">{JSON.stringify(proposal.proposal.input, null, 2)}</pre>
        </Card>
        <Card title="Calldata">
          <pre className="mono">{proposal.proposal.calldata}</pre>
        </Card>
      </div>
    </>
  );
}
