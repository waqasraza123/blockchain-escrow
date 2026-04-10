import Link from "next/link";

import { listApprovalRequests } from "../../../../../lib/api";
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
  const approvals = await listApprovalRequests(organizationId);

  return (
    <>
      <WorkspaceHeader
        eyebrow="Approvals"
        subtitle="Sequential approval requests across funding, statements, and governed org actions."
        title="Approval Queue"
      />
      <Card title="Approval Requests">
        {approvals.approvalRequests.length === 0 ? (
          <EmptyState body="No approval requests have been opened yet." />
        ) : (
          <DataTable headers={["Action", "Status", "Subject", "Requested", "Steps"]}>
            {approvals.approvalRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <Link href={`/orgs/${organizationId}/approvals/${request.id}`}>
                    {request.kind}
                  </Link>
                </td>
                <td>
                  <Pill tone={toneForStatus(request.status)} value={request.status} />
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
