import { Hono } from "hono";
import { renderHomePage } from "../pages/home.js";
import type { IdpEnv } from "../types.js";

const homeRoutes = new Hono<IdpEnv>();

homeRoutes.get("/", (c) => {
  const user = c.get("user");
  return c.html(renderHomePage(user));
});

export { homeRoutes };
