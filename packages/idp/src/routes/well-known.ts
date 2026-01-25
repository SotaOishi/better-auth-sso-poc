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

// OAuth 2.1 Authorization Server Metadata（RFC 8414）
// GET /.well-known/oauth-authorization-server を返す
wellKnownRoutes.get("/oauth-authorization-server", async (c) => {
  const handler = oauthProviderAuthServerMetadata(auth);
  return handler(c.req.raw);
});
