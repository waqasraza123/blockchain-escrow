import { getSettlementExecutions } from "../../../lib/operator-api";
import { formatCode } from "../../../lib/i18n/format";
import { getI18n } from "../../../lib/i18n/server";
import {
  Card,
  ConsoleHeader,
  DataTable,
  EmptyState,
  MetricGrid,
  Pill,
  toneForStatus
} from "../ui";

function requiresAttention(transaction: {
  stalePending: boolean | null;
  status: string;
}): boolean {
  return (
    transaction.stalePending === true ||
    transaction.status === "FAILED" ||
    transaction.status === "MISMATCHED"
  );
}

function formatMilestoneLabel(input: {
  milestonePosition: number | null;
  milestoneTitle: string | null;
}): string {
  if (input.milestonePosition !== null && input.milestoneTitle) {
    return `#${input.milestonePosition} ${input.milestoneTitle}`;
  }

  if (input.milestonePosition !== null) {
    return `#${input.milestonePosition}`;
  }

  return input.milestoneTitle ?? "";
}

export default async function SettlementsPage() {
  const { messages } = await getI18n();
  const response = await getSettlementExecutions();
  const transactions = response.executionTransactions;
  const pendingCount = transactions.filter(
    (transaction) => transaction.status === "PENDING"
  ).length;
  const confirmedCount = transactions.filter(
    (transaction) => transaction.status === "CONFIRMED"
  ).length;
  const attentionCount = transactions.filter(requiresAttention).length;
  const visibleChainCount = new Set(
    transactions.map((transaction) => transaction.chainId)
  ).size;

  return (
    <>
      <ConsoleHeader
        eyebrow={messages.navigation.settlements}
        subtitle={messages.settlements.subtitle}
        title={messages.settlements.title}
      />
      <MetricGrid
        items={[
          { label: messages.settlements.totalTransactions, value: transactions.length },
          { label: messages.settlements.pendingTransactions, value: pendingCount },
          {
            label: messages.settlements.confirmedTransactions,
            value: confirmedCount
          },
          { label: messages.settlements.attentionRequired, value: attentionCount },
          { label: messages.settlements.visibleChains, value: visibleChainCount }
        ]}
      />
      <Card title={messages.settlements.latestTransactions}>
        {transactions.length === 0 ? (
          <EmptyState body={messages.settlements.empty} />
        ) : (
          <DataTable
            headers={[
              messages.settlements.chain,
              messages.settlements.organization,
              messages.settlements.draft,
              messages.settlements.milestone,
              messages.settlements.requestKind,
              messages.settlements.status,
              messages.settlements.staleSignal,
              messages.settlements.wallet,
              messages.settlements.tx,
              messages.settlements.agreement,
              messages.settlements.submitted
            ]}
          >
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{`${transaction.network} (${transaction.chainId})`}</td>
                <td>{transaction.organizationName ?? transaction.organizationId}</td>
                <td>{transaction.draftDealTitle ?? transaction.draftDealId}</td>
                <td>
                  {formatMilestoneLabel(transaction) || messages.common.none}
                </td>
                <td>
                  {transaction.requestKind
                    ? formatCode(
                        transaction.requestKind,
                        messages.codes.settlementRequestKinds,
                        messages.common.none
                      )
                    : messages.common.na}
                </td>
                <td>
                  <Pill
                    tone={toneForStatus(transaction.status)}
                    value={formatCode(
                      transaction.status,
                      messages.statuses,
                      messages.common.none
                    )}
                  />
                </td>
                <td>
                  {transaction.stalePendingEvaluation ? (
                    <Pill
                      tone={
                        transaction.stalePending
                          ? "danger"
                          : toneForStatus(transaction.stalePendingEvaluation)
                      }
                      value={formatCode(
                        transaction.stalePendingEvaluation,
                        messages.codes.fundingStalePendingEvaluations,
                        messages.common.none
                      )}
                    />
                  ) : (
                    messages.common.na
                  )}
                </td>
                <td className="mono">{transaction.submittedWalletAddress}</td>
                <td className="mono">
                  <a
                    href={`${transaction.explorerUrl}/tx/${transaction.transactionHash}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {transaction.transactionHash}
                  </a>
                </td>
                <td className="mono">
                  {transaction.agreementAddress ? (
                    <a
                      href={`${transaction.explorerUrl}/address/${transaction.agreementAddress}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {transaction.agreementAddress}
                    </a>
                  ) : (
                    messages.common.na
                  )}
                </td>
                <td className="mono">{transaction.submittedAt}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
