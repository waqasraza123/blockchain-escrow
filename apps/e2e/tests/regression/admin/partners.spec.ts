import { expect, test } from "../../../fixtures/test";

test("operator can create a partner account from the console", async ({
  app,
  operatorPage
}) => {
  const slug = "regression-partner";
  const partnerName = "Regression Partner";

  await operatorPage.goto(`${app.adminBaseUrl}/partners`);

  await expect(
    operatorPage.getByRole("heading", { level: 1, name: "Partner accounts" })
  ).toBeVisible();

  await operatorPage.getByLabel("Name").fill(partnerName);
  await operatorPage.getByLabel("Slug").fill(slug);
  await operatorPage.getByLabel("Metadata JSON").fill('{"tier":"regression"}');
  await operatorPage.getByRole("button", { name: "Create partner" }).click({
    noWaitAfter: true
  });
  await operatorPage.waitForLoadState("networkidle");

  await expect(
    operatorPage.getByRole("heading", { name: partnerName })
  ).toBeVisible();
  await expect(operatorPage.getByText(slug)).toBeVisible();
});
