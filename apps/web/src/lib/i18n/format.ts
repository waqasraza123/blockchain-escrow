import type { WebMessages } from "./messages";

export function humanizeCode(value: string): string {
  return value
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((segment) =>
      segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
    )
    .join(" ");
}

export function formatCode(
  value: string | null | undefined,
  translations: Partial<Record<string, string>>,
  fallback: string
): string {
  if (!value) {
    return fallback;
  }

  return translations[value] ?? humanizeCode(value);
}

export function formatBoolean(
  value: boolean,
  messages: WebMessages
): string {
  return value ? messages.common.yes : messages.common.no;
}
