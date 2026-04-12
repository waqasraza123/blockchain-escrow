import { formatCode } from "../../../../../lib/i18n/format";
import {
  listGasPolicies,
  listSponsoredTransactionRequests,
  listWallets
} from "../../../../../lib/api";
import { getI18n } from "../../../../../lib/i18n/server";
import {
  createGasPolicyAction,
  updateGasPolicyAction,
  upsertWalletProfileAction
} from "../../../actions";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  WorkspaceHeader,
  toneForStatus
} from "../../../ui";

type WalletsPageProps = {
  params: Promise<{ organizationId: string }>;
};

function formatCsv(values: Array<number | string>): string {
  return values.join(", ");
}

export default async function WalletsPage(props: WalletsPageProps) {
  const { organizationId } = await props.params;
  const { messages } = await getI18n();
  const [wallets, gasPolicies, sponsoredRequests] = await Promise.all([
    listWallets(),
    listGasPolicies(organizationId),
    listSponsoredTransactionRequests(organizationId)
  ]);
  const returnPath = `/orgs/${organizationId}/wallets`;

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.wallets.eyebrow}
        subtitle={messages.wallets.subtitle}
        title={messages.wallets.title}
      />
      <div className="split-grid">
        <Card title={messages.wallets.walletProfiles}>
          {wallets.wallets.length === 0 ? (
            <EmptyState body={messages.wallets.noWallets} />
          ) : (
            <div className="stack">
              {wallets.wallets.map((wallet) => (
                <form
                  action={upsertWalletProfileAction}
                  className="form-grid"
                  key={wallet.id}
                >
                  <input name="walletId" type="hidden" value={wallet.id} />
                  <input name="returnPath" type="hidden" value={returnPath} />
                  <input name="defaultOrganizationId" type="hidden" value={organizationId} />
                  <div className="card-header">
                    <h2>{wallet.profile?.displayName ?? wallet.address}</h2>
                    <Pill
                      tone={wallet.isPrimary ? "success" : "neutral"}
                      value={
                        wallet.isPrimary
                          ? messages.wallets.primaryWallet
                          : messages.wallets.secondaryWallet
                      }
                    />
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="muted">{messages.wallets.walletAddress}</span>
                      <strong className="mono">{wallet.address}</strong>
                    </div>
                    <div className="detail-item">
                      <span className="muted">{messages.wallets.defaultGasPolicy}</span>
                      <strong className="mono">
                        {wallet.profile?.defaultGasPolicyId ?? messages.common.notConfigured}
                      </strong>
                    </div>
                  </div>
                  <div className="form-grid columns-2">
                    <div className="field">
                      <label htmlFor={`displayName-${wallet.id}`}>
                        {messages.wallets.displayName}
                      </label>
                      <input
                        defaultValue={wallet.profile?.displayName ?? wallet.address}
                        id={`displayName-${wallet.id}`}
                        name="displayName"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`defaultGasPolicyId-${wallet.id}`}>
                        {messages.wallets.defaultGasPolicyId}
                      </label>
                      <input
                        defaultValue={wallet.profile?.defaultGasPolicyId ?? ""}
                        id={`defaultGasPolicyId-${wallet.id}`}
                        list="gas-policy-options"
                        name="defaultGasPolicyId"
                      />
                    </div>
                  </div>
                  <div className="form-grid columns-2">
                    <div className="field">
                      <label htmlFor={`approvalNoteTemplate-${wallet.id}`}>
                        {messages.wallets.approvalNoteTemplate}
                      </label>
                      <textarea
                        defaultValue={wallet.profile?.approvalNoteTemplate ?? ""}
                        id={`approvalNoteTemplate-${wallet.id}`}
                        name="approvalNoteTemplate"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`reviewNoteTemplate-${wallet.id}`}>
                        {messages.wallets.reviewNoteTemplate}
                      </label>
                      <textarea
                        defaultValue={wallet.profile?.reviewNoteTemplate ?? ""}
                        id={`reviewNoteTemplate-${wallet.id}`}
                        name="reviewNoteTemplate"
                      />
                    </div>
                  </div>
                  <label className="checkbox-row">
                    <input
                      defaultChecked={wallet.profile?.sponsorTransactionsByDefault ?? false}
                      name="sponsorTransactionsByDefault"
                      type="checkbox"
                    />
                    <span>{messages.wallets.sponsorByDefault}</span>
                  </label>
                  <div className="actions-row">
                    <button className="button" type="submit">
                      {messages.wallets.saveProfile}
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
          <datalist id="gas-policy-options">
            {gasPolicies.gasPolicies.map((gasPolicy) => (
              <option key={gasPolicy.id} value={gasPolicy.id}>
                {gasPolicy.name}
              </option>
            ))}
          </datalist>
        </Card>

        <Card title={messages.wallets.gasPolicies}>
          <div className="stack">
            {gasPolicies.gasPolicies.length === 0 ? (
              <EmptyState body={messages.wallets.noGasPolicies} />
            ) : (
              <DataTable
                headers={[
                  messages.wallets.policyName,
                  messages.wallets.policyKinds,
                  messages.wallets.policyLimits,
                  messages.wallets.status,
                  messages.wallets.actions
                ]}
              >
                {gasPolicies.gasPolicies.map((gasPolicy) => (
                  <tr key={gasPolicy.id}>
                    <td>
                      <div className="stack compact">
                        <strong>{gasPolicy.name}</strong>
                        <span className="muted">{gasPolicy.description ?? messages.common.none}</span>
                      </div>
                    </td>
                    <td>
                      {gasPolicy.allowedTransactionKinds.map((kind) =>
                        formatCode(kind, messages.codes.sponsoredTransactionKinds, messages.common.none)
                      ).join(", ")}
                    </td>
                    <td>
                      {gasPolicy.maxAmountMinor ?? messages.common.unbounded}
                      {" / "}
                      {gasPolicy.maxRequestsPerDay}
                    </td>
                    <td>
                      <Pill
                        tone={gasPolicy.active ? "success" : "neutral"}
                        value={
                          gasPolicy.active
                            ? messages.common.active
                            : messages.statuses.DISABLED
                        }
                      />
                    </td>
                    <td>
                      <form action={updateGasPolicyAction}>
                        <input name="organizationId" type="hidden" value={organizationId} />
                        <input name="gasPolicyId" type="hidden" value={gasPolicy.id} />
                        <input name="returnPath" type="hidden" value={returnPath} />
                        <div className="stack compact">
                          <div className="field">
                            <label htmlFor={`gas-policy-name-${gasPolicy.id}`}>
                              {messages.wallets.policyName}
                            </label>
                            <input
                              defaultValue={gasPolicy.name}
                              id={`gas-policy-name-${gasPolicy.id}`}
                              name="name"
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`gas-policy-description-${gasPolicy.id}`}>
                              {messages.wallets.policyDescription}
                            </label>
                            <input
                              defaultValue={gasPolicy.description ?? ""}
                              id={`gas-policy-description-${gasPolicy.id}`}
                              name="description"
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`gas-policy-chain-ids-${gasPolicy.id}`}>
                              {messages.wallets.allowedChainIds}
                            </label>
                            <input
                              defaultValue={formatCsv(gasPolicy.allowedChainIds)}
                              id={`gas-policy-chain-ids-${gasPolicy.id}`}
                              name="allowedChainIds"
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`gas-policy-transaction-kinds-${gasPolicy.id}`}>
                              {messages.wallets.allowedTransactionKinds}
                            </label>
                            <input
                              defaultValue={formatCsv(gasPolicy.allowedTransactionKinds)}
                              id={`gas-policy-transaction-kinds-${gasPolicy.id}`}
                              name="allowedTransactionKinds"
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`gas-policy-approval-kinds-${gasPolicy.id}`}>
                              {messages.wallets.allowedApprovalPolicyKinds}
                            </label>
                            <input
                              defaultValue={formatCsv(gasPolicy.allowedApprovalPolicyKinds)}
                              id={`gas-policy-approval-kinds-${gasPolicy.id}`}
                              name="allowedApprovalPolicyKinds"
                            />
                          </div>
                          <div className="form-grid columns-3">
                            <div className="field">
                              <label htmlFor={`gas-policy-max-amount-${gasPolicy.id}`}>
                                {messages.wallets.maxAmountMinor}
                              </label>
                              <input
                                defaultValue={gasPolicy.maxAmountMinor ?? ""}
                                id={`gas-policy-max-amount-${gasPolicy.id}`}
                                name="maxAmountMinor"
                              />
                            </div>
                            <div className="field">
                              <label htmlFor={`gas-policy-max-requests-${gasPolicy.id}`}>
                                {messages.wallets.maxRequestsPerDay}
                              </label>
                              <input
                                defaultValue={String(gasPolicy.maxRequestsPerDay)}
                                id={`gas-policy-max-requests-${gasPolicy.id}`}
                                name="maxRequestsPerDay"
                              />
                            </div>
                            <div className="field">
                              <label htmlFor={`gas-policy-window-${gasPolicy.id}`}>
                                {messages.wallets.sponsorWindowMinutes}
                              </label>
                              <input
                                defaultValue={String(gasPolicy.sponsorWindowMinutes)}
                                id={`gas-policy-window-${gasPolicy.id}`}
                                name="sponsorWindowMinutes"
                              />
                            </div>
                          </div>
                          <label className="checkbox-row">
                            <input
                              defaultChecked={gasPolicy.active}
                              name="active"
                              type="checkbox"
                            />
                            <span>{messages.wallets.policyActive}</span>
                          </label>
                          <button className="button-ghost" type="submit">
                            {messages.wallets.savePolicy}
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}

            <form action={createGasPolicyAction} className="form-grid">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="policy-name">{messages.wallets.policyName}</label>
                  <input id="policy-name" name="name" />
                </div>
                <div className="field">
                  <label htmlFor="policy-description">{messages.wallets.policyDescription}</label>
                  <input id="policy-description" name="description" />
                </div>
              </div>
              <div className="form-grid columns-3">
                <div className="field">
                  <label htmlFor="maxAmountMinor">{messages.wallets.maxAmountMinor}</label>
                  <input id="maxAmountMinor" name="maxAmountMinor" />
                </div>
                <div className="field">
                  <label htmlFor="maxRequestsPerDay">{messages.wallets.maxRequestsPerDay}</label>
                  <input defaultValue="25" id="maxRequestsPerDay" name="maxRequestsPerDay" />
                </div>
                <div className="field">
                  <label htmlFor="sponsorWindowMinutes">
                    {messages.wallets.sponsorWindowMinutes}
                  </label>
                  <input defaultValue="30" id="sponsorWindowMinutes" name="sponsorWindowMinutes" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="allowedApprovalPolicyKinds">
                  {messages.wallets.allowedApprovalPolicyKinds}
                </label>
                <input id="allowedApprovalPolicyKinds" name="allowedApprovalPolicyKinds" />
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="allowedChainIds">{messages.wallets.allowedChainIds}</label>
                  <input defaultValue="84532" id="allowedChainIds" name="allowedChainIds" />
                </div>
                <div className="field">
                  <label htmlFor="allowedTransactionKinds">
                    {messages.wallets.allowedTransactionKinds}
                  </label>
                  <input
                    defaultValue="FUNDING_TRANSACTION_CREATE, DEAL_MILESTONE_SETTLEMENT_EXECUTION_TRANSACTION_CREATE"
                    id="allowedTransactionKinds"
                    name="allowedTransactionKinds"
                  />
                </div>
              </div>
              <label className="checkbox-row">
                <input defaultChecked name="active" type="checkbox" />
                <span>{messages.wallets.policyActive}</span>
              </label>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.wallets.createPolicy}
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>

      <Card title={messages.wallets.sponsoredRequests}>
        {sponsoredRequests.sponsoredTransactionRequests.length === 0 ? (
          <EmptyState body={messages.wallets.noSponsoredRequests} />
        ) : (
          <DataTable
            headers={[
              messages.wallets.kind,
              messages.wallets.status,
              messages.wallets.wallet,
              messages.wallets.amount,
              messages.wallets.expires,
              messages.wallets.reason
            ]}
          >
            {sponsoredRequests.sponsoredTransactionRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  {formatCode(
                    request.kind,
                    messages.codes.sponsoredTransactionKinds,
                    messages.common.none
                  )}
                </td>
                <td>
                  <Pill
                    tone={toneForStatus(request.status)}
                    value={formatCode(request.status, messages.statuses, messages.common.none)}
                  />
                </td>
                <td className="mono">{request.walletAddress}</td>
                <td>{request.amountMinor}</td>
                <td className="mono">{request.expiresAt}</td>
                <td>{request.reason ?? messages.common.none}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
