import { Hono } from "hono";
import { auth } from "../auth.js";
import type { IdpEnv } from "../types.js";

const oauthRoutes = new Hono<IdpEnv>();

// Better Authのハンドラー - OAuth2エンドポイントをまとめて処理
// 提供されるエンドポイント: /api/auth/oauth2/authorize, /api/auth/oauth2/token など
oauthRoutes.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export { oauthRoutes };
