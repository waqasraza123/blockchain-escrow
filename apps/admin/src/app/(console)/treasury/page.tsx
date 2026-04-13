import { getTreasuryMovements } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  MetricGrid
} from "../ui";

export default async function TreasuryPage() {
  const { messages } = await getI18n();
  const response = await getTreasuryMovements();
  const movements = response.movements;
  const nativeMovementCount = movements.filter((movement) => movement.kind === "NATIVE").length;
  const tokenMovementCount = movements.filter((movement) => movement.kind === "TOKEN").length;
  const visibleChainCount = new Set(movements.map((movement) => movement.chainId)).size;

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.treasury}
        subtitle={messages.treasury.subtitle}
        title={messages.treasury.title}
      />
      <MetricGrid
        items={[
          { label: messages.treasury.totalMovements, value: movements.length },
          { label: messages.treasury.nativeMovements, value: nativeMovementCount },
          { label: messages.treasury.tokenMovements, value: tokenMovementCount },
          { label: messages.treasury.visibleChains, value: visibleChainCount }
        ]}
      />
      <Card title={messages.treasury.latestMovements}>
        {movements.length === 0 ? (
          <EmptyState body={messages.treasury.empty} />
        ) : (
          <DataTable
            headers={[
              messages.treasury.chain,
              messages.reconciliation.kind,
              messages.treasury.amount,
              messages.treasury.asset,
              messages.treasury.feeVault,
              messages.treasury.treasuryAddress,
              messages.treasury.tx,
              messages.reconciliation.updated
            ]}
          >
            {movements.map((movement) => (
              <tr key={`${movement.chainId}:${movement.transactionHash}:${movement.occurredLogIndex}`}>
                <td>{`${movement.network} (${movement.chainId})`}</td>
                <td>
                  {formatCode(
                    movement.kind,
                    messages.codes.treasuryMovementKinds,
                    messages.common.none
                  )}
                </td>
                <td className="mono">{movement.amount}</td>
                <td className="mono">
                  {movement.tokenAddress ??
                    formatCode(
                      movement.kind,
                      messages.codes.treasuryMovementKinds,
                      messages.common.none
                    )}
                </td>
                <td className="mono">{movement.feeVaultAddress}</td>
                <td className="mono">{movement.treasuryAddress}</td>
                <td className="mono">
                  <a
                    href={`${movement.explorerUrl}/tx/${movement.transactionHash}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {movement.transactionHash}
                  </a>
                </td>
                <td className="mono">{movement.occurredAt}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
