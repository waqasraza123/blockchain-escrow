import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCurrentApproval,
  getDraft,
  getFundingPreparation,
  getSettlementStatement,
  previewApprovalRequirement
} from "../../../../../../../../lib/api";
import {
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
  const draft = await getDraft(organizationId, draftDealId);
  const version = draft.versions.find((entry) => entry.id === dealVersionId);

  if (!version) {
    return notFound();
  }

  const totalAmountMinor = version.milestones
    .reduce((total, milestone) => total + BigInt(milestone.amountMinor), 0n)
    .toString();

  const [fundingPreparation, settlementStatement, currentApproval, snapshotApproval] =
    await Promise.all([
      getFundingPreparation({ dealVersionId, draftDealId, organizationId }),
      getSettlementStatement({ dealVersionId, draftDealId, organizationId }),
      getCurrentApproval({ dealVersionId, draftDealId, organizationId }),
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

  return (
    <>
      <WorkspaceHeader
        eyebrow="Version Detail"
        subtitle="Funding, approval, and milestone custody state for the selected deal version."
        title={version.title}
      />
      <div className="triptych-grid">
        <Card title="Approval State">
          <div className="status-callout">
            <span className="muted">Funding approval</span>
            <Pill
              tone={toneForStatus(currentApproval.approval.status)}
              value={currentApproval.approval.status}
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
                <label htmlFor="funding-approval-note">Approval note</label>
                <textarea id="funding-approval-note" name="note" />
              </div>
              <button className="button" type="submit">
                Request funding approval
              </button>
            </form>
          ) : (
            <p className="empty-state">Funding can proceed without opening a new request.</p>
          )}
        </Card>
        <Card title="Funding Preparation">
          <div className="status-callout">
            <span className="muted">Ready</span>
            <Pill
              tone={fundingPreparation.preparation.ready ? "success" : "warning"}
              value={fundingPreparation.preparation.ready ? "READY" : "BLOCKED"}
            />
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">Predicted agreement</span>
              <strong className="mono">
                {fundingPreparation.preparation.predictedAgreementAddress ?? "unavailable"}
              </strong>
            </div>
            <div className="detail-item">
              <span className="muted">Blockers</span>
              <strong>{fundingPreparation.preparation.blockers.length}</strong>
            </div>
          </div>
        </Card>
        <Card title="Statement Snapshot">
          <div className="status-callout">
            <span className="muted">Snapshot approval</span>
            <Pill
              tone={toneForStatus(snapshotApproval.approval.status)}
              value={snapshotApproval.approval.status}
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
              <input
                name="costCenterId"
                type="hidden"
                value={draft.draft.costCenterId ?? ""}
              />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="snapshot-approval-note">Approval note</label>
                <textarea id="snapshot-approval-note" name="note" />
              </div>
              <button className="button" type="submit">
                Request snapshot approval
              </button>
            </form>
          ) : (
            <form action={createStatementSnapshotAction} className="form-stack">
              <input name="organizationId" type="hidden" value={organizationId} />
              <input name="draftDealId" type="hidden" value={draftDealId} />
              <input name="dealVersionId" type="hidden" value={dealVersionId} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <div className="field">
                <label htmlFor="snapshot-note">Snapshot note</label>
                <textarea id="snapshot-note" name="note" />
              </div>
              <button className="button" type="submit">
                Capture statement snapshot
              </button>
            </form>
          )}
        </Card>
      </div>
      <div className="split-grid">
        <Card title="Milestone Statement">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">Released</span>
              <strong>{settlementStatement.statement.releasedAmountMinor}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Refunded</span>
              <strong>{settlementStatement.statement.refundedAmountMinor}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Pending</span>
              <strong>{settlementStatement.statement.pendingAmountMinor}</strong>
            </div>
          </div>
        </Card>
        <Card
          actions={
            <Link className="button-ghost" href={`/orgs/${organizationId}/approvals`}>
              Open approvals
            </Link>
          }
          title="Version Metadata"
        >
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">Version</span>
              <strong>v{version.versionNumber}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Files</span>
              <strong>{version.files.length}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Milestones</span>
              <strong>{version.milestones.length}</strong>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Milestones">
        {settlementStatement.milestones.length === 0 ? (
          <EmptyState body="This version does not define any milestones." />
        ) : (
          <DataTable headers={["Milestone", "State", "Amount", "Latest submission"]}>
            {settlementStatement.milestones.map((item) => (
              <tr key={item.milestone.id}>
                <td>{item.milestone.title}</td>
                <td>
                  <Pill tone={toneForStatus(item.state)} value={item.state} />
                </td>
                <td>{item.milestone.amountMinor}</td>
                <td>{item.latestSubmission?.submittedAt ?? "not submitted"}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
