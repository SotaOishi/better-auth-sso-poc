import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium, type FullConfig, type Page } from "@playwright/test";
import { TEST_USER, URLS } from "./constants.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function isUserAlreadyExistsError(errorMessage: string | null): boolean {
  if (!errorMessage) {
    return false;
  }

  const normalized = errorMessage.toLowerCase();
  return /already exists|already registered|user already|duplicate|登録済み|既に存在|すでに存在/.test(
    normalized,
  );
}

async function ensureTestUser(page: Page) {
  await page.goto(`${URLS.IDP}/signup`);
  await page.fill("input#name", TEST_USER.name);
  await page.fill("input#email", TEST_USER.email);
  await page.fill("input#password", TEST_USER.password);
  await page.click('button[type="submit"]');

  // 新規作成時はホームへ、既存ユーザー時はエラー付きで /signup に戻る
  await page.waitForURL(
    (url) => url.origin === URLS.IDP && (url.pathname === "/" || url.pathname === "/signup"),
    { timeout: 10000 },
  );

  const currentUrl = new URL(page.url());
  if (currentUrl.pathname === "/signup") {
    const errorMessage = currentUrl.searchParams.get("error");
    if (!isUserAlreadyExistsError(errorMessage)) {
      throw new Error(`Failed to prepare E2E user: ${errorMessage ?? "Unknown signup error"}`);
    }
  }
}

async function seedOrganizationTestData() {
  try {
    await execFileAsync("pnpm", ["seed:orgs"], {
      cwd: repoRoot,
      env: process.env,
      timeout: 60_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to prepare E2E organization seed data: ${message}`);
  }
}

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    await seedOrganizationTestData();
    await ensureTestUser(page);

    // IdP からログアウトしてクリーン状態にする
    await page.goto(`${URLS.IDP}/logout`);
    await page.waitForURL(`${URLS.IDP}/**`, { timeout: 5000 });
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
