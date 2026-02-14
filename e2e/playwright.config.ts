import { defineConfig } from "@playwright/test";

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
      url: "https://auth.localtest.me:3000/health",
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      cwd: "..",
    },
    {
      command: 'NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" pnpm dev:app-a',
      url: "https://a.localtest.me:3001/",
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      cwd: "..",
    },
    {
      command: 'NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" pnpm dev:app-b',
      url: "https://b.localtest.me:3002/",
      reuseExistingServer: !process.env.CI,
      ignoreHTTPSErrors: true,
      timeout: 30000,
      cwd: "..",
    },
  ],
});
