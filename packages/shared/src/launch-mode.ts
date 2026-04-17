export type AppLaunchMode = "development" | "production";

const nonProductionNetworkPattern =
  /(sepolia|goerli|holesky|localhost|anvil|hardhat)/iu;

function normalizeLaunchMode(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

export function parseAppLaunchMode(value: string | undefined): AppLaunchMode {
  const normalized = normalizeLaunchMode(value);

  if (!normalized) {
    return "development";
  }

  if (normalized === "development" || normalized === "production") {
    return normalized;
  }

  throw new Error(
    `Invalid APP_LAUNCH_MODE: expected "development" or "production", received ${value}`
  );
}

export function isProductionLaunchMode(value: string | undefined): boolean {
  return parseAppLaunchMode(value) === "production";
}

export function manifestSupportsProductionLaunch(input: {
  network: string;
}): boolean {
  return !nonProductionNetworkPattern.test(input.network);
}

export function assertProductionLaunchManifest(
  manifest: { network: string },
  chainId: number,
  envName: string
): void {
  if (manifestSupportsProductionLaunch(manifest)) {
    return;
  }

  throw new Error(
    `${envName}=${chainId} resolves to ${manifest.network}, which is not allowed when APP_LAUNCH_MODE=production.`
  );
}

export function assertProductionLaunchUrl(
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

  if (isLocalHostname(parsed.hostname)) {
    throw new Error(
      `${envName} must not point to localhost when APP_LAUNCH_MODE=production.`
    );
  }

  return normalized.replace(/\/+$/u, "");
}
