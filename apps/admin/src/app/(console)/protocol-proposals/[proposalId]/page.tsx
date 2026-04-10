import { getProtocolProposal } from "../../../../lib/operator-api";
import { getI18n } from "../../../../lib/i18n/server";
import { Card, ConsoleHeader } from "../../ui";

type ProtocolProposalDetailPageProps = {
  params: Promise<{ proposalId: string }>;
};

export default async function ProtocolProposalDetailPage({
  params
}: ProtocolProposalDetailPageProps) {
  const { proposalId } = await params;
  const { messages } = await getI18n();
  const proposal = await getProtocolProposal(proposalId);

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.protocol.detailEyebrow}
        subtitle={proposal.proposal.description}
        title={proposal.proposal.action}
      />
      <Card title={messages.protocol.metadata}>
        <div className="detail-grid">
          <div className="detail-item">
            <span>{messages.protocol.target}</span>
            <strong>{proposal.proposal.target}</strong>
          </div>
          <div className="detail-item">
            <span>{messages.protocol.chain}</span>
            <strong>{proposal.proposal.chainId}</strong>
          </div>
          <div className="detail-item">
            <span>{messages.protocol.targetAddress}</span>
            <code className="mono">{proposal.proposal.targetAddress}</code>
          </div>
          <div className="detail-item">
            <span>{messages.protocol.value}</span>
            <strong>{proposal.proposal.value}</strong>
          </div>
        </div>
      </Card>
      <div className="split-grid">
        <Card title={messages.protocol.inputTitle}>
          <pre className="mono">{JSON.stringify(proposal.proposal.input, null, 2)}</pre>
        </Card>
        <Card title={messages.protocol.calldata}>
          <pre className="mono">{proposal.proposal.calldata}</pre>
        </Card>
      </div>
    </>
  );
}
