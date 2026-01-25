import { Hono } from "hono";
import { auth } from "../auth.js";
import { APP_NAME } from "../config.js";
import { renderHomePage } from "../pages/templates.js";

const homeRoutes = new Hono();

homeRoutes.get("/", async (c) => {
  const error = c.req.query("error");

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name ?? undefined,
        email: session.user.email ?? undefined,
      }
    : null;

  return c.html(renderHomePage(APP_NAME, user, error));
});

export { homeRoutes };
