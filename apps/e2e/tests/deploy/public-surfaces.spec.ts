import { expect, test } from "@playwright/test";

import { loadDeployConfig } from "../../support/deploy-config";

test("platform root redirects unauthenticated users to sign-in", async ({ page }) => {
  const deploy = loadDeployConfig();

  await page.goto(deploy.platformBaseUrl);

  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Blockchain Escrow" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
});

test("tenant entrypoint renders branding and persists arabic rtl locale", async ({
  page
}) => {
  const deploy = loadDeployConfig();

  await page.goto(deploy.tenantBaseUrl);

  if (deploy.tenantDisplayName) {
    await expect(
      page.getByRole("heading", { name: deploy.tenantDisplayName })
    ).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();

  await Promise.all([
    page.waitForResponse((response) => {
      return (
        response.url().includes("/api/preferences/locale") &&
        response.request().method() === "POST"
      );
    }),
    page.getByRole("button", { name: "العربية" }).click()
  ]);
  await page.waitForLoadState("domcontentloaded");

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("link", { name: /تسجيل الدخول/i })).toBeVisible();
});

test("admin console enforces the operator authorization boundary", async ({ page }) => {
  const deploy = loadDeployConfig();

  await page.goto(deploy.adminBaseUrl);

  await expect(page).toHaveURL(/\/unauthorized(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "Unauthorized" })).toBeVisible();
});

test("hosted launch renders the scoped hosted handoff when a canary url is supplied", async ({
  page
}) => {
  const deploy = loadDeployConfig();

  test.skip(!deploy.hostedLaunchUrl, "No deploy hosted launch url configured.");

  await page.goto(deploy.hostedLaunchUrl ?? "");

  if (deploy.hostedDisplayName) {
    await expect(
      page.getByRole("heading", { name: deploy.hostedDisplayName })
    ).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await expect(
    page.getByRole("button", { name: "Open hosted session" })
  ).toBeVisible();
});
