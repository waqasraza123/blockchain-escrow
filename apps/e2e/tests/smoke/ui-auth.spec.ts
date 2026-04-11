import { expect, test } from "../../fixtures/test";
import { installInjectedWallet } from "../../support/wallet-shim";
import { testWallets } from "../../support/test-wallets";

test("platform sign-in works with the injected wallet shim", async ({
  app,
  page,
  seedData
}) => {
  await installInjectedWallet(page, testWallets.customer, app.chainId);

  await page.goto(
    `${app.platformBaseUrl}/sign-in?returnPath=/orgs/${seedData.customer.organizationId}`
  );
  await page.getByRole("button", { name: "Connect wallet" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/orgs/${seedData.customer.organizationId}$`)
  );
  await expect(
    page.getByRole("heading", { name: "Organization dashboard" })
  ).toBeVisible();
});
