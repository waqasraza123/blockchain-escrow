import Link from "next/link";

import { listDrafts } from "../../../../../lib/api";
import {
  Card,
  DataTable,
  EmptyState,
  Pill,
  toneForStatus,
  WorkspaceHeader
} from "../../../ui";

type DraftsPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function DraftsPage(props: DraftsPageProps) {
  const { organizationId } = await props.params;
  const drafts = await listDrafts(organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Draft Workspace"
        subtitle="Track escrow drafts, parties, versions, funding posture, and custody state."
        title="Draft Deals"
      />
      <Card title="Draft Queue">
        {drafts.drafts.length === 0 ? (
          <EmptyState body="No draft deals exist for this organization yet." />
        ) : (
          <DataTable headers={["Title", "State", "Latest version", "Currency"]}>
            {drafts.drafts.map((item) => (
              <tr key={item.draft.id}>
                <td>
                  <Link href={`/orgs/${organizationId}/drafts/${item.draft.id}`}>
                    {item.draft.title}
                  </Link>
                </td>
                <td>
                  <Pill tone={toneForStatus(item.draft.state)} value={item.draft.state} />
                </td>
                <td>{item.latestVersion?.versionNumber ?? "none"}</td>
                <td>{item.draft.settlementCurrency}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
