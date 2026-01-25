import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@better-auth-sso-poc/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { APP_NAME, config } from "../config.js";
import { renderHomePage } from "../pages/templates.js";

const homeRoutes = new Hono();

homeRoutes.get("/", (c) => {
  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
  const error = c.req.query("error");

  let user = null;
  if (sessionCookie) {
    const session = decodeSessionCookie(sessionCookie, config.sessionSecret);
    if (session) {
      user = session.user;
    }
  }

  return c.html(renderHomePage(APP_NAME, user, error));
});

export { homeRoutes };
