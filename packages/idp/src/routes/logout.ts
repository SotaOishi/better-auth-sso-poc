import { Hono } from "hono";
import { auth } from "../auth.js";
import { redirectSafely } from "../lib/redirect.js";
import type { IdpEnv } from "../types.js";

const logoutRoutes = new Hono<IdpEnv>();

// ログアウト（IdPセッションを破棄）
logoutRoutes.get("/logout", async (c) => {
  const redirectUrl = c.req.query("redirect");

  try {
    const response = await auth.api.signOut({
      headers: c.req.raw.headers,
      asResponse: true,
    });

    const cookies = response.headers.getSetCookie();
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
  } catch {
    // サインアウトのエラーは無視してリダイレクトを続行
  }

  if (redirectUrl) {
    return redirectSafely(c, redirectUrl);
  }
  return c.redirect("/");
});

export { logoutRoutes };
