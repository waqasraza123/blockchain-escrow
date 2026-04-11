import { expect, test } from "../../fixtures/test";

test("customer can update wallet defaults and create a gas policy", async ({
  app,
  customerPage,
  seedData
}) => {
  const walletsUrl = `${app.platformBaseUrl}/orgs/${seedData.customer.organizationId}/wallets`;

  await customerPage.goto(walletsUrl);
  await expect(
    customerPage.getByRole("heading", { name: "Wallet convenience" })
  ).toBeVisible();

  await customerPage.getByLabel("Display name").fill("Primary Customer Wallet");
  await customerPage
    .getByLabel("Approval note template")
    .fill("Escalate if the amount changes.");
  await customerPage.getByRole("button", { name: "Save wallet profile" }).click();

  await expect(customerPage.getByText("Primary Customer Wallet")).toBeVisible();

  await customerPage.getByLabel("Policy name").fill("Default Sponsor Budget");
  await customerPage
    .getByLabel("Description")
    .fill("Covers customer smoke-path funding and settlement requests.");
  await customerPage.getByLabel("Max amount minor").fill("5000000");
  await customerPage.getByLabel("Max requests per day").fill("25");
  await customerPage.getByLabel("Sponsor window minutes").fill("30");
  await customerPage.getByRole("button", { name: "Create gas policy" }).click();

  await expect(
    customerPage.getByRole("table").getByText("Default Sponsor Budget")
  ).toBeVisible();
});
