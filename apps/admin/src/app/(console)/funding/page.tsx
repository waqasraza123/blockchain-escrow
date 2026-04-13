import { getFundingTransactions } from "../../../lib/operator-api";
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

export default async function FundingPage() {
  const { messages } = await getI18n();
  const response = await getFundingTransactions();
  const transactions = response.fundingTransactions;
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
        eyebrow={messages.navigation.funding}
        subtitle={messages.funding.subtitle}
        title={messages.funding.title}
      />
      <MetricGrid
        items={[
          { label: messages.funding.totalTransactions, value: transactions.length },
          { label: messages.funding.pendingTransactions, value: pendingCount },
          { label: messages.funding.confirmedTransactions, value: confirmedCount },
          { label: messages.funding.attentionRequired, value: attentionCount },
          { label: messages.funding.visibleChains, value: visibleChainCount }
        ]}
      />
      <Card title={messages.funding.latestTransactions}>
        {transactions.length === 0 ? (
          <EmptyState body={messages.funding.empty} />
        ) : (
          <DataTable
            headers={[
              messages.funding.chain,
              messages.funding.organization,
              messages.funding.draft,
              messages.funding.version,
              messages.funding.status,
              messages.funding.staleSignal,
              messages.funding.wallet,
              messages.funding.tx,
              messages.funding.agreement,
              messages.funding.submitted
            ]}
          >
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{`${transaction.network} (${transaction.chainId})`}</td>
                <td>{transaction.organizationName ?? transaction.organizationId}</td>
                <td>{transaction.draftDealTitle ?? transaction.draftDealId}</td>
                <td>{transaction.dealVersionTitle ?? transaction.dealVersionId}</td>
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
