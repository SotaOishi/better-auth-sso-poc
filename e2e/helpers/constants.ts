export const URLS = {
  IDP: "https://auth.localtest.me:3000",
  APP_A: "https://a.localtest.me:3001",
  APP_B: "https://b.localtest.me:3002",
} as const;

export const TEST_USER = {
  name: "E2E Test User",
  email: "e2e-test@example.com",
  password: "testpassword123",
} as const;
