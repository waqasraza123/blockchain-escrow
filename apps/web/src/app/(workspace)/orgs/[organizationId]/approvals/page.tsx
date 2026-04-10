import Link from "next/link";

import { listApprovalRequests } from "../../../../../lib/api";
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

type ApprovalsPageProps = {
  params: Promise<{ organizationId: string }>;
};

export default async function ApprovalsPage(props: ApprovalsPageProps) {
  const { organizationId } = await props.params;
  const { messages } = await getI18n();
  const approvals = await listApprovalRequests(organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow={messages.approvals.queueEyebrow}
        subtitle={messages.approvals.queueSubtitle}
        title={messages.approvals.queueTitle}
      />
      <Card title={messages.approvals.requestTitle}>
        {approvals.approvalRequests.length === 0 ? (
          <EmptyState body={messages.approvals.queueEmpty} />
        ) : (
          <DataTable
            headers={[
              messages.approvals.action,
              messages.approvals.status,
              messages.approvals.subject,
              messages.approvals.requested,
              messages.approvals.steps
            ]}
          >
            {approvals.approvalRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link href={`/orgs/${organizationId}/approvals/${request.id}`}>
                    {formatCode(request.kind, messages.codes.actionKinds, messages.common.none)}
                  </Link>
                </td>
                <td>
                  <Pill
                    tone={toneForStatus(request.status)}
                    value={formatCode(request.status, messages.statuses, messages.common.none)}
                  />
                </td>
                <td>{request.subject.label ?? request.subject.id}</td>
                <td className="mono">{request.requestedAt}</td>
                <td>{request.steps.length}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
