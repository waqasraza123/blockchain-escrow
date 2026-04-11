import { expect, test } from "../../fixtures/test";

test("customer can reach the dashboard, draft detail, and version detail", async ({
  app,
  customerPage,
  seedData
}) => {
  await customerPage.goto(`${app.platformBaseUrl}/`);
  await expect(
    customerPage.getByRole("heading", { name: "Organization dashboard" })
  ).toBeVisible();

  await customerPage.goto(
    `${app.platformBaseUrl}/orgs/${seedData.customer.organizationId}/drafts`
  );
  await expect(
    customerPage.getByRole("link", { name: "Q2 Implementation Escrow" })
  ).toBeVisible();

  await customerPage.getByRole("link", { name: "Q2 Implementation Escrow" }).click();
  await expect(
    customerPage.getByRole("heading", { name: "Q2 Implementation Escrow" })
  ).toBeVisible();

  await customerPage
    .getByRole("link", { name: "Open version" })
    .click();

  await expect(
    customerPage.getByRole("heading", { name: "Q2 Implementation Escrow v1" })
  ).toBeVisible();
  await expect(customerPage.getByText("Funding preparation")).toBeVisible();
  await expect(customerPage.getByText("Review console")).toBeVisible();
});
