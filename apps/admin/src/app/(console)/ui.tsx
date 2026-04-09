import Link from "next/link";
import type { ReactNode } from "react";

export function ConsoleHeader(props: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
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
    <section className="card">
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

export function Pill(props: {
  tone?:
    | "neutral"
    | "info"
    | "warning"
    | "danger"
    | "success";
  value: string;
}) {
  return (
    <span className={`pill pill-${props.tone ?? "neutral"}`}>{props.value}</span>
  );
}

export function toneForStatus(value: string | null | undefined) {
  const normalized = (value ?? "").toUpperCase();

  if (
    normalized.includes("FAILED") ||
    normalized.includes("BLOCKED") ||
    normalized.includes("MISMATCHED") ||
    normalized.includes("CRITICAL") ||
    normalized.includes("REFUNDED") ||
    normalized.includes("UNREACHABLE")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("PENDING") ||
    normalized.includes("STALE") ||
    normalized.includes("ACKNOWLEDGED") ||
    normalized.includes("IN_REVIEW") ||
    normalized.includes("ESCALATED") ||
    normalized.includes("UNHEALTHY")
  ) {
    return "warning" as const;
  }

  if (
    normalized.includes("CONFIRMED") ||
    normalized.includes("RESOLVED") ||
    normalized.includes("CLEARED") ||
    normalized.includes("FUNDED") ||
    normalized.includes("HEALTHY") ||
    normalized.includes("COMPLETED")
  ) {
    return "success" as const;
  }

  return "neutral" as const;
}

export function MetricGrid(props: {
  items: Array<{ label: string; value: number | string }>;
}) {
  return (
    <div className="metric-grid">
      {props.items.map((item) => (
        <div className="metric-card" key={item.label}>
          <span>{item.label}</span>
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

export function InlineList(props: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <div className="inline-list">
      {props.items.map((item) =>
        item.href ? (
          <Link href={item.href} key={`${item.label}:${item.href}`}>
            {item.label}
          </Link>
        ) : (
          <span key={item.label}>{item.label}</span>
        )
      )}
    </div>
  );
}

export function EmptyState(props: { body: string }) {
  return <p className="empty-state">{props.body}</p>;
}
