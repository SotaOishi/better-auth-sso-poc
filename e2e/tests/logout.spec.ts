import { expect, test } from "@playwright/test";
import {
  approveConsent,
  assertAuthenticated,
  assertNotAuthenticated,
  fillIdpLoginForm,
  loginViaOAuth,
  loginViaSSO,
} from "../helpers/auth.js";
import { URLS } from "../helpers/constants.js";

test.describe("ログアウト", () => {
  test("App A からログアウトしても App B のセッションは維持される", async ({ page, context }) => {
    await context.clearCookies();

    // App A でフルログイン
    await loginViaOAuth(page, URLS.APP_A);

    // App B で SSO ログイン
    await loginViaSSO(page, URLS.APP_B);

    // 両方のアプリで認証済みであることを確認
    await page.goto(URLS.APP_A);
    await assertAuthenticated(page);
    await page.goto(URLS.APP_B);
    await assertAuthenticated(page);

    // App A からログアウト
    await page.goto(URLS.APP_A);
    await page.click("a.btn-secondary");
    await page.waitForURL(new RegExp(URLS.APP_A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await assertNotAuthenticated(page);

    // App B は引き続き認証済み
    await page.goto(URLS.APP_B);
    await assertAuthenticated(page);

    // App A で再ログイン → IdP ログインフォームはスキップされる
    await page.goto(URLS.APP_A);
    await page.click("a.btn-primary");

    const escapedAppA = URLS.APP_A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.waitForURL(new RegExp(`(auth\\.localtest\\.me.*\\/consent|${escapedAppA})`), {
      timeout: 15000,
    });

    if (page.url().includes("/consent")) {
      await approveConsent(page);
      await page.waitForURL(new RegExp(escapedAppA), { timeout: 15000 });
    }

    await assertAuthenticated(page);
  });

  test("IdP からログアウト後、再ログイン時に認証情報の入力が必要になる", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // App A でフルログイン
    await loginViaOAuth(page, URLS.APP_A);

    // IdP からログアウト（IdP セッション破棄）
    await page.goto(`${URLS.IDP}/logout`);
    await page.waitForURL(new RegExp(URLS.IDP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    // App A のセッションはまだ有効（アプリセッションは独立）
    await page.goto(URLS.APP_A);
    await assertAuthenticated(page);

    // App A からログアウト
    await page.click("a.btn-secondary");
    await page.waitForURL(new RegExp(URLS.APP_A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await assertNotAuthenticated(page);

    // App A で再ログイン → IdP セッションが破棄されているためログインフォームが表示される
    await page.click("a.btn-primary");
    await page.waitForURL(/auth\.localtest\.me.*\/login/);
    await expect(page.locator("h1")).toContainText("ログイン");

    // 認証情報を入力してログイン
    await fillIdpLoginForm(page);

    // 同意ページが表示される場合は許可
    const escapedAppA = URLS.APP_A.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.waitForURL(new RegExp(`(auth\\.localtest\\.me.*\\/consent|${escapedAppA})`), {
      timeout: 15000,
    });

    if (page.url().includes("/consent")) {
      await approveConsent(page);
      await page.waitForURL(new RegExp(escapedAppA), { timeout: 15000 });
    }

    await assertAuthenticated(page);
  });
});
