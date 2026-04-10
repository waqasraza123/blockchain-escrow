import Link from "next/link";

import { getDraft } from "../../../../../../lib/api";
import { getI18n } from "../../../../../../lib/i18n/server";
import { formatCode } from "../../../../../../lib/i18n/format";
import {
  Card,
  DataTable,
  EmptyState,
  InlineLinks,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../../../ui";

type DraftDetailPageProps = {
  params: Promise<{ draftDealId: string; organizationId: string }>;
};

export default async function DraftDetailPage(props: DraftDetailPageProps) {
  const { draftDealId, organizationId } = await props.params;
  const { messages } = await getI18n();
  const draft = await getDraft(organizationId, draftDealId);

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.drafts.detailEyebrow}
        subtitle={messages.drafts.detailSubtitle}
        title={draft.draft.title}
      />
      <div className="split-grid">
        <Card title={messages.drafts.draftSummary}>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">{messages.drafts.state}</span>
              <Pill
                tone={toneForStatus(draft.draft.state)}
                value={formatCode(draft.draft.state, messages.statuses, messages.common.none)}
              />
            </div>
            <div className="detail-item">
              <span className="muted">{messages.drafts.currency}</span>
              <strong>{draft.draft.settlementCurrency}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Cost center</span>
              <strong>{draft.draft.costCenterId ?? messages.common.unassigned}</strong>
            </div>
          </div>
        </Card>
        <Card title={messages.drafts.parties}>
          <InlineLinks
            items={draft.parties.map((party) => ({
              href: "#",
              label: `${party.role}: ${party.displayName}`
            }))}
          />
        </Card>
      </div>
      <Card title={messages.drafts.versions}>
        {draft.versions.length === 0 ? (
          <EmptyState body="No version snapshots have been created for this draft yet." />
        ) : (
          <DataTable
            headers={[
              "Version",
              messages.drafts.approval,
              messages.drafts.milestones,
              messages.drafts.actions
            ]}
          >
            {draft.versions.map((version) => (
              <tr key={version.id}>
                <td>
                  <div>{version.title}</div>
                  <div className="muted">v{version.versionNumber}</div>
                </td>
                <td>
                  {version.approval ? (
                    <Pill
                      tone={toneForStatus(version.approval.status)}
                      value={formatCode(
                        version.approval.status,
                        messages.statuses,
                        messages.common.none
                      )}
                    />
                  ) : (
                    messages.common.na
                  )}
                </td>
                <td>{version.milestones.length}</td>
                <td>
                  <Link href={`/orgs/${organizationId}/drafts/${draftDealId}/versions/${version.id}`}>
                    {messages.drafts.openVersion}
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
