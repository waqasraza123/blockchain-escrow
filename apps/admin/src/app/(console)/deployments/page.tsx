import { getDeployments } from "../../../lib/operator-api";
import { formatBoolean, formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import { Card, ConsoleHeader, EmptyState, MetricGrid, Pill, toneForStatus } from "../ui";

function formatOptionalBoolean(
  value: boolean | null,
  messages: Awaited<ReturnType<typeof getI18n>>["messages"]
): string {
  if (value == null) {
    return messages.common.na;
  }

  return formatBoolean(value, messages);
}

export default async function DeploymentsPage() {
  const { messages } = await getI18n();
  const response = await getDeployments();
  const deployments = response.deployments;
  const freshCursorCount = deployments.filter((deployment) => deployment.cursorFresh).length;
  const consistentTreasuryCount = deployments.filter(
    (deployment) => deployment.treasury.status === "CONSISTENT"
  ).length;
  const indexedDeploymentCount = deployments.filter(
    (deployment) => deployment.protocolConfig.indexed || deployment.feeVault.indexed
  ).length;
  const totalAgreementCount = deployments.reduce(
    (sum, deployment) => sum + deployment.agreementCount,
    0
  );

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.deployments}
        subtitle={messages.deployments.subtitle}
        title={messages.deployments.title}
      />
      <MetricGrid
        items={[
          { label: messages.deployments.visibleDeployments, value: deployments.length },
          { label: messages.deployments.freshCursors, value: freshCursorCount },
          { label: messages.deployments.indexedDeployments, value: indexedDeploymentCount },
          { label: messages.deployments.totalAgreements, value: totalAgreementCount },
          { label: messages.deployments.consistentTreasuries, value: consistentTreasuryCount }
        ]}
      />
      {deployments.length === 0 ? (
        <Card title={messages.deployments.title}>
          <EmptyState body={messages.deployments.empty} />
        </Card>
      ) : null}
      {deployments.map((deployment) => (
        <Card
          key={`${deployment.network}:${deployment.chainId}`}
          title={`${deployment.network} (${deployment.chainId})`}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span>{messages.deployments.network}</span>
              <strong>{deployment.network}</strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.chainId}</span>
              <strong>{deployment.chainId}</strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.contractVersion}</span>
              <strong>{deployment.contractVersion}</strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.agreements}</span>
              <strong>{deployment.agreementCount}</strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.cursorFresh}</span>
              <Pill
                tone={deployment.cursorFresh ? "success" : "warning"}
                value={
                  deployment.cursorFresh
                    ? formatCode("FRESH", messages.statuses, messages.common.none)
                    : formatCode("STALE", messages.statuses, messages.common.none)
                }
              />
            </div>
            <div className="detail-item">
              <span>{messages.deployments.cursorUpdated}</span>
              <strong className="mono">
                {deployment.cursorUpdatedAt ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.treasuryStatus}</span>
              <Pill
                tone={toneForStatus(deployment.treasury.status)}
                value={formatCode(
                  deployment.treasury.status,
                  messages.statuses,
                  messages.common.none
                )}
              />
            </div>
            <div className="detail-item">
              <span>{messages.deployments.deploymentStartBlock}</span>
              <strong className="mono">
                {deployment.deploymentStartBlock ?? messages.common.na}
              </strong>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span>{messages.deployments.manifestTreasury}</span>
              <strong className="mono">
                {deployment.manifestTreasuryAddress ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.manifestOwner}</span>
              <strong className="mono">
                {deployment.manifestOwner ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.manifestPendingOwner}</span>
              <strong className="mono">
                {deployment.manifestPendingOwner ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.manifestProtocolFee}</span>
              <strong>{deployment.manifestProtocolFeeBps}</strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.settlementToken}</span>
              <strong className="mono">
                {deployment.settlementTokenAddress ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.explorer}</span>
              <a href={deployment.explorerUrl} rel="noreferrer" target="_blank">
                {messages.deployments.openExplorer}
              </a>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span>{messages.deployments.protocolIndexed}</span>
              <Pill
                tone={deployment.protocolConfig.indexed ? "success" : "warning"}
                value={formatBoolean(deployment.protocolConfig.indexed, messages)}
              />
            </div>
            <div className="detail-item">
              <span>{messages.deployments.protocolAddress}</span>
              <strong className="mono">
                {deployment.protocolConfig.address ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.protocolTreasury}</span>
              <strong className="mono">
                {deployment.protocolConfig.treasuryAddress ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.protocolFeeVault}</span>
              <strong className="mono">
                {deployment.protocolConfig.feeVaultAddress ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.protocolFeeBps}</span>
              <strong>{deployment.protocolConfig.protocolFeeBps ?? messages.common.na}</strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.createEscrowPaused}</span>
              <strong>
                {formatOptionalBoolean(deployment.protocolConfig.createEscrowPaused, messages)}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.fundingPaused}</span>
              <strong>
                {formatOptionalBoolean(deployment.protocolConfig.fundingPaused, messages)}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.protocolUpdated}</span>
              <strong className="mono">
                {deployment.protocolConfig.updatedAt ?? messages.common.na}
              </strong>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span>{messages.deployments.feeVaultIndexed}</span>
              <Pill
                tone={deployment.feeVault.indexed ? "success" : "warning"}
                value={formatBoolean(deployment.feeVault.indexed, messages)}
              />
            </div>
            <div className="detail-item">
              <span>{messages.deployments.feeVaultAddress}</span>
              <strong className="mono">
                {deployment.feeVault.address ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.feeVaultTreasury}</span>
              <strong className="mono">
                {deployment.feeVault.treasuryAddress ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.feeVaultOwner}</span>
              <strong className="mono">
                {deployment.feeVault.owner ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.feeVaultPendingOwner}</span>
              <strong className="mono">
                {deployment.feeVault.pendingOwner ?? messages.common.na}
              </strong>
            </div>
            <div className="detail-item">
              <span>{messages.deployments.feeVaultUpdated}</span>
              <strong className="mono">
                {deployment.feeVault.updatedAt ?? messages.common.na}
              </strong>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
