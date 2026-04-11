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
  await expect(
    page.getByRole("button", { name: "Open hosted session" })
  ).toBeVisible();
  await Promise.all([
    page.waitForURL(new RegExp(`/hosted/${seedData.hosted.launchToken}/workspace$`), {
      timeout: 15_000,
      waitUntil: "domcontentloaded"
    }),
    page
      .getByRole("button", { name: "Open hosted session" })
      .click({ noWaitAfter: true })
  ]);

  await expect(page.getByText("Draft context")).toBeVisible();
  await expect(page.getByText("Q2 Implementation Escrow")).toBeVisible();
});
