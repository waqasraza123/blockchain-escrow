import Link from "next/link";

import { getDraft } from "../../../../../../lib/api";
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
  const draft = await getDraft(organizationId, draftDealId);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Draft Detail"
        subtitle="Versions, parties, and approval-bearing finance context for this escrow draft."
        title={draft.draft.title}
      />
      <div className="split-grid">
        <Card title="Draft Summary">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="muted">State</span>
              <Pill tone={toneForStatus(draft.draft.state)} value={draft.draft.state} />
            </div>
            <div className="detail-item">
              <span className="muted">Currency</span>
              <strong>{draft.draft.settlementCurrency}</strong>
            </div>
            <div className="detail-item">
              <span className="muted">Cost center</span>
              <strong>{draft.draft.costCenterId ?? "unassigned"}</strong>
            </div>
          </div>
        </Card>
        <Card title="Parties">
          <InlineLinks
            items={draft.parties.map((party) => ({
              href: "#",
              label: `${party.role}: ${party.displayName}`
            }))}
          />
        </Card>
      </div>
      <Card title="Versions">
        {draft.versions.length === 0 ? (
          <EmptyState body="No version snapshots have been created for this draft yet." />
        ) : (
          <DataTable headers={["Version", "Approval", "Milestones", "Actions"]}>
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
                      value={version.approval.status}
                    />
                  ) : (
                    "n/a"
                  )}
                </td>
                <td>{version.milestones.length}</td>
                <td>
                  <Link href={`/orgs/${organizationId}/drafts/${draftDealId}/versions/${version.id}`}>
                    Open version
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
