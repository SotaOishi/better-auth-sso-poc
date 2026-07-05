import { expect, type Page, test } from "@playwright/test";
import { URLS } from "../helpers/constants.js";

// seed-organizations で投入した複数所属ユーザー
const ALICE = { email: "alice@example.com", password: "password1234" } as const;

async function approveConsentIfPresent(page: Page, appUrlPattern: RegExp) {
  await page.waitForURL(new RegExp(`(auth\\.localtest\\.me.*\\/consent|${appUrlPattern.source})`), {
    timeout: 15000,
  });
  if (page.url().includes("/consent")) {
    await page.click("button.allow");
    await page.waitForURL(appUrlPattern, { timeout: 15000 });
  }
}

async function loginAppAFull(page: Page) {
  await page.goto(URLS.APP_A);
  await page.click("a.btn-primary");
  await page.waitForURL(/auth\.localtest\.me.*\/login/);
  await page.fill("input#email", ALICE.email);
  await page.fill("input#password", ALICE.password);
  await page.click('button[type="submit"]');
  await approveConsentIfPresent(page, /a\.localtest\.me/);
}

async function loginAppBviaSSO(page: Page) {
  await page.goto(URLS.APP_B);
  await page.click("a.btn-primary");
  // IdP セッション継続によりログインフォームはスキップされる
  await approveConsentIfPresent(page, /b\.localtest\.me/);
}

function orgItem(page: Page, name: string) {
  return page.locator(".org-item", { hasText: name });
}

test.describe("組織claim伝搬とローカルactive選択", () => {
  test("両Appで所属一覧が表示され、active組織をApp単位で独立に選択できる", async ({ browser }) => {
    // App A と App B は別セッション（別Cookie）として独立に扱うため別コンテキスト
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // --- App A: フルログイン（タスク6.1: 所属一覧の表示） ---
    await loginAppAFull(pageA);
    await expect(pageA.locator("h1")).toContainText("ログイン済み");

    // 3組織がロール付きで表示される
    await expect(orgItem(pageA, "Acme")).toContainText("owner");
    await expect(orgItem(pageA, "Globex")).toContainText("admin");
    await expect(orgItem(pageA, "Initech")).toContainText("member");

    // 初期状態ではactive未選択（"これにする"ボタンが出る）
    await expect(orgItem(pageA, "Globex").locator("button.org-switch")).toBeVisible();

    // App A で Globex を active に選択
    await orgItem(pageA, "Globex").locator("button.org-switch").click();
    await pageA.waitForURL(/a\.localtest\.me/);
    await expect(pageA.locator(".org-item.org-active")).toContainText("Globex");

    // --- App B: SSOログイン ---
    await loginAppBviaSSO(pageB);
    await expect(pageB.locator("h1")).toContainText("ログイン済み");

    // App B でも同じ3組織が見える
    await expect(orgItem(pageB, "Acme")).toContainText("owner");
    await expect(orgItem(pageB, "Globex")).toContainText("admin");
    await expect(orgItem(pageB, "Initech")).toContainText("member");

    // App B は別セッションなので active 未選択
    await expect(pageB.locator(".org-item.org-active")).toHaveCount(0);

    // App B で Initech を active に選択
    await orgItem(pageB, "Initech").locator("button.org-switch").click();
    await pageB.waitForURL(/b\.localtest\.me/);
    await expect(pageB.locator(".org-item.org-active")).toContainText("Initech");

    // --- 独立性の検証（タスク5.4/6.2） ---
    // App A をリロードしても active は Globex のまま（App B の選択に影響されない）
    await pageA.goto(URLS.APP_A);
    await expect(pageA.locator(".org-item.org-active")).toContainText("Globex");

    // App B は Initech のまま
    await pageB.goto(URLS.APP_B);
    await expect(pageB.locator(".org-item.org-active")).toContainText("Initech");

    await context.close();
  });

  test("スナップショット外の組織IDは拒否される（タスク5.3）", async ({ page }) => {
    await loginAppAFull(page);
    await expect(page.locator("h1")).toContainText("ログイン済み");

    // alice が所属しない組織IDを直接POST
    const response = await page.request.post(`${URLS.APP_A}/active-organization`, {
      form: { organizationId: "non-existent-org-id" },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    // リダイレクトでエラーを返す（active は更新されない）
    expect([302, 303]).toContain(response.status());
    const location = response.headers().location ?? "";
    expect(location).toContain("error=");
  });
});
