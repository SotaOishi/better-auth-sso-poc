export const URLS = {
  IDP: process.env.E2E_IDP_URL ?? process.env.IDP_URL ?? "https://auth.localtest.me:3000",
  APP_A: process.env.E2E_APP_A_URL ?? process.env.APP_A_URL ?? "https://a.localtest.me:3001",
  APP_B: process.env.E2E_APP_B_URL ?? process.env.APP_B_URL ?? "https://b.localtest.me:3002",
} as const;

export const TEST_USER = {
  name: "E2E Test User",
  email: "e2e-test@example.com",
  password: "testpassword123",
} as const;
