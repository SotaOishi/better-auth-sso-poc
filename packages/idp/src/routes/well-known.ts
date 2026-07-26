import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { Hono } from "hono";
import { auth } from "../auth.js";

export const wellKnownRoutes = new Hono();

// OpenID Connectのディスカバリ
// GET /.well-known/openid-configuration を返す
wellKnownRoutes.get("/openid-configuration", async (c) => {
  const handler = oauthProviderOpenIdConfigMetadata(auth);
  return handler(c.req.raw);
});

const authServerMetadataHandler = oauthProviderAuthServerMetadata(auth);

// OAuth 2.1 Authorization Server Metadata（RFC 8414）
// issuer path（/api/auth）を含む正規URLと従来のルートURLの両方を提供する。
wellKnownRoutes.get("/oauth-authorization-server/api/auth", (c) =>
  authServerMetadataHandler(c.req.raw),
);
wellKnownRoutes.get("/oauth-authorization-server", (c) => authServerMetadataHandler(c.req.raw));
