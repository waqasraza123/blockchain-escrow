import { expect, test } from "../../../fixtures/test";
import { installInjectedWallet } from "../../../support/wallet-shim";
import { testWallets } from "../../../support/test-wallets";

function settlementReadyUrl(baseUrl: string, organizationId: string, seedData: {
  settlementReady: { draftDealId: string; dealVersionId: string };
}) {
  return `${baseUrl}/orgs/${organizationId}/drafts/${seedData.settlementReady.draftDealId}/versions/${seedData.settlementReady.dealVersionId}`;
}

function settlementPendingUrl(baseUrl: string, organizationId: string, seedData: {
  settlementPending: { draftDealId: string; dealVersionId: string };
}) {
  return `${baseUrl}/orgs/${organizationId}/drafts/${seedData.settlementPending.draftDealId}/versions/${seedData.settlementPending.dealVersionId}`;
}

test("customer can execute a prepared settlement from the version detail page", async ({
  app,
  customerPage,
  seedData
}) => {
  await installInjectedWallet(customerPage, testWallets.customer, app.chainId, {
    activeChainId: 1
  });

  const versionDetailUrl = settlementReadyUrl(
    app.platformBaseUrl,
    seedData.customer.organizationId,
    seedData
  );
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

test("customer sees a missing-wallet error when no injected wallet is available", async ({
  app,
  customerPage,
  seedData
}) => {
  await customerPage.goto(
    settlementReadyUrl(app.platformBaseUrl, seedData.customer.organizationId, seedData)
  );

  await customerPage.getByRole("button", { name: "Execute release" }).click();

  await expect(customerPage.getByText("No injected wallet was detected.")).toBeVisible();
});

test("customer sees a connected-wallet mismatch error for the wrong account", async ({
  app,
  customerPage,
  seedData
}) => {
  await installInjectedWallet(customerPage, testWallets.operator, app.chainId);
  await customerPage.goto(
    settlementReadyUrl(app.platformBaseUrl, seedData.customer.organizationId, seedData)
  );

  await customerPage.getByRole("button", { name: "Execute release" }).click();

  await expect(
    customerPage.getByText(
      "The connected wallet does not match the authenticated session wallet."
    )
  ).toBeVisible();
});

test("customer sees a chain-switch failure when the wallet rejects switching networks", async ({
  app,
  customerPage,
  seedData
}) => {
  await installInjectedWallet(customerPage, testWallets.customer, app.chainId, {
    activeChainId: 1,
    switchChainFails: true
  });
  await customerPage.goto(
    settlementReadyUrl(app.platformBaseUrl, seedData.customer.organizationId, seedData)
  );

  await customerPage.getByRole("button", { name: "Execute release" }).click();

  await expect(customerPage.getByText("Wallet chain switch failed.")).toBeVisible();
});

test("customer sees a wallet rejection error when transaction submission is declined", async ({
  app,
  customerPage,
  seedData
}) => {
  await installInjectedWallet(customerPage, testWallets.customer, app.chainId, {
    rejectSendTransaction: true
  });
  await customerPage.goto(
    settlementReadyUrl(app.platformBaseUrl, seedData.customer.organizationId, seedData)
  );

  await customerPage.getByRole("button", { name: "Execute release" }).click();

  await expect(
    customerPage.getByText("Wallet signature or submission was rejected.")
  ).toBeVisible();
});

test("customer sees a replacement CTA when a tracked settlement transaction is already pending", async ({
  app,
  customerPage,
  seedData
}) => {
  await installInjectedWallet(customerPage, testWallets.customer, app.chainId);
  await customerPage.goto(
    settlementPendingUrl(app.platformBaseUrl, seedData.customer.organizationId, seedData)
  );

  await expect(
    customerPage.getByRole("heading", { name: "Settlement Pending Escrow v1" })
  ).toBeVisible();
  await expect(
    customerPage.getByText(
      "A tracked transaction is still pending. Submit a replacement only if you intend to replace it."
    )
  ).toBeVisible();
  await expect(
    customerPage.getByRole("button", { name: "Submit replacement release" })
  ).toBeVisible();
  await expect(
    customerPage.getByRole("button", { name: "Request sponsored settlement" })
  ).toHaveCount(0);
  await expect(
    customerPage.getByText(
      "0x5555555555555555555555555555555555555555555555555555555555555555"
    )
  ).toBeVisible();
});
