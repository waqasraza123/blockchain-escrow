export type AppLaunchMode = "development" | "production";

const nonProductionNetworkPattern =
  /(sepolia|goerli|holesky|localhost|anvil|hardhat)/iu;
const walletAddressPattern = /^0x[a-fA-F0-9]{40}$/u;

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
  envName: string,
  options?: {
    readonly requireHttps?: boolean;
  }
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

  if (options?.requireHttps && parsed.protocol !== "https:") {
    throw new Error(
      `${envName} must use https when APP_LAUNCH_MODE=production.`
    );
  }

  return normalized.replace(/\/+$/u, "");
}

function parseExpectedPositiveInteger(value: string | undefined, envName: string): number {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${envName} must be configured when APP_LAUNCH_MODE=production.`);
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${envName} must be a positive integer when APP_LAUNCH_MODE=production.`
    );
  }

  return parsed;
}

function parseExpectedWalletAddress(value: string | undefined, envName: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${envName} must be configured when APP_LAUNCH_MODE=production.`);
  }

  if (!walletAddressPattern.test(normalized)) {
    throw new Error(
      `${envName} must be a valid 0x wallet address when APP_LAUNCH_MODE=production.`
    );
  }

  return normalized.toLowerCase();
}

function parseExpectedString(value: string | undefined, envName: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${envName} must be configured when APP_LAUNCH_MODE=production.`);
  }

  return normalized;
}

export function assertProductionDeploymentProfile(
  manifest: {
    readonly chainId: number;
    readonly contractVersion: number;
    readonly explorerUrl: string;
    readonly network: string;
    readonly treasury: string | null;
    readonly usdcToken: string | null;
  },
  chainId: number,
  envName: string
): void {
  const expectedChainId = parseExpectedPositiveInteger(
    process.env.APP_EXPECTED_CHAIN_ID,
    "APP_EXPECTED_CHAIN_ID"
  );

  if (expectedChainId !== chainId || manifest.chainId !== expectedChainId) {
    throw new Error(
      `${envName}=${chainId} does not match APP_EXPECTED_CHAIN_ID=${expectedChainId}.`
    );
  }

  const expectedContractVersion = parseExpectedPositiveInteger(
    process.env.APP_EXPECTED_CONTRACT_VERSION,
    "APP_EXPECTED_CONTRACT_VERSION"
  );

  if (manifest.contractVersion !== expectedContractVersion) {
    throw new Error(
      `${envName} manifest contractVersion=${manifest.contractVersion} does not match APP_EXPECTED_CONTRACT_VERSION=${expectedContractVersion}.`
    );
  }

  const expectedNetwork = parseExpectedString(
    process.env.APP_EXPECTED_NETWORK,
    "APP_EXPECTED_NETWORK"
  );

  if (manifest.network !== expectedNetwork) {
    throw new Error(
      `${envName} manifest network=${manifest.network} does not match APP_EXPECTED_NETWORK=${expectedNetwork}.`
    );
  }

  const expectedExplorerUrl = assertProductionLaunchUrl(
    process.env.APP_EXPECTED_EXPLORER_URL,
    "APP_EXPECTED_EXPLORER_URL",
    { requireHttps: true }
  );

  if (manifest.explorerUrl.replace(/\/+$/u, "") !== expectedExplorerUrl) {
    throw new Error(
      `${envName} manifest explorerUrl=${manifest.explorerUrl} does not match APP_EXPECTED_EXPLORER_URL=${expectedExplorerUrl}.`
    );
  }

  const expectedTreasuryAddress = parseExpectedWalletAddress(
    process.env.APP_EXPECTED_TREASURY_ADDRESS,
    "APP_EXPECTED_TREASURY_ADDRESS"
  );

  if (!manifest.treasury) {
    throw new Error(
      `${envName} manifest treasury must be configured when APP_LAUNCH_MODE=production.`
    );
  }

  if (manifest.treasury.toLowerCase() !== expectedTreasuryAddress) {
    throw new Error(
      `${envName} manifest treasury=${manifest.treasury} does not match APP_EXPECTED_TREASURY_ADDRESS=${expectedTreasuryAddress}.`
    );
  }

  const expectedUsdcTokenAddress = parseExpectedWalletAddress(
    process.env.APP_EXPECTED_USDC_TOKEN_ADDRESS,
    "APP_EXPECTED_USDC_TOKEN_ADDRESS"
  );

  if (!manifest.usdcToken) {
    throw new Error(
      `${envName} manifest usdcToken must be configured when APP_LAUNCH_MODE=production.`
    );
  }

  if (manifest.usdcToken.toLowerCase() !== expectedUsdcTokenAddress) {
    throw new Error(
      `${envName} manifest usdcToken=${manifest.usdcToken} does not match APP_EXPECTED_USDC_TOKEN_ADDRESS=${expectedUsdcTokenAddress}.`
    );
  }
}
