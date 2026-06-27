import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { APP_NAME, config, oauthConfig } from "./config.js";

export type OrganizationMembership = {
  id: string;
  slug: string;
  name: string;
  role: string;
};

type IdpUserInfo = {
  id: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  image?: string;
  // OIDC userinfo の organizations claim（ログイン時スナップショット）
  organizations: OrganizationMembership[];
};

async function fetchIdpUserInfo(accessToken: string): Promise<IdpUserInfo | null> {
  const response = await fetch(`${oauthConfig.idpBaseUrl}/api/auth/oauth2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    organizations?: OrganizationMembership[];
    [key: string]: unknown;
  };

  if (!data.sub) {
    return null;
  }

  return {
    id: data.sub,
    email: data.email,
    emailVerified: data.email_verified ?? false,
    name: data.name ?? data.email ?? undefined,
    image: data.picture,
    organizations: Array.isArray(data.organizations) ? data.organizations : [],
  };
}

export const auth = betterAuth({
  appName: APP_NAME,
  secret: config.sessionSecret,
  baseURL: config.appUrl,
  basePath: "/api/auth",
  user: {
    additionalFields: {
      // 所属組織一覧のスナップショット（JSON文字列で保持）
      organizations: { type: "string", required: false, input: true },
      // App単位のローカルなactive組織選択
      activeOrganizationId: { type: "string", required: false, input: true },
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: oauthConfig.providerId,
          discoveryUrl: new URL(
            "/.well-known/openid-configuration",
            oauthConfig.idpBaseUrl,
          ).toString(),
          clientId: oauthConfig.clientId,
          clientSecret: oauthConfig.clientSecret,
          scopes: oauthConfig.scopes,
          pkce: true,
          // 毎ログイン時にuserinfo（organizations含む）でユーザーを更新する
          overrideUserInfo: true,
          getUserInfo: async (tokens) => {
            if (!tokens.accessToken) {
              return null;
            }

            return fetchIdpUserInfo(tokens.accessToken);
          },
          // getUserInfo の戻り値がそのまま profile として渡る。
          // organizations を additionalFields へ格納する（activeOrganizationId は
          // ローカル選択なのでここでは触らず保持する）。
          mapProfileToUser: (profile) => {
            const organizations = Array.isArray(profile.organizations) ? profile.organizations : [];
            // additionalFields は base User 型に含まれない。Partial<User>(weak type)へ
            // 代入するため既知フィールド name? を型に含めて共通プロパティを確保する。
            const mapped: {
              name?: string;
              organizations?: string;
              activeOrganizationId?: string;
            } = {
              organizations: JSON.stringify(organizations),
            };
            return mapped;
          },
        },
      ],
    }),
  ],
});
