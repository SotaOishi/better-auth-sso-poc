import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { APP_NAME, config, oauthConfig } from "./config.js";

async function fetchIdpUserInfo(accessToken: string) {
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
  };
}

export const auth = betterAuth({
  appName: APP_NAME,
  secret: config.sessionSecret,
  baseURL: config.appUrl,
  basePath: "/api/auth",
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
          getUserInfo: async (tokens) => {
            if (!tokens.accessToken) {
              return null;
            }

            return fetchIdpUserInfo(tokens.accessToken);
          },
        },
      ],
    }),
  ],
});
