import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LocaleTopbar } from "../../components/locale-topbar";
import { getOperatorSession } from "../../lib/operator-api";
import { formatCode } from "../../lib/i18n/format";
import { getI18n } from "../../lib/i18n/server";

type ConsoleLayoutProps = {
  children: ReactNode;
};

export default async function ConsoleLayout({
  children
}: ConsoleLayoutProps) {
  const session = await getOperatorSession();
  const { locale, messages } = await getI18n();

  if (!session) {
    redirect("/unauthorized");
  }

  const navigation = [
    { href: "/", label: messages.navigation.dashboard },
    { href: "/search", label: messages.navigation.search },
    { href: "/health", label: messages.navigation.health },
    { href: "/reconciliation", label: messages.navigation.reconciliation },
    { href: "/alerts", label: messages.navigation.alerts },
    { href: "/checkpoints", label: messages.navigation.checkpoints },
    { href: "/cases", label: messages.navigation.cases },
    { href: "/partners", label: messages.navigation.partners },
    { href: "/billing", label: messages.navigation.billing },
    { href: "/protocol-proposals", label: messages.navigation.protocolProposals }
  ];

  return (
    <div className="console-shell">
      <aside className="console-sidebar">
        <div className="brand-mark">
          <strong>{messages.shell.brandTitle}</strong>
          <span>{messages.shell.brandSubtitle}</span>
        </div>
        <div className="operator-meta">
          <small>{formatCode(session.operator.role, messages.statuses, messages.common.role)}</small>
          <strong className="mono">{session.operator.walletAddress}</strong>
          <span className="muted">
            {messages.common.operator} <span className="mono">{session.operator.id}</span>
          </span>
        </div>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link className="sidebar-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="console-main">
        <LocaleTopbar
          currentLocale={locale}
          localeLabels={messages.locale}
          subtitle={messages.publicTopbar.subtitle}
          switcherAriaLabel={messages.switcher.ariaLabel}
          switcherLabel={messages.switcher.label}
          title={messages.publicTopbar.title}
        />
        {children}
      </main>
    </div>
  );
}
