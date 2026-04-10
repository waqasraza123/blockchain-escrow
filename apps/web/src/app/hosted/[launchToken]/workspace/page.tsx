import {
  getHostedContext,
  getHostedSession,
  getTenantPublicContext
} from "../../../../lib/api";
import { Card, DataTable, EmptyState, Pill, WorkspaceHeader, toneForStatus } from "../../../(workspace)/ui";
import {
  clearHostedSessionAction,
  submitHostedMilestoneAction,
  submitHostedVersionAcceptanceAction,
  uploadHostedEvidenceAction
} from "../../actions";

type HostedWorkspacePageProps = {
  params: Promise<{ launchToken: string }>;
};

export default async function HostedWorkspacePage(props: HostedWorkspacePageProps) {
  const params = await props.params;
  const [session, context, tenantContext] = await Promise.all([
    getHostedSession(),
    getHostedContext(),
    getTenantPublicContext()
  ]);
  const tenant = tenantContext.tenant;

  return (
    <div
      className="workspace-main"
      style={{
        background: tenant
          ? `linear-gradient(135deg, ${tenant.settings.backgroundColorHex}, ${tenant.settings.primaryColorHex})`
          : undefined,
        color: tenant?.settings.textColorHex,
        maxWidth: 960,
        margin: "0 auto",
        padding: 32
      }}
    >
      <WorkspaceHeader
        eyebrow="Hosted Session"
        title={tenant ? `${tenant.settings.displayName} Hosted Workflow` : session.hostedSession.type.replaceAll("_", " ")}
        subtitle="Scoped participant workflow backed by a short-lived hosted session cookie."
      />
      <div className="stack">
        <Card title="Session Status">
          <div className="detail-grid">
            <div>
              <small className="muted">Status</small>
              <div>
                <Pill tone={toneForStatus(session.hostedSession.status)} value={session.hostedSession.status} />
              </div>
            </div>
            <div>
              <small className="muted">Expires</small>
              <div className="mono">{session.hostedSession.expiresAt}</div>
            </div>
          </div>
          <form action={clearHostedSessionAction} className="actions-row">
            <input name="launchToken" type="hidden" value={params.launchToken} />
            <button className="button button-secondary" type="submit">
              Clear Hosted Session
            </button>
          </form>
        </Card>

        {context.draft ? (
          <Card title="Draft Context">
            <DataTable headers={["Draft", "State", "Version Count"]}>
              <tr>
                <td>{context.draft.draft.title}</td>
                <td>
                  <Pill tone={toneForStatus(context.draft.draft.state)} value={context.draft.draft.state} />
                </td>
                <td>{context.draft.versions.length}</td>
              </tr>
            </DataTable>
          </Card>
        ) : null}

        {context.settlementStatement ? (
          <Card title="Settlement Statement">
            <DataTable headers={["Released", "Refunded", "Pending"]}>
              <tr>
                <td>{context.settlementStatement.statement.releasedAmountMinor}</td>
                <td>{context.settlementStatement.statement.refundedAmountMinor}</td>
                <td>{context.settlementStatement.statement.pendingAmountMinor}</td>
              </tr>
            </DataTable>
          </Card>
        ) : null}

        {session.hostedSession.type === "COUNTERPARTY_VERSION_ACCEPTANCE" ? (
          <Card title="Submit Acceptance Signature">
            <form action={submitHostedVersionAcceptanceAction} className="form-grid">
              <input name="launchToken" type="hidden" value={params.launchToken} />
              <div className="field">
                <label htmlFor="signature">Typed Signature</label>
                <textarea id="signature" name="signature" placeholder="0x..." />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Submit Acceptance
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {session.hostedSession.type === "COUNTERPARTY_MILESTONE_SUBMISSION" ? (
          <Card title="Submit Milestone Evidence">
            <form action={submitHostedMilestoneAction} className="form-grid">
              <input name="launchToken" type="hidden" value={params.launchToken} />
              <div className="field">
                <label htmlFor="statementMarkdown">Statement</label>
                <textarea id="statementMarkdown" name="statementMarkdown" placeholder="Milestone work completed..." />
              </div>
              <div className="field">
                <label htmlFor="signature">Typed Signature</label>
                <textarea id="signature" name="signature" placeholder="0x..." />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Submit Milestone
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {session.hostedSession.type === "DISPUTE_EVIDENCE_UPLOAD" ? (
          <Card title="Upload Evidence Metadata">
            <form action={uploadHostedEvidenceAction} className="form-grid">
              <input name="launchToken" type="hidden" value={params.launchToken} />
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="originalFilename">Original Filename</label>
                  <input id="originalFilename" name="originalFilename" />
                </div>
                <div className="field">
                  <label htmlFor="mediaType">Media Type</label>
                  <input id="mediaType" name="mediaType" placeholder="application/pdf" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="storageKey">Storage Key</label>
                  <input id="storageKey" name="storageKey" />
                </div>
                <div className="field">
                  <label htmlFor="sha256Hex">SHA-256 Hex</label>
                  <input id="sha256Hex" name="sha256Hex" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="byteSize">Byte Size</label>
                  <input id="byteSize" name="byteSize" />
                </div>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <input defaultValue="EVIDENCE" id="category" name="category" />
                </div>
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  Upload Metadata and Link Evidence
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {session.hostedSession.type === "DEAL_STATUS_REVIEW" ? (
          <Card title="Status Review">
            {context.settlementStatement ? (
              <DataTable headers={["Milestone", "State", "Amount"]}>
                {context.settlementStatement.milestones.map((milestone) => (
                  <tr key={milestone.milestone.id}>
                    <td>{milestone.milestone.title}</td>
                    <td>
                      <Pill tone={toneForStatus(milestone.state)} value={milestone.state} />
                    </td>
                    <td>{milestone.milestone.amountMinor}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState body="No settlement statement is available for this hosted session." />
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
