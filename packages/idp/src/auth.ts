import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { db } from "./db";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}
if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL is not set");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  disabledPaths: ["/token"],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // セッションの有効期限(7日)
    updateAge: 60 * 60 * 24, // 24時間ごとにセッション更新
    storeSessionInDatabase: true,
  },
  plugins: [
    jwt({
      disableSettingJwtHeader: true,
    }),
    oauthProvider({
      loginPage: "/login",
      consentPage: "/consent",
      accessTokenExpiresIn: 60 * 60, // アクセストークンの期限（1時間）
      refreshTokenExpiresIn: 60 * 60 * 24 * 30, // リフレッシュトークンの期限（30日）
      codeExpiresIn: 60 * 10, // 認可コードの期限（10分）
      scopes: ["openid", "profile", "email", "offline_access"],
    }),
  ],
});

export type Auth = typeof auth;
