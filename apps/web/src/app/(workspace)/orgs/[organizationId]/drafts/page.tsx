import Link from "next/link";

import { listDrafts } from "../../../../../lib/api";
import { formatCode } from "../../../../../lib/i18n/format";
import { getI18n } from "../../../../../lib/i18n/server";
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
  const { messages } = await getI18n();
  const drafts = await listDrafts(organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.drafts.draftWorkspace}
        subtitle={messages.drafts.subtitle}
        title={messages.drafts.title}
      />
      <Card title={messages.drafts.draftQueue}>
        {drafts.drafts.length === 0 ? (
          <EmptyState body={messages.drafts.empty} />
        ) : (
          <DataTable
            headers={[
              "Title",
              messages.drafts.state,
              messages.drafts.latestVersion,
              messages.drafts.currency
            ]}
          >
            {drafts.drafts.map((item) => (
              <tr key={item.draft.id}>
                <td>
                  <Link href={`/orgs/${organizationId}/drafts/${item.draft.id}`}>
                    {item.draft.title}
                  </Link>
                </td>
                <td>
                  <Pill
                    tone={toneForStatus(item.draft.state)}
                    value={formatCode(item.draft.state, messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{item.latestVersion?.versionNumber ?? messages.common.none}</td>
                <td>{item.draft.settlementCurrency}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
