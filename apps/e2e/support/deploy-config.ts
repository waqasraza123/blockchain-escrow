export interface E2EDeployConfig {
  adminBaseUrl: string;
  hostedDisplayName: string | null;
  hostedLaunchUrl: string | null;
  platformBaseUrl: string;
  tenantBaseUrl: string;
  tenantDisplayName: string | null;
}

function requiredBaseUrl(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Expected ${key} to be set for deploy smoke runs.`);
  }

  return value.replace(/\/+$/u, "");
}

function optionalValue(key: string): string | null {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

export function loadDeployConfig(): E2EDeployConfig {
  return {
    adminBaseUrl: requiredBaseUrl("E2E_ADMIN_BASE_URL"),
    hostedDisplayName: optionalValue("E2E_DEPLOY_HOSTED_DISPLAY_NAME"),
    hostedLaunchUrl: optionalValue("E2E_DEPLOY_HOSTED_LAUNCH_URL"),
    platformBaseUrl: requiredBaseUrl("E2E_PLATFORM_BASE_URL"),
    tenantBaseUrl: requiredBaseUrl("E2E_TENANT_BASE_URL"),
    tenantDisplayName: optionalValue("E2E_DEPLOY_TENANT_DISPLAY_NAME")
  };
}
