export type AppLaunchMode = "development" | "production";

const nonProductionNetworkPattern =
  /(sepolia|goerli|holesky|localhost|anvil|hardhat)/iu;

function normalizeLaunchMode(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
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
