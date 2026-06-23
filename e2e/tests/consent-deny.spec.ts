import { expect, test } from "@playwright/test";
import { assertNotAuthenticated, denyConsent } from "../helpers/auth.js";
import { URLS } from "../helpers/constants.js";

test.describe("Consent 拒否フロー", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("Consent 拒否時に App A へ access_denied を返す", async ({ page }) => {
    const unique = Date.now().toString(36);
    const email = `consent-deny-${unique}@example.com`;

    await page.goto(URLS.APP_A);
    await assertNotAuthenticated(page);

    await page.click("a.btn-primary");
    await page.waitForURL(/auth\.localtest\.me.*\/login/);

    await page.click("text=新規登録");
    await page.waitForURL(/auth\.localtest\.me.*\/signup/);
    await page.fill("input#name", "Consent Deny User");
    await page.fill("input#email", email);
    await page.fill("input#password", "testpassword123");
    await page.click('button[type="submit"]');

    await page.waitForURL(/auth\.localtest\.me.*\/consent/, { timeout: 15000 });
    await denyConsent(page);

    await page.waitForURL(new RegExp(URLS.APP_A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
      timeout: 15000,
    });

    const currentUrl = new URL(page.url());
    expect(currentUrl.searchParams.get("error")).toBe("access_denied");
    await expect(page.locator(".error")).toContainText("access_denied");
    await assertNotAuthenticated(page);
  });
});
