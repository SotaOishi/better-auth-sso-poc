import { expect, test } from "@playwright/test";
import {
  approveConsent,
  assertAuthenticated,
  assertNotAuthenticated,
  loginViaOAuth,
} from "../helpers/auth.js";
import { URLS } from "../helpers/constants.js";

test.describe("SSO クロスアプリフロー", () => {
  test("App A ログイン後、App B で認証情報の再入力なしに SSO ログインできる", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // App A でフルログイン（IdP ログイン + 同意）
    await loginViaOAuth(page, URLS.APP_A);

    // App B にアクセス（未認証状態）
    await page.goto(URLS.APP_B);
    await assertNotAuthenticated(page);

    // App B でログインリンクをクリック
    await page.click("a.btn-primary");

    // IdP ログインフォームが表示されないことを確認
    // 同意ページまたはアプリへの直接リダイレクトを待つ
    await page.waitForURL(/(auth\.localtest\.me.*\/consent|b\.localtest\.me:\d+\/)/, {
      timeout: 15000,
    });

    // 同意ページが表示された場合（App B に対する初回同意）
    if (page.url().includes("/consent")) {
      await expect(page.locator("h1")).toContainText("アクセス許可");
      // ログインフォームではなく同意画面であることを確認
      await expect(page.locator("input#email")).not.toBeVisible();
      await approveConsent(page);
      await page.waitForURL(new RegExp(URLS.APP_B.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
        timeout: 15000,
      });
    }

    // App B で認証完了
    await assertAuthenticated(page);

    // App A も引き続き認証済み
    await page.goto(URLS.APP_A);
    await assertAuthenticated(page);
  });
});
