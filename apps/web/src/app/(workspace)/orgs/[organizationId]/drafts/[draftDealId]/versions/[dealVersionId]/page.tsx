import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCurrentApproval,
  getDraft,
  getFundingPreparation,
  getSettlementStatement,
  listGasPolicies,
  listMilestoneWorkflows,
  listWallets,
  previewApprovalRequirement
} from "../../../../../../../../lib/api";
import { formatCode } from "../../../../../../../../lib/i18n/format";
import { getI18n } from "../../../../../../../../lib/i18n/server";
import {
  createMilestoneReviewAction,
  createMilestoneSettlementRequestAction,
  createSponsoredFundingRequestAction,
  createSponsoredSettlementExecutionRequestAction,
  createStatementSnapshotAction,
  requestFundingApprovalAction,
  requestStatementSnapshotApprovalAction
} from "../../../../../../actions";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../../../../../ui";

type VersionDetailPageProps = {
  params: Promise<{
    dealVersionId: string;
    draftDealId: string;
    organizationId: string;
  }>;
};

export default async function VersionDetailPage(props: VersionDetailPageProps) {
  const { dealVersionId, draftDealId, organizationId } = await props.params;
  const { messages } = await getI18n();
  const draft = await getDraft(organizationId, draftDealId);
  const version = draft.versions.find((entry) => entry.id === dealVersionId);

  if (!version) {
    return notFound();
  }

  const totalAmountMinor = version.milestones
    .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
    .toString();

  const [
    fundingPreparation,
    settlementStatement,
    currentApproval,
    milestoneWorkflows,
    wallets,
    gasPolicies,
    snapshotApproval
  ] = await Promise.all([
    getFundingPreparation({ dealVersionId, draftDealId, organizationId }),
    getSettlementStatement({ dealVersionId, draftDealId, organizationId }),
    getCurrentApproval({ dealVersionId, draftDealId, organizationId }),
    listMilestoneWorkflows({ dealVersionId, draftDealId, organizationId }),
    listWallets(),
    listGasPolicies(organizationId),
    previewApprovalRequirement(organizationId, {
      actionKind: "STATEMENT_SNAPSHOT_CREATE",
      costCenterId: draft.draft.costCenterId ?? undefined,
      dealVersionId,
      draftDealId,
      settlementCurrency: version.settlementCurrency,
      subjectId: dealVersionId,
      subjectLabel: version.title,
      subjectType: "DEAL_VERSION",
      title: version.title,
      totalAmountMinor
    })
  ]);
  const returnPath = `/orgs/${organizationId}/drafts/${draftDealId}/versions/${dealVersionId}`;
  const primaryWallet =
    wallets.wallets.find((wallet) => wallet.isPrimary) ?? wallets.wallets[0] ?? null;
  const defaultGasPolicyId =
    primaryWallet?.profile?.defaultGasPolicyId ??
    gasPolicies.gasPolicies.find((gasPolicy) => gasPolicy.active)?.id ??
    "";

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.drafts.versionDetailEyebrow}
        subtitle={messages.drafts.versionDetailSubtitle}
        title={version.title}
      />
      <div className="triptych-grid">
        <Card title={messages.drafts.approval}>
          <div className="status-callout">
            <span className="muted">{messages.draftForms.fundingApproval}</span>
            <Pill
              tone={toneForStatus(currentApproval.approval.status)}
              value={formatCode(
                currentApproval.approval.status,
                messages.statuses,
                messages.common.none
              )}
            />
          </div>
          {currentApproval.approval.required &&
          currentApproval.approval.currentRequest?.status !== "APPROVED" ? (
            <form action={requestFundingApprovalAction} className="form-stack">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="draftDealId" type="hidden" value={draftDealId} />
              <input name="dealVersionId" type="hidden" value={dealVersionId} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="funding-approval-note">{messages.draftForms.approvalNote}</label>
                <textarea
                  defaultValue={primaryWallet?.profile?.approvalNoteTemplate ?? ""}
                  id="funding-approval-note"
                  name="note"
                />
              </div>
              <button className="button" type="submit">
                {messages.draftForms.requestFundingApproval}
              </button>
            </form>
          ) : (
            <p className="empty-state">{messages.draftForms.fundingReady}</p>
          )}
        </Card>
        <Card title={messages.draftForms.fundingPreparation}>
          <div className="status-callout">
            <span className="muted">{messages.common.ready}</span>
            <Pill
              tone={fundingPreparation.preparation.ready ? "success" : "warning"}
              value={
                fundingPreparation.preparation.ready
                  ? messages.common.ready
                  : messages.common.blocked
              }
            />
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">{messages.draftForms.predictedAgreement}</span>
              <strong className="mono">
                {fundingPreparation.preparation.predictedAgreementAddress ??
                  messages.common.unavailable}
              </strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.draftForms.blockers}</span>
              <strong>{fundingPreparation.preparation.blockers.length}</strong>
            </div>
          </div>
          {fundingPreparation.preparation.ready && defaultGasPolicyId ? (
            <form action={createSponsoredFundingRequestAction} className="actions-row">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="draftDealId" type="hidden" value={draftDealId} />
              <input name="dealVersionId" type="hidden" value={dealVersionId} />
              <input name="gasPolicyId" type="hidden" value={defaultGasPolicyId} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <button className="button-ghost" type="submit">
                {messages.wallets.requestSponsoredFunding}
              </button>
            </form>
          ) : null}
        </Card>
        <Card title={messages.drafts.statementSnapshot}>
          <div className="status-callout">
            <span className="muted">{messages.drafts.snapshotApproval}</span>
            <Pill
              tone={toneForStatus(snapshotApproval.approval.status)}
              value={formatCode(
                snapshotApproval.approval.status,
                messages.statuses,
                messages.common.none
              )}
            />
          </div>
          {snapshotApproval.approval.required &&
          snapshotApproval.approval.currentRequest?.status !== "APPROVED" ? (
            <form action={requestStatementSnapshotApprovalAction} className="form-stack">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="draftDealId" type="hidden" value={draftDealId} />
              <input name="dealVersionId" type="hidden" value={dealVersionId} />
              <input name="title" type="hidden" value={version.title} />
              <input name="settlementCurrency" type="hidden" value={version.settlementCurrency} />
              <input
                name="totalAmountMinor"
                type="hidden"
                value={settlementStatement.statement.totalAmountMinor}
              />
              <input name="costCenterId" type="hidden" value={draft.draft.costCenterId ?? ""} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="snapshot-approval-note">
                  {messages.draftForms.snapshotApprovalNote}
                </label>
                <textarea
                  defaultValue={primaryWallet?.profile?.approvalNoteTemplate ?? ""}
                  id="snapshot-approval-note"
                  name="note"
                />
              </div>
              <button className="button" type="submit">
                {messages.draftForms.requestSnapshotApproval}
              </button>
            </form>
          ) : (
            <form action={createStatementSnapshotAction} className="form-stack">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="draftDealId" type="hidden" value={draftDealId} />
              <input name="dealVersionId" type="hidden" value={dealVersionId} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="snapshot-note">{messages.drafts.snapshotNote}</label>
                <textarea id="snapshot-note" name="note" />
              </div>
              <button className="button" type="submit">
                {messages.draftForms.captureSnapshot}
              </button>
            </form>
          )}
        </Card>
      </div>
      <div className="split-grid">
        <Card title={messages.drafts.milestoneStatement}>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">{messages.drafts.released}</span>
              <strong>{settlementStatement.statement.releasedAmountMinor}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.drafts.refunded}</span>
              <strong>{settlementStatement.statement.refundedAmountMinor}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.drafts.pending}</span>
              <strong>{settlementStatement.statement.pendingAmountMinor}</strong>
            </div>
          </div>
        </Card>
        <Card
          actions={
            <Link className="button-ghost" href={`/orgs/${organizationId}/approvals`}>
              {messages.navigation.approvals}
            </Link>
          }
          title={messages.drafts.versionMetadata}
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">{messages.finance.version}</span>
              <strong>v{version.versionNumber}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.draftForms.files}</span>
              <strong>{version.files.length}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">{messages.drafts.milestones}</span>
              <strong>{version.milestones.length}</strong>
            </div>
          </div>
        </Card>
      </div>
      <Card title={messages.drafts.reviewConsole}>
        {milestoneWorkflows.milestones.length === 0 ? (
          <EmptyState body={messages.drafts.noMilestones} />
        ) : (
          <div className="stack">
            {milestoneWorkflows.milestones.map((workflow) => {
              const latestSubmission = workflow.submissions[0] ?? null;
              const latestReview = latestSubmission?.review ?? null;
              const latestSettlementRequest = latestReview?.settlementRequest ?? null;

              return (
                <div className="workspace-card inset-card" key={workflow.milestone.id}>
                  <div className="card-header">
                    <h2>{workflow.milestone.title}</h2>
                    <Pill
                      tone={toneForStatus(workflow.state)}
                      value={formatCode(workflow.state, messages.statuses, messages.common.none)}
                    />
                  </div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="muted">{messages.hosted.reviewAmount}</span>
                      <strong>{workflow.milestone.amountMinor}</strong>
                    </div>
                    <div className="detail-item">
                      <span className="muted">{messages.drafts.latestSubmission}</span>
                      <strong>{latestSubmission?.submittedAt ?? messages.common.notSubmitted}</strong>
                    </div>
                    <div className="detail-item">
                      <span className="muted">{messages.approvals.status}</span>
                      <strong>
                        {latestReview
                          ? formatCode(latestReview.decision, messages.statuses, messages.common.none)
                          : messages.wallets.reviewPending}
                      </strong>
                    </div>
                  </div>
                  {latestSubmission && !latestReview ? (
                    <form action={createMilestoneReviewAction} className="form-stack">
                      <input name="organizationId" type="hidden" value={organizationId} />
                      <input name="draftDealId" type="hidden" value={draftDealId} />
                      <input name="dealVersionId" type="hidden" value={dealVersionId} />
                      <input
                        name="dealVersionMilestoneId"
                        type="hidden"
                        value={workflow.milestone.id}
                      />
                      <input
                        name="dealMilestoneSubmissionId"
                        type="hidden"
                        value={latestSubmission.id}
                      />
                      <input name="returnPath" type="hidden" value={returnPath} />
                      <div className="field">
                        <label htmlFor={`review-note-${workflow.milestone.id}`}>
                          {messages.wallets.reviewNoteTemplate}
                        </label>
                        <textarea
                          defaultValue={primaryWallet?.profile?.reviewNoteTemplate ?? ""}
                          id={`review-note-${workflow.milestone.id}`}
                          name="statementMarkdown"
                        />
                      </div>
                      <div className="inline-actions">
                        <button className="button" name="decision" type="submit" value="APPROVED">
                          {messages.wallets.quickApprove}
                        </button>
                        <button
                          className="button-ghost"
                          name="decision"
                          type="submit"
                          value="REJECTED"
                        >
                          {messages.wallets.quickReject}
                        </button>
                      </div>
                    </form>
                  ) : null}
                  {latestReview && !latestSettlementRequest ? (
                    <form action={createMilestoneSettlementRequestAction} className="form-stack">
                      <input name="organizationId" type="hidden" value={organizationId} />
                      <input name="draftDealId" type="hidden" value={draftDealId} />
                      <input name="dealVersionId" type="hidden" value={dealVersionId} />
                      <input
                        name="dealVersionMilestoneId"
                        type="hidden"
                        value={workflow.milestone.id}
                      />
                      <input
                        name="dealMilestoneSubmissionId"
                        type="hidden"
                        value={latestSubmission?.id ?? ""}
                      />
                      <input
                        name="dealMilestoneReviewId"
                        type="hidden"
                        value={latestReview.id}
                      />
                      <input name="returnPath" type="hidden" value={returnPath} />
                      <div className="field">
                        <label htmlFor={`settlement-note-${workflow.milestone.id}`}>
                          {messages.wallets.reviewNoteTemplate}
                        </label>
                        <textarea
                          defaultValue={primaryWallet?.profile?.reviewNoteTemplate ?? ""}
                          id={`settlement-note-${workflow.milestone.id}`}
                          name="statementMarkdown"
                        />
                      </div>
                      <button
                        className="button"
                        name="kind"
                        type="submit"
                        value={latestReview.decision === "APPROVED" ? "RELEASE" : "REFUND"}
                      >
                        {latestReview.decision === "APPROVED"
                          ? messages.wallets.requestRelease
                          : messages.wallets.requestRefund}
                      </button>
                    </form>
                  ) : null}
                  {latestSettlementRequest && defaultGasPolicyId ? (
                    <form
                      action={createSponsoredSettlementExecutionRequestAction}
                      className="actions-row"
                    >
                      <input name="organizationId" type="hidden" value={organizationId} />
                      <input name="draftDealId" type="hidden" value={draftDealId} />
                      <input name="dealVersionId" type="hidden" value={dealVersionId} />
                      <input
                        name="dealMilestoneSettlementRequestId"
                        type="hidden"
                        value={latestSettlementRequest.id}
                      />
                      <input name="gasPolicyId" type="hidden" value={defaultGasPolicyId} />
                      <input name="returnPath" type="hidden" value={returnPath} />
                      <button className="button-ghost" type="submit">
                        {messages.wallets.requestSponsoredSettlement}
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card title={messages.drafts.milestones}>
        {settlementStatement.milestones.length === 0 ? (
          <EmptyState body={messages.drafts.noMilestones} />
        ) : (
          <DataTable
            headers={[
              messages.hosted.reviewMilestone,
              messages.drafts.state,
              messages.hosted.reviewAmount,
              messages.drafts.latestSubmission
            ]}
          >
            {settlementStatement.milestones.map((item) => (
              <tr key={item.milestone.id}>
                <td>{item.milestone.title}</td>
                <td>
                  <Pill
                    tone={toneForStatus(item.state)}
                    value={formatCode(item.state, messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{item.milestone.amountMinor}</td>
                <td>{item.latestSubmission?.submittedAt ?? messages.common.notSubmitted}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
