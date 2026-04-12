import { expect, test } from "../../../fixtures/test";
import { installInjectedWallet } from "../../../support/wallet-shim";
import { testWallets } from "../../../support/test-wallets";

test("customer can execute a prepared settlement from the version detail page", async ({
  app,
  customerPage,
  seedData
}) => {
  await installInjectedWallet(customerPage, testWallets.customer, app.chainId, {
    activeChainId: 1
  });

  const versionDetailUrl = `${app.platformBaseUrl}/orgs/${seedData.customer.organizationId}/drafts/${seedData.settlementReady.draftDealId}/versions/${seedData.settlementReady.dealVersionId}`;
  const expectedHash =
    "0x0000000000000000000000000000000000000000000000000000000000000001";

  await customerPage.goto(versionDetailUrl);
  await expect(
    customerPage.getByRole("heading", { name: "Settlement Ready Escrow v1" })
  ).toBeVisible();
  await expect(
    customerPage.getByRole("button", { name: "Execute release" })
  ).toBeVisible();

  await customerPage.getByRole("button", { name: "Execute release" }).click();

  await expect(customerPage.getByText(expectedHash)).toBeVisible();
  await expect(customerPage.getByText("Latest tracked transaction")).toBeVisible();
  await expect(customerPage.getByText("Pending")).toBeVisible();
});
