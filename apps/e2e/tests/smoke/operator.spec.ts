import { expect, test } from "../../fixtures/test";

test("operator can read dashboard, partners, and billing surfaces", async ({
  app,
  operatorPage
}) => {
  await operatorPage.goto(`${app.adminBaseUrl}/`);
  await expect(
    operatorPage.getByRole("heading", { name: "Operator dashboard" })
  ).toBeVisible();

  await operatorPage.goto(`${app.adminBaseUrl}/partners`);
  await expect(
    operatorPage.getByRole("heading", { name: "Partner accounts" })
  ).toBeVisible();
  await expect(operatorPage.getByText("Tenant A Partner")).toBeVisible();

  await operatorPage.goto(`${app.adminBaseUrl}/billing`);
  await expect(operatorPage.getByText("Embedded Starter")).toBeVisible();
});
