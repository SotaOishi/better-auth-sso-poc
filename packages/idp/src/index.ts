import "dotenv/config";
import fs from "node:fs";
import { createServer } from "node:https";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { idpConfig } from "./config.js";
import { consentRoutes } from "./routes/consent.js";
import { healthRoutes } from "./routes/health.js";
import { homeRoutes } from "./routes/home.js";
import { loginRoutes } from "./routes/login.js";
import { logoutRoutes } from "./routes/logout.js";
import { oauthRoutes } from "./routes/oauth.js";
import { signupRoutes } from "./routes/signup.js";
import { wellKnownRoutes } from "./routes/well-known.js";
import type { IdpEnv } from "./types.js";

const app = new Hono<IdpEnv>();

app.use("*", logger());

app.use(
  "/api/auth/*",
  cors({
    origin: idpConfig.corsOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  }),
);

// セッション用ミドルウェア - コンテキストにユーザー/セッションを詰める
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

// well-known系エンドポイント（ルートにマウント）
app.route("/.well-known", wellKnownRoutes);

// ページルート
app.route("/", homeRoutes);
app.route("/", loginRoutes);
app.route("/", signupRoutes);
app.route("/", consentRoutes);
app.route("/", logoutRoutes);
app.route("/", healthRoutes);
app.route("/", oauthRoutes);

// サーバー起動
const { port, useHttps } = idpConfig;

if (useHttps) {
  const certsDir = path.join(process.cwd(), "..", "..", "certs");
  serve({
    fetch: app.fetch,
    port,
    createServer,
    serverOptions: {
      key: fs.readFileSync(path.join(certsDir, "localtest.me-key.pem")),
      cert: fs.readFileSync(path.join(certsDir, "localtest.me-cert.pem")),
    },
  });
  console.log(`IdP Server starting on ${idpConfig.baseUrl.replace(/\/$/, "")}`);
} else {
  serve({ fetch: app.fetch, port });
  console.log(`IdP Server starting on ${idpConfig.baseUrl.replace(/\/$/, "")}`);
}
