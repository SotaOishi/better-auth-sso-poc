import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { jwt, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { member, organization as organizationTable } from "./db/schema";

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
    // teamsは有効化しない（teams / teamMember / organizationRole は導入しない）
    organization(),
    oauthProvider({
      loginPage: "/login",
      consentPage: "/consent",
      accessTokenExpiresIn: 60 * 60, // アクセストークンの期限（1時間）
      refreshTokenExpiresIn: 60 * 60 * 24 * 30, // リフレッシュトークンの期限（30日）
      codeExpiresIn: 60 * 10, // 認可コードの期限（10分）
      scopes: ["openid", "profile", "email", "offline_access", "organizations"],
      // organizationsスコープが付与されたときのみ、userinfoに所属組織一覧を含める。
      // activeOrganizationIdには依存せず、user.idから直接メンバーシップを解決する。
      customUserInfoClaims: async ({ user, scopes }) => {
        if (!scopes.includes("organizations")) {
          return {};
        }
        const organizations = await db
          .select({
            id: organizationTable.id,
            slug: organizationTable.slug,
            name: organizationTable.name,
            role: member.role,
          })
          .from(member)
          .innerJoin(organizationTable, eq(member.organizationId, organizationTable.id))
          .where(eq(member.userId, user.id));
        return { organizations };
      },
    }),
  ],
});

export type Auth = typeof auth;
