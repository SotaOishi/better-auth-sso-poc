import { Hono } from "hono";
import { auth } from "../auth.js";
import { buildAuthPageUrl, buildOauthAuthorizeUrl } from "../lib/helpers.js";
import { issueCsrfToken, validateCsrfToken } from "../lib/security.js";
import { renderLoginPage } from "../pages/login.js";
import type { IdpEnv } from "../types.js";

const loginRoutes = new Hono<IdpEnv>();

// ログインページ
loginRoutes.get("/login", (c) => {
  const csrfToken = issueCsrfToken(c);
  return renderLoginPage(c, { csrfToken });
});

// ログイン処理
loginRoutes.post("/login", async (c) => {
  const formData = await c.req.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const csrfToken = (formData.get("csrf_token") as string | null) ?? null;
  const redirectUrl = c.req.query("redirect");
  const oauthAuthorizeUrl = buildOauthAuthorizeUrl(c);

  if (!validateCsrfToken(c, csrfToken)) {
    const loginUrl = buildAuthPageUrl(c, "/login", {
      error: "CSRF検証に失敗しました。もう一度お試しください。",
    });
    return c.redirect(loginUrl, 303);
  }

  try {
    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { message?: string }).message || "Invalid credentials";
      const loginUrl = buildAuthPageUrl(c, "/login", { error: errorMessage });
      return c.redirect(loginUrl);
    }

    // 認証レスポンスのCookieを転送
    const cookies = response.headers.getSetCookie();
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }

    // OAuthフローまたはホームへリダイレクト
    if (redirectUrl) {
      return c.redirect(redirectUrl);
    }
    if (oauthAuthorizeUrl) {
      return c.redirect(oauthAuthorizeUrl);
    }
    return c.redirect("/");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Authentication failed";
    const loginUrl = buildAuthPageUrl(c, "/login", { error: errorMessage });
    return c.redirect(loginUrl);
  }
});

export { loginRoutes };
