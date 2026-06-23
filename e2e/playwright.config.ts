import { defineConfig } from "@playwright/test";

const IDP_URL = process.env.E2E_IDP_URL ?? process.env.IDP_URL ?? "https://auth.localtest.me:3000";
const APP_A_URL = process.env.E2E_APP_A_URL ?? process.env.APP_A_URL ?? "https://a.localtest.me:3001";
const APP_B_URL = process.env.E2E_APP_B_URL ?? process.env.APP_B_URL ?? "https://b.localtest.me:3002";
const trimTrailingSlash = (url: string) => url.replace(/\/$/, "");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",

  use: {
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  globalSetup: "./helpers/setup.ts",

  webServer: [
    {
      command: 'NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" pnpm dev:idp',
      url: `${trimTrailingSlash(IDP_URL)}/health`,
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      cwd: "..",
    },
    {
      command: 'NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" pnpm dev:app-a',
      url: trimTrailingSlash(APP_A_URL),
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      cwd: "..",
    },
    {
      command: 'NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" pnpm dev:app-b',
      url: trimTrailingSlash(APP_B_URL),
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      cwd: "..",
    },
  ],
});
