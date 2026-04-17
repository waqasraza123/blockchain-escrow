const defaultHostedCookieName = "bes_hosted_session";

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isProductionLaunchMode(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "production";
}

function assertProductionLaunchUrl(
  value: string | undefined,
  envName: string
): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${envName} must be configured when APP_LAUNCH_MODE=production.`);
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  ) {
    throw new Error(
      `${envName} must not point to localhost when APP_LAUNCH_MODE=production.`
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${envName} must use https when APP_LAUNCH_MODE=production.`);
  }

  return normalized.replace(/\/+$/u, "");
}

export function getHostedSessionCookieName(): string {
  return parseOptionalString(process.env.API_PARTNER_HOSTED_COOKIE_NAME) ?? defaultHostedCookieName;
}

export function getHostedSessionCookieOptions(expiresAt: string): {
  expires: Date;
  httpOnly: true;
  path: "/";
  sameSite: "lax";
  secure: boolean;
} {
  return {
    expires: new Date(expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  };
}

export function validateWebStartupConfiguration(): void {
  if (!isProductionLaunchMode(process.env.APP_LAUNCH_MODE)) {
    return;
  }

  assertProductionLaunchUrl(process.env.WEB_API_BASE_URL, "WEB_API_BASE_URL");
}
