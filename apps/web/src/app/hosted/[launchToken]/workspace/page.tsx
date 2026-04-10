import {
  getHostedContext,
  getHostedSession,
  getTenantPublicContext
} from "../../../../lib/api";
import { LocaleTopbar } from "../../../../components/locale-topbar";
import { formatCode } from "../../../../lib/i18n/format";
import { getI18n } from "../../../../lib/i18n/server";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  WorkspaceHeader,
  toneForStatus
} from "../../../(workspace)/ui";
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
  const { locale, messages } = await getI18n();
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
      <LocaleTopbar
        currentLocale={locale}
        localeLabels={messages.locale}
        subtitle={messages.publicTopbar.subtitle}
        switcherAriaLabel={messages.switcher.ariaLabel}
        switcherLabel={messages.switcher.label}
        title={messages.publicTopbar.platform}
      />
      <WorkspaceHeader
        eyebrow={messages.hosted.hostedSession}
        title={
          tenant
            ? `${tenant.settings.displayName} ${messages.hosted.hostedWorkflowSuffix}`
            : formatCode(
                session.hostedSession.type,
                messages.codes.hostedSessionTypes,
                messages.common.none
              )
        }
        subtitle={messages.hosted.scopedSubtitle}
      />
      <div className="stack">
        <Card title={messages.hosted.sessionStatus}>
          <div className="detail-grid">
            <div>
              <small className="muted">{messages.hosted.status}</small>
              <div>
                <Pill
                  tone={toneForStatus(session.hostedSession.status)}
                  value={formatCode(
                    session.hostedSession.status,
                    messages.statuses,
                    messages.common.none
                  )}
                />
              </div>
            </div>
            <div>
              <small className="muted">{messages.hosted.expires}</small>
              <div className="mono">{session.hostedSession.expiresAt}</div>
            </div>
          </div>
          <form action={clearHostedSessionAction} className="actions-row">
            <input name="launchToken" type="hidden" value={params.launchToken} />
            <button className="button button-secondary" type="submit">
              {messages.hosted.clearSession}
            </button>
          </form>
        </Card>

        {context.draft ? (
          <Card title={messages.hosted.draftContext}>
            <DataTable
              headers={[messages.navigation.drafts, messages.drafts.state, "Version count"]}
            >
              <tr>
                <td>{context.draft.draft.title}</td>
                <td>
                  <Pill
                    tone={toneForStatus(context.draft.draft.state)}
                    value={formatCode(
                      context.draft.draft.state,
                      messages.statuses,
                      messages.common.none
                    )}
                  />
                </td>
                <td>{context.draft.versions.length}</td>
              </tr>
            </DataTable>
          </Card>
        ) : null}

        {context.settlementStatement ? (
          <Card title={messages.hosted.milestoneStatement}>
            <DataTable
              headers={[
                messages.drafts.released,
                messages.drafts.refunded,
                messages.drafts.pending
              ]}
            >
              <tr>
                <td>{context.settlementStatement.statement.releasedAmountMinor}</td>
                <td>{context.settlementStatement.statement.refundedAmountMinor}</td>
                <td>{context.settlementStatement.statement.pendingAmountMinor}</td>
              </tr>
            </DataTable>
          </Card>
        ) : null}

        {session.hostedSession.type === "COUNTERPARTY_VERSION_ACCEPTANCE" ? (
          <Card title={messages.hosted.submitAcceptanceCard}>
            <form action={submitHostedVersionAcceptanceAction} className="form-grid">
              <input name="launchToken" type="hidden" value={params.launchToken} />
              <div className="field">
                <label htmlFor="signature">{messages.hostedForms.signature}</label>
                <textarea id="signature" name="signature" placeholder="0x..." />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.hosted.submitAcceptance}
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {session.hostedSession.type === "COUNTERPARTY_MILESTONE_SUBMISSION" ? (
          <Card title={messages.hosted.submitMilestoneCard}>
            <form action={submitHostedMilestoneAction} className="form-grid">
              <input name="launchToken" type="hidden" value={params.launchToken} />
              <div className="field">
                <label htmlFor="statementMarkdown">{messages.hostedForms.statement}</label>
                <textarea
                  id="statementMarkdown"
                  name="statementMarkdown"
                  placeholder={messages.hostedForms.statementPlaceholder}
                />
              </div>
              <div className="field">
                <label htmlFor="signature">{messages.hostedForms.signature}</label>
                <textarea id="signature" name="signature" placeholder="0x..." />
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.hosted.submitMilestone}
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {session.hostedSession.type === "DISPUTE_EVIDENCE_UPLOAD" ? (
          <Card title={messages.hosted.uploadEvidenceCard}>
            <form action={uploadHostedEvidenceAction} className="form-grid">
              <input name="launchToken" type="hidden" value={params.launchToken} />
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="originalFilename">{messages.hostedForms.originalFilename}</label>
                  <input id="originalFilename" name="originalFilename" />
                </div>
                <div className="field">
                  <label htmlFor="mediaType">{messages.hostedForms.mediaType}</label>
                  <input id="mediaType" name="mediaType" placeholder="application/pdf" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="storageKey">{messages.hostedForms.storageKey}</label>
                  <input id="storageKey" name="storageKey" />
                </div>
                <div className="field">
                  <label htmlFor="sha256Hex">{messages.hostedForms.sha256Hex}</label>
                  <input id="sha256Hex" name="sha256Hex" />
                </div>
              </div>
              <div className="form-grid columns-2">
                <div className="field">
                  <label htmlFor="byteSize">{messages.hostedForms.byteSize}</label>
                  <input id="byteSize" name="byteSize" />
                </div>
                <div className="field">
                  <label htmlFor="category">{messages.hostedForms.category}</label>
                  <input defaultValue="EVIDENCE" id="category" name="category" />
                </div>
              </div>
              <div className="actions-row">
                <button className="button" type="submit">
                  {messages.hosted.uploadEvidence}
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {session.hostedSession.type === "DEAL_STATUS_REVIEW" ? (
          <Card title={messages.hosted.statusReview}>
            {context.settlementStatement ? (
              <DataTable
                headers={[
                  messages.hosted.reviewMilestone,
                  messages.hosted.reviewState,
                  messages.hosted.reviewAmount
                ]}
              >
                {context.settlementStatement.milestones.map((milestone) => (
                  <tr key={milestone.milestone.id}>
                    <td>{milestone.milestone.title}</td>
                    <td>
                      <Pill
                        tone={toneForStatus(milestone.state)}
                        value={formatCode(
                          milestone.state,
                          messages.statuses,
                          messages.common.none
                        )}
                      />
                    </td>
                    <td>{milestone.milestone.amountMinor}</td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <EmptyState body={messages.hosted.evidenceBody} />
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
