import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { auth } from "../auth.js";
import { APP_NAME, oauthConfig } from "../config.js";
import { renderErrorPage } from "../pages/templates.js";

const loginRoutes = new Hono();

loginRoutes.get("/login", async (c) => {
  try {
    const response = await auth.api.signInWithOAuth2({
      headers: c.req.raw.headers,
      asResponse: true,
      body: {
        providerId: oauthConfig.providerId,
        callbackURL: "/",
        errorCallbackURL: "/",
      },
    });

    const cookies = response.headers.getSetCookie();
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status as ContentfulStatusCode;
      return c.html(renderErrorPage(APP_NAME, `認証開始に失敗しました: ${errorText}`), status);
    }

    const data = (await response.json()) as { url: string };
    return c.redirect(data.url);
  } catch (err) {
    console.error("OAuth sign-in error:", err);
    const message = err instanceof Error ? err.message : "認証開始に失敗しました";
    return c.html(renderErrorPage(APP_NAME, message), 500);
  }
});

export { loginRoutes };
