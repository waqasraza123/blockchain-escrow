import type { SessionCookieOptions, SessionCookieSameSite } from "@blockchain-escrow/security";

export interface AuthConfiguration {
  cookie: SessionCookieOptions;
  nonceTtlSeconds: number;
  sessionTtlSeconds: number;
}

export interface SiwePolicyConfiguration {
  allowedDomains: string[];
  allowedUriOrigins: string[];
}

export const AUTH_CONFIGURATION = Symbol("AUTH_CONFIGURATION");
export const SESSION_TOKEN_SERVICE = Symbol("SESSION_TOKEN_SERVICE");
export const SIWE_POLICY_CONFIGURATION = Symbol("SIWE_POLICY_CONFIGURATION");
export const SIWE_VERIFIER = Symbol("SIWE_VERIFIER");

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

function parseSameSite(
  value: string | undefined
): SessionCookieSameSite {
  if (!value) {
    return "lax";
  }

  if (value === "lax" || value === "none" || value === "strict") {
    return value;
  }

  throw new Error(
    `Expected API_SESSION_COOKIE_SAME_SITE to be one of "lax", "none", or "strict" but received "${value}".`
  );
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Expected a boolean but received "${value}".`);
}

function parseCsvList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function loadAuthConfiguration(): AuthConfiguration {
  const sessionTtlSeconds = parsePositiveInteger(
    process.env.AUTH_SESSION_TTL_SECONDS,
    60 * 60 * 24 * 7
  );
  const cookieDomain = process.env.API_SESSION_COOKIE_DOMAIN || undefined;

  return {
    cookie: {
      httpOnly: true,
      maxAgeSeconds: sessionTtlSeconds,
      name: process.env.API_SESSION_COOKIE_NAME || "be_session",
      path: process.env.API_SESSION_COOKIE_PATH || "/",
      sameSite: parseSameSite(process.env.API_SESSION_COOKIE_SAME_SITE),
      secure: parseBoolean(process.env.API_SESSION_COOKIE_SECURE, process.env.NODE_ENV === "production"),
      ...(cookieDomain ? { domain: cookieDomain } : {})
    },
    nonceTtlSeconds: parsePositiveInteger(process.env.AUTH_NONCE_TTL_SECONDS, 300),
    sessionTtlSeconds
  };
}

export function loadSiwePolicyConfiguration(): SiwePolicyConfiguration {
  const allowedDomains = parseCsvList(process.env.AUTH_SIWE_ALLOWED_DOMAINS);
  const allowedUriOrigins = parseCsvList(process.env.AUTH_SIWE_ALLOWED_URI_ORIGINS);

  if (allowedDomains.length > 0 || allowedUriOrigins.length > 0) {
    return {
      allowedDomains,
      allowedUriOrigins
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Configure AUTH_SIWE_ALLOWED_DOMAINS and AUTH_SIWE_ALLOWED_URI_ORIGINS in production."
    );
  }

  return {
    allowedDomains: ["localhost:3000", "localhost:3001"],
    allowedUriOrigins: ["http://localhost:3000", "http://localhost:3001"]
  };
}
