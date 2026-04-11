import { expect, test } from "../../fixtures/test";

test("hosted launch exchanges into a scoped review workspace", async ({
  app,
  page,
  seedData
}) => {
  await page.goto(`${app.hostedBaseUrl}/hosted/${seedData.hosted.launchToken}`);

  await expect(
    page.getByRole("heading", { name: seedData.tenant.displayName })
  ).toBeVisible();
  await page.getByRole("button", { name: "Open hosted session" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/hosted/${seedData.hosted.launchToken}/workspace$`)
  );
  await expect(page.getByText("Draft context")).toBeVisible();
  await expect(page.getByText("Q2 Implementation Escrow")).toBeVisible();
});
