import { expect, test } from "../../../fixtures/test";

test("customer can capture a statement snapshot and queue a finance export", async ({
  app,
  customerPage,
  seedData
}) => {
  const versionDetailUrl = `${app.platformBaseUrl}/orgs/${seedData.customer.organizationId}/drafts/${seedData.customer.draftDealId}/versions/${seedData.customer.dealVersionId}`;
  const financeUrl = `${app.platformBaseUrl}/orgs/${seedData.customer.organizationId}/finance`;

  await customerPage.goto(versionDetailUrl);
  await expect(
    customerPage.getByRole("heading", { name: "Q2 Implementation Escrow v1" })
  ).toBeVisible();

  await customerPage
    .getByLabel("Snapshot note")
    .fill("Regression snapshot note for finance reporting.");
  await customerPage
    .getByRole("button", { name: "Capture statement snapshot" })
    .click({ noWaitAfter: true });
  await customerPage.waitForLoadState("networkidle");

  await customerPage.goto(financeUrl);
  await expect(
    customerPage.getByRole("heading", { name: "Finance controls" })
  ).toBeVisible();
  await expect(customerPage.getByText("DEAL_VERSION_SETTLEMENT")).toBeVisible();
  await expect(customerPage.getByText(seedData.customer.dealVersionId)).toBeVisible();

  await customerPage.getByLabel("Date from").fill("2026-04-01");
  await customerPage.getByLabel("Date to").fill("2026-04-30");
  await customerPage.getByRole("button", { name: "Queue export job" }).click({
    noWaitAfter: true
  });
  await customerPage.waitForLoadState("networkidle");

  await expect(
    customerPage.getByRole("table").getByText("PENDING")
  ).toBeVisible();
});
