import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getOperatorSession } from "../../lib/operator-api";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/search", label: "Search" },
  { href: "/health", label: "Health" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/alerts", label: "Alerts" },
  { href: "/checkpoints", label: "Checkpoints" },
  { href: "/cases", label: "Cases" },
  { href: "/protocol-proposals", label: "Protocol Proposals" }
];

type ConsoleLayoutProps = {
  children: ReactNode;
};

export default async function ConsoleLayout({
  children
}: ConsoleLayoutProps) {
  const session = await getOperatorSession();

  if (!session) {
    redirect("/unauthorized");
  }

  return (
    <div className="console-shell">
      <aside className="console-sidebar">
        <div className="brand-mark">
          <strong>Ops Console</strong>
          <span>Release 8 internal operator workspace</span>
        </div>
        <div className="operator-meta">
          <small>{session.operator.role}</small>
          <strong className="mono">{session.operator.walletAddress}</strong>
          <span className="muted">operator {session.operator.id}</span>
        </div>
        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link className="sidebar-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="console-main">{children}</main>
    </div>
  );
}
