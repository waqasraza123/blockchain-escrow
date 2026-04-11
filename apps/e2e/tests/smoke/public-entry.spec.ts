import { expect, test } from "../../fixtures/test";

test("tenant entrypoint renders and persists arabic rtl locale", async ({
  app,
  page,
  seedData
}) => {
  await page.goto(app.tenantBaseUrl);

  await expect(
    page.getByRole("heading", { name: seedData.tenant.displayName })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue to sign in" })
  ).toBeVisible();

  await page.getByRole("button", { name: "العربية" }).click();

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(
    page.getByRole("link", { name: "الاستمرار إلى تسجيل الدخول" })
  ).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
