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

export function validateAdminStartupConfiguration(): void {
  if (!isProductionLaunchMode(process.env.APP_LAUNCH_MODE)) {
    return;
  }

  assertProductionLaunchUrl(process.env.ADMIN_API_BASE_URL, "ADMIN_API_BASE_URL");
}
