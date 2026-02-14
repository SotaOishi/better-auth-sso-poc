import { expect, test } from "@playwright/test";
import {
  approveConsent,
  assertAuthenticated,
  assertNotAuthenticated,
  fillIdpLoginForm,
} from "../helpers/auth.js";
import { TEST_USER, URLS } from "../helpers/constants.js";

test.describe("基本ログインフロー", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("未認証状態で App A にアクセスするとゲスト画面が表示される", async ({ page }) => {
    await page.goto(URLS.APP_A);
    await assertNotAuthenticated(page);
    await expect(page.locator("a.btn-primary")).toBeVisible();
  });

  test("App A でフル OAuth ログインフローが完了する", async ({ page }) => {
    // App A にアクセス（未認証）
    await page.goto(URLS.APP_A);
    await assertNotAuthenticated(page);

    // ログインリンクをクリック → IdP にリダイレクト
    await page.click("a.btn-primary");

    // IdP ログインページに到達
    await page.waitForURL(/auth\.localtest\.me.*\/login/);
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();

    // 認証情報を入力して送信
    await fillIdpLoginForm(page);

    const escapedAppA = URLS.APP_A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 同意ページまたはアプリへのリダイレクトを待つ（既に同意済みの場合スキップ）
    await page.waitForURL(new RegExp(`(auth\\.localtest\\.me.*\\/consent|${escapedAppA})`), {
      timeout: 15000,
    });

    if (page.url().includes("/consent")) {
      await expect(page.locator("h1")).toContainText("アクセス許可");
      await expect(page.locator("text=メールアドレスへのアクセス")).toBeVisible();
      await expect(page.locator("text=プロフィール情報")).toBeVisible();
      await approveConsent(page);
      await page.waitForURL(new RegExp(escapedAppA), { timeout: 15000 });
    }

    // App A で認証完了
    await assertAuthenticated(page);
    await expect(page.locator(`text=${TEST_USER.name}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
  });

  test("不正な認証情報でエラーが表示される", async ({ page }) => {
    await page.goto(URLS.APP_A);
    await page.click("a.btn-primary");

    // IdP ログインページに到達
    await page.waitForURL(/auth\.localtest\.me.*\/login/);

    // 不正な認証情報を入力
    await page.fill("input#email", "wrong@example.com");
    await page.fill("input#password", "wrongpassword");
    await page.click('button[type="submit"]');

    // エラーが表示されログインページに留まる
    await page.waitForURL(/auth\.localtest\.me.*\/login.*error=/);
    await expect(page.locator(".error")).toBeVisible();
  });
});
