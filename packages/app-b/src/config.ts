import type { OAuthClientConfig } from "@better-auth-sso-poc/shared";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const APP_NAME = "App B";

export const config = {
  port: parseInt(process.env.APP_B_PORT || "3002", 10),
  appUrl: process.env.APP_B_URL || "http://localhost:3002",
  sessionSecret: requireEnv("SESSION_SECRET"),
};

export const oauthConfig: OAuthClientConfig = {
  clientId: requireEnv("APP_B_CLIENT_ID"),
  clientSecret: requireEnv("APP_B_CLIENT_SECRET"),
  redirectUri: `${config.appUrl}/callback`,
  idpBaseUrl: process.env.IDP_URL || "http://localhost:3000",
  scopes: ["openid", "profile", "email", "offline_access"],
};
