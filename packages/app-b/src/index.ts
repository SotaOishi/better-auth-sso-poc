import "dotenv/config";
import fs from "node:fs";
import { createServer } from "node:https";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "./auth.js";
import { APP_NAME, config } from "./config.js";
import { activeOrganizationRoutes } from "./routes/active-organization.js";
import { homeRoutes } from "./routes/home.js";
import { loginRoutes } from "./routes/login.js";
import { logoutRoutes } from "./routes/logout.js";

const app = new Hono();

app.use("*", logger());

// ルート定義
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});
app.route("/", homeRoutes);
app.route("/", loginRoutes);
app.route("/", logoutRoutes);
app.route("/", activeOrganizationRoutes);

// サーバー起動
const useHttps = process.env.USE_HTTPS === "true";

if (useHttps) {
  const certsDir = path.join(process.cwd(), "..", "..", "certs");
  serve(
    {
      fetch: app.fetch,
      port: config.port,
      createServer,
      serverOptions: {
        key: fs.readFileSync(path.join(certsDir, "localtest.me-key.pem")),
        cert: fs.readFileSync(path.join(certsDir, "localtest.me-cert.pem")),
      },
    },
    (info) => {
      console.log(`${APP_NAME} is running on https://b.localtest.me:${info.port}`);
    },
  );
} else {
  serve(
    {
      fetch: app.fetch,
      port: config.port,
    },
    (info) => {
      console.log(`${APP_NAME} is running on http://localhost:${info.port}`);
    },
  );
}
