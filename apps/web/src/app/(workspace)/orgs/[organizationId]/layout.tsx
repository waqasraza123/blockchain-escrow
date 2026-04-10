import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getOrganizationDetail, getSession } from "../../../../lib/api";

const navigation = [
  { href: "", label: "Dashboard" },
  { href: "/drafts", label: "Drafts" },
  { href: "/approvals", label: "Approvals" },
  { href: "/finance", label: "Finance" },
  { href: "/integrations", label: "Integrations" }
];

type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{ organizationId: string }>;
};

export default async function WorkspaceLayout(props: WorkspaceLayoutProps) {
  const params = await props.params;
  const session = await getSession();

  if (!session) {
    redirect("/unauthorized");
  }

  const organizationMembership = session.organizations.find(
    (record) => record.organizationId === params.organizationId
  );

  if (!organizationMembership) {
    notFound();
  }

  const detail = await getOrganizationDetail(params.organizationId);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="brand-block">
          <strong>Customer Workspace</strong>
          <span>Release 9 approval and finance control plane</span>
        </div>
        <div className="org-switcher">
          <small className="muted">Organization</small>
          <strong>{detail.organization.name}</strong>
          <span className="muted">{detail.organization.slug}</span>
        </div>
        <div className="session-block">
          <small className="muted">Session</small>
          <strong className="mono">{session.wallets[0]?.address ?? "wallet-missing"}</strong>
          <span className="muted">{organizationMembership.role}</span>
        </div>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              className="sidebar-link"
              href={`/orgs/${params.organizationId}${item.href}`}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="workspace-card" style={{ padding: 14 }}>
          <small className="muted">Organizations</small>
          <div className="inline-list">
            {session.organizations.map((membership) => (
              <Link href={`/orgs/${membership.organizationId}`} key={membership.organizationId}>
                {membership.organizationId}
              </Link>
            ))}
          </div>
        </div>
      </aside>
      <main className="workspace-main">{props.children}</main>
    </div>
  );
}
