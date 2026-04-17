import { isProductionLaunchMode } from "@blockchain-escrow/shared";

import { loadAuthConfiguration, loadSiwePolicyConfiguration } from "./modules/auth/auth.tokens";
import { normalizeApiChainId } from "./modules/drafts/deal-identity";
import { loadFundingChainReader } from "./modules/funding/funding-chain-reader";
import { loadOperatorConfiguration } from "./modules/operator/operator.tokens";
import { loadPartnerConfiguration } from "./modules/partner/partner.tokens";

const DEFAULT_SESSION_SECRET = "development-session-secret-change-me";
const DEFAULT_PARTNER_HOSTED_SECRET =
  "development-partner-hosted-session-secret-change-me";

function parseOptionalString(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function assertConfiguredSecret(
  envName: string,
  value: string | undefined,
  disallowedDefaults: readonly string[]
): void {
  const normalized = parseOptionalString(value);

  if (!normalized) {
    throw new Error(`${envName} must be configured when APP_LAUNCH_MODE=production.`);
  }

  if (disallowedDefaults.includes(normalized)) {
    throw new Error(
      `${envName} must not use a development default when APP_LAUNCH_MODE=production.`
    );
  }
}

function assertPublicBaseUrl(
  envName: string,
  value: string
): void {
  let parsed: URL;

  try {
    parsed = new URL(value);
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
}

function assertNoLocalDevelopmentOrigins(
  values: readonly string[],
  envName: string
): void {
  for (const value of values) {
    const normalized = value.toLowerCase();
    if (
      normalized.includes("localhost") ||
      normalized.includes("127.0.0.1") ||
      normalized.includes("::1")
    ) {
      throw new Error(
        `${envName} must not include localhost values when APP_LAUNCH_MODE=production.`
      );
    }
  }
}

export function validateApiStartupConfiguration(): void {
  const authConfiguration = loadAuthConfiguration();
  const siwePolicy = loadSiwePolicyConfiguration();

  normalizeApiChainId();
  loadFundingChainReader();
  loadOperatorConfiguration();
  const partnerConfiguration = loadPartnerConfiguration();

  if (!isProductionLaunchMode(process.env.APP_LAUNCH_MODE)) {
    return;
  }

  if (!authConfiguration.cookie.secure) {
    throw new Error(
      "API_SESSION_COOKIE_SECURE must be true when APP_LAUNCH_MODE=production."
    );
  }

  assertConfiguredSecret("API_SESSION_SECRET", process.env.API_SESSION_SECRET, [
    DEFAULT_SESSION_SECRET
  ]);
  assertConfiguredSecret(
    "API_PARTNER_HOSTED_SESSION_SECRET",
    process.env.API_PARTNER_HOSTED_SESSION_SECRET,
    [DEFAULT_PARTNER_HOSTED_SECRET]
  );
  assertPublicBaseUrl("API_PARTNER_HOSTED_BASE_URL", partnerConfiguration.hostedBaseUrl);
  assertNoLocalDevelopmentOrigins(
    siwePolicy.allowedDomains,
    "AUTH_SIWE_ALLOWED_DOMAINS"
  );
  assertNoLocalDevelopmentOrigins(
    siwePolicy.allowedUriOrigins,
    "AUTH_SIWE_ALLOWED_URI_ORIGINS"
  );
}
