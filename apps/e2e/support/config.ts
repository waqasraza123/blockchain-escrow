export interface E2EAppConfig {
  adminBaseUrl: string;
  chainId: number;
  hostedBaseUrl: string;
  platformBaseUrl: string;
  tenantBaseUrl: string;
}

function readBaseUrl(
  key: "E2E_ADMIN_BASE_URL" | "E2E_HOSTED_BASE_URL" | "E2E_PLATFORM_BASE_URL" | "E2E_TENANT_BASE_URL",
  fallback: string
): string {
  return (process.env[key]?.trim() || fallback).replace(/\/+$/u, "");
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected ${value} to be a positive integer.`);
  }

  return parsed;
}

export function loadAppConfig(): E2EAppConfig {
  return {
    adminBaseUrl: readBaseUrl("E2E_ADMIN_BASE_URL", "http://admin.lvh.me:3001"),
    chainId: parsePositiveInteger(process.env.BASE_CHAIN_ID, 84532),
    hostedBaseUrl: readBaseUrl("E2E_HOSTED_BASE_URL", "http://hosted-a.lvh.me:3000"),
    platformBaseUrl: readBaseUrl(
      "E2E_PLATFORM_BASE_URL",
      "http://platform.lvh.me:3000"
    ),
    tenantBaseUrl: readBaseUrl("E2E_TENANT_BASE_URL", "http://tenant-a.lvh.me:3000")
  };
}
