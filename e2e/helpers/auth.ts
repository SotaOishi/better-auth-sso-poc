import { expect, type Page } from "@playwright/test";
import { TEST_USER } from "./constants.js";

/**
 * IdP ログインフォームに認証情報を入力して送信する
 */
export async function fillIdpLoginForm(page: Page) {
  await expect(page.locator("h1")).toContainText("ログイン");
  await page.fill("input#email", TEST_USER.email);
  await page.fill("input#password", TEST_USER.password);
  await page.click('button[type="submit"]');
}

/**
 * 同意ページで「許可」ボタンをクリックする
 */
export async function approveConsent(page: Page) {
  await expect(page.locator("h1")).toContainText("アクセス許可");
  await page.click("button.allow");
}

/**
 * ユーザーが認証済み状態であることを検証する
 */
export async function assertAuthenticated(page: Page) {
  await expect(page.locator("h1")).toContainText("ログイン済み");
  await expect(page.locator(`text=${TEST_USER.email}`)).toBeVisible();
}

/**
 * ユーザーが未認証状態であることを検証する
 */
export async function assertNotAuthenticated(page: Page) {
  await expect(page.locator("h1")).toContainText("ようこそ");
  await expect(page.locator("p.guest-message")).toBeVisible();
}

/**
 * 初回フル OAuth ログインフロー（IdP ログイン + 同意）
 */
export async function loginViaOAuth(page: Page, appUrl: string) {
  await page.goto(appUrl);
  await assertNotAuthenticated(page);

  await page.click("a.btn-primary");

  const escapedUrl = appUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // IdP ログインページに到達
  await page.waitForURL(/auth\.localtest\.me.*\/login/);
  await fillIdpLoginForm(page);

  // 同意ページまたはアプリへのリダイレクトを待つ（既に同意済みの場合スキップ）
  await page.waitForURL(new RegExp(`(auth\\.localtest\\.me.*\\/consent|${escapedUrl})`), {
    timeout: 15000,
  });

  if (page.url().includes("/consent")) {
    await approveConsent(page);
    await page.waitForURL(new RegExp(escapedUrl), { timeout: 15000 });
  }

  await assertAuthenticated(page);
}

/**
 * SSO ログインフロー（IdP ログインスキップ、同意は条件分岐）
 */
export async function loginViaSSO(page: Page, appUrl: string) {
  await page.goto(appUrl);
  await assertNotAuthenticated(page);

  await page.click("a.btn-primary");

  // IdP セッションが存在するため、ログインフォームはスキップされる
  // 同意ページまたはアプリへの直接リダイレクトを待つ
  const escapedUrl = appUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.waitForURL(new RegExp(`(auth\\.localtest\\.me.*\\/consent|${escapedUrl})`), {
    timeout: 15000,
  });

  // 同意ページが表示された場合は許可する
  if (page.url().includes("/consent")) {
    await approveConsent(page);
    await page.waitForURL(new RegExp(escapedUrl), { timeout: 15000 });
  }

  await assertAuthenticated(page);
}
