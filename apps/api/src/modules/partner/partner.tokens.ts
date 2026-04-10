import { createHash } from "node:crypto";

export interface PartnerConfiguration {
  readonly apiKeyPrefix: string;
  readonly hostedCookieName: string;
  readonly hostedBaseUrl: string;
  readonly hostedSessionSecret: string;
  readonly hostedSessionTtlSeconds: number;
}

export const PARTNER_CONFIGURATION = Symbol("PARTNER_CONFIGURATION");

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/+$/u, "");
}

export function loadPartnerConfiguration(): PartnerConfiguration {
  const hostedSessionSecret =
    process.env.API_PARTNER_HOSTED_SESSION_SECRET?.trim() ||
    "development-partner-hosted-session-secret-change-me";

  if (!hostedSessionSecret) {
    throw new Error("API_PARTNER_HOSTED_SESSION_SECRET must not be empty");
  }

  const hostedBaseUrl = normalizeBaseUrl(
    process.env.API_PARTNER_HOSTED_BASE_URL ?? process.env.WEB_BASE_URL,
    "http://127.0.0.1:3000"
  );

  return {
    apiKeyPrefix: process.env.API_PARTNER_API_KEY_PREFIX?.trim() || "besk",
    hostedBaseUrl,
    hostedCookieName: process.env.API_PARTNER_HOSTED_COOKIE_NAME?.trim() || "bes_hosted_session",
    hostedSessionSecret: createHash("sha256").update(hostedSessionSecret).digest("hex"),
    hostedSessionTtlSeconds: Number.parseInt(
      process.env.API_PARTNER_HOSTED_SESSION_TTL_SECONDS ?? "3600",
      10
    )
  };
}
