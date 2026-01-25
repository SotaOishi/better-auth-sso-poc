import { Hono } from "hono";
import type { IdpEnv } from "../types.js";

const healthRoutes = new Hono<IdpEnv>();

healthRoutes.get("/health", (c) => c.json({ status: "ok" }));

export { healthRoutes };
