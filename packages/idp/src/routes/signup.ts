import { Hono } from "hono";
import { auth } from "../auth.js";
import { buildAuthPageUrl, buildOauthAuthorizeUrl } from "../lib/helpers.js";
import { redirectSafely } from "../lib/redirect.js";
import { issueCsrfToken, validateCsrfToken } from "../lib/security.js";
import { renderSignupPage } from "../pages/signup.js";
import type { IdpEnv } from "../types.js";

const signupRoutes = new Hono<IdpEnv>();

// サインアップページ
signupRoutes.get("/signup", (c) => {
  const csrfToken = issueCsrfToken(c);
  return renderSignupPage(c, { csrfToken });
});

// サインアップ処理
signupRoutes.post("/signup", async (c) => {
  const formData = await c.req.formData();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const csrfToken = (formData.get("csrf_token") as string | null) ?? null;
  const redirectUrl = c.req.query("redirect");
  const oauthAuthorizeUrl = buildOauthAuthorizeUrl(c);

  if (!validateCsrfToken(c, csrfToken)) {
    const signupUrl = buildAuthPageUrl(c, "/signup", {
      error: "CSRF検証に失敗しました。もう一度お試しください。",
    });
    return c.redirect(signupUrl, 303);
  }

  try {
    const response = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { message?: string }).message || "Registration failed";
      const signupUrl = buildAuthPageUrl(c, "/signup", { error: errorMessage });
      return c.redirect(signupUrl);
    }

    // 認証レスポンスのCookieを転送して自動サインイン
    const cookies = response.headers.getSetCookie();
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }

    // OAuthフローまたはログインページへリダイレクト
    if (redirectUrl) {
      return redirectSafely(c, redirectUrl);
    }
    if (oauthAuthorizeUrl) {
      return c.redirect(oauthAuthorizeUrl);
    }
    return c.redirect("/");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Registration failed";
    const signupUrl = buildAuthPageUrl(c, "/signup", { error: errorMessage });
    return c.redirect(signupUrl);
  }
});

export { signupRoutes };
