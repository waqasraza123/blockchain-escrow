import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LocaleTopbar } from "../../../../components/locale-topbar";
import { getOrganizationDetail, getSession } from "../../../../lib/api";
import { formatCode } from "../../../../lib/i18n/format";
import { getI18n } from "../../../../lib/i18n/server";

type WorkspaceLayoutProps = {
  children: ReactNode;
  params: Promise<{ organizationId: string }>;
};

export default async function WorkspaceLayout(props: WorkspaceLayoutProps) {
  const params = await props.params;
  const session = await getSession();
  const { locale, messages } = await getI18n();

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
  const navigation = [
    { href: "", label: messages.navigation.dashboard },
    { href: "/drafts", label: messages.navigation.drafts },
    { href: "/approvals", label: messages.navigation.approvals },
    { href: "/finance", label: messages.navigation.finance },
    { href: "/integrations", label: messages.navigation.integrations },
    { href: "/wallets", label: messages.navigation.wallets }
  ];

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="brand-block">
          <strong>{messages.common.workspace}</strong>
          <span>{messages.shell.brandSubtitle}</span>
        </div>
        <div className="org-switcher">
          <small className="muted">{messages.shell.organization}</small>
          <strong>{detail.organization.name}</strong>
          <span className="muted mono">{detail.organization.slug}</span>
        </div>
        <div className="session-block">
          <small className="muted">{messages.shell.session}</small>
          <strong className="mono">{session.wallets[0]?.address ?? messages.common.walletMissing}</strong>
          <span className="muted">
            {formatCode(
              organizationMembership.role,
              messages.codes.roles,
              messages.common.none
            )}
          </span>
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
          <small className="muted">{messages.shell.organizationsTitle}</small>
          <div className="inline-list">
            {session.organizations.map((membership) => (
              <Link
                className="mono"
                href={`/orgs/${membership.organizationId}`}
                key={membership.organizationId}
              >
                {membership.organizationId}
              </Link>
            ))}
          </div>
        </div>
      </aside>
      <main className="workspace-main">
        <LocaleTopbar
          currentLocale={locale}
          localeLabels={messages.locale}
          subtitle={messages.publicTopbar.subtitle}
          switcherAriaLabel={messages.switcher.ariaLabel}
          switcherLabel={messages.switcher.label}
          title={messages.publicTopbar.platform}
        />
        {props.children}
      </main>
    </div>
  );
}
