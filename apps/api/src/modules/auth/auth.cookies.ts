import type { AuthConfiguration } from "./auth.tokens";

function formatSameSite(value: AuthConfiguration["cookie"]["sameSite"]): string {
  if (value === "lax") {
    return "Lax";
  }

  if (value === "none") {
    return "None";
  }

  return "Strict";
}

export function serializeCookie(
  name: string,
  value: string,
  options: AuthConfiguration["cookie"]
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${options.maxAgeSeconds}`,
    `Path=${options.path}`,
    `SameSite=${formatSameSite(options.sameSite)}`
  ];

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function serializeClearedCookie(
  options: AuthConfiguration["cookie"]
): string {
  const parts = [
    `${options.name}=`,
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    `Path=${options.path}`,
    `SameSite=${formatSameSite(options.sameSite)}`
  ];

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(";")) {
    const trimmed = pair.trim();
    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const cookieName = trimmed.slice(0, separatorIndex);

    if (cookieName !== name) {
      continue;
    }

    return decodeURIComponent(trimmed.slice(separatorIndex + 1));
  }

  return null;
}
