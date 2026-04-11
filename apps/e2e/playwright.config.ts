import { defineConfig, devices } from "@playwright/test";

import { repoRoot } from "./support/paths";

const isCi = Boolean(process.env.CI);
const suite = process.env.E2E_SUITE ?? "smoke";
const platformBaseUrl =
  process.env.E2E_PLATFORM_BASE_URL ?? "http://platform.lvh.me:3300";
const adminBaseUrl = process.env.E2E_ADMIN_BASE_URL ?? "http://admin.lvh.me:3301";
const apiPort = process.env.API_PORT ?? "4400";
const platformPort = new URL(platformBaseUrl).port || "3300";
const adminPort = new URL(adminBaseUrl).port || "3301";
const reuseExistingServer = process.env.E2E_REUSE_EXISTING_SERVER === "1";
const isDeploySmokeSuite = suite === "deploy-smoke";
const testIgnore =
  suite === "regression"
    ? ["**/smoke/**", "**/visual/**"]
    : suite === "deploy-smoke"
      ? ["**/smoke/**", "**/regression/**", "**/visual/**"]
    : suite === "visual"
      ? ["**/smoke/**", "**/regression/**"]
      : ["**/regression/**", "**/visual/**"];

export default defineConfig({
  fullyParallel: false,
  outputDir: "test-results/results",
  reporter: isCi
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["blob", { outputDir: "test-results/blob-report" }],
        ["junit", { outputFile: "test-results/junit.xml" }]
      ]
    : [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["blob", { outputDir: "test-results/blob-report" }],
        ["junit", { outputFile: "test-results/junit.xml" }]
      ],
  retries: isCi ? 1 : 0,
  testDir: "./tests",
  testIgnore,
  timeout: 60_000,
  use: {
    actionTimeout: 10_000,
    colorScheme: "light",
    baseURL: platformBaseUrl,
    locale: "en-US",
    screenshot: "only-on-failure",
    timezoneId: "UTC",
    trace: "on-first-retry",
    video: "on-first-retry",
    viewport: { width: 1440, height: 960 }
  },
  workers: 1,
  ...(isDeploySmokeSuite
    ? {}
    : {
        globalSetup: "./support/global-setup.ts",
        webServer: [
          {
            command: "node scripts/with-local-env.mjs pnpm --filter @blockchain-escrow/api start",
            cwd: repoRoot,
            env: {
              ...process.env,
              LOCAL_ENV_FILES: ".env.e2e"
            },
            reuseExistingServer,
            timeout: 120_000,
            url: `http://127.0.0.1:${apiPort}/health/ready`
          },
          {
            command: `node scripts/with-local-env.mjs pnpm --filter @blockchain-escrow/web exec next dev --port ${platformPort}`,
            cwd: repoRoot,
            env: {
              ...process.env,
              LOCAL_ENV_FILES: ".env.e2e"
            },
            reuseExistingServer,
            timeout: 180_000,
            url: platformBaseUrl
          },
          {
            command: `node scripts/with-local-env.mjs pnpm --filter @blockchain-escrow/admin exec next dev --port ${adminPort}`,
            cwd: repoRoot,
            env: {
              ...process.env,
              LOCAL_ENV_FILES: ".env.e2e"
            },
            reuseExistingServer,
            timeout: 180_000,
            url: adminBaseUrl
          }
        ]
      }),
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
