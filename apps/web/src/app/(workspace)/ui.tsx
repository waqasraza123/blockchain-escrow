import Link from "next/link";
import type { ReactNode } from "react";

export function WorkspaceHeader(props: {
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <header className="page-header">
      {props.eyebrow ? <p className="eyebrow">{props.eyebrow}</p> : null}
      <h1>{props.title}</h1>
      {props.subtitle ? <p className="lede">{props.subtitle}</p> : null}
    </header>
  );
}

export function Card(props: {
  actions?: ReactNode;
  children: ReactNode;
  title?: string;
}) {
  return (
    <section className="workspace-card">
      {props.title || props.actions ? (
        <div className="card-header">
          {props.title ? <h2>{props.title}</h2> : <span />}
          {props.actions ? <div className="card-actions">{props.actions}</div> : null}
        </div>
      ) : null}
      {props.children}
    </section>
  );
}

export function MetricGrid(props: {
  items: Array<{ label: string; value: number | string }>;
}) {
  return (
    <div className="metric-grid">
      {props.items.map((item) => (
        <div className="metric-card" key={item.label}>
          <span className="muted">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function DataTable(props: {
  children: ReactNode;
  headers: string[];
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {props.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{props.children}</tbody>
      </table>
    </div>
  );
}

export function EmptyState(props: { body: string }) {
  return <p className="empty-state">{props.body}</p>;
}

export function Pill(props: {
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
  value: string;
}) {
  return <span className={`pill pill-${props.tone ?? "neutral"}`}>{props.value}</span>;
}

export function toneForStatus(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();

  if (
    normalized.includes("FAILED") ||
    normalized.includes("REJECTED") ||
    normalized.includes("BLOCKED") ||
    normalized.includes("REFUND")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("PENDING") ||
    normalized.includes("REQUIRED") ||
    normalized.includes("PROCESSING") ||
    normalized.includes("DISPUTED")
  ) {
    return "warning" as const;
  }

  if (
    normalized.includes("APPROVED") ||
    normalized.includes("CONFIRMED") ||
    normalized.includes("COMPLETED") ||
    normalized.includes("RELEASED") ||
    normalized.includes("ACTIVE")
  ) {
    return "success" as const;
  }

  if (normalized.includes("NOT_REQUIRED")) {
    return "info" as const;
  }

  return "neutral" as const;
}

export function InlineLinks(props: {
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="inline-list">
      {props.items.map((item) => (
        <Link href={item.href} key={`${item.href}:${item.label}`}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
