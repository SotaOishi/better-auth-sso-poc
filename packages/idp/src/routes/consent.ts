import { Hono } from "hono";
import { auth } from "../auth.js";
import { issueCsrfToken, validateCsrfToken } from "../lib/security.js";
import { renderConsentPage } from "../pages/consent.js";
import type { IdpEnv } from "../types.js";

const consentRoutes = new Hono<IdpEnv>();

consentRoutes.get("/consent", (c) => {
  const csrfToken = issueCsrfToken(c);
  return renderConsentPage(c, { csrfToken });
});

consentRoutes.post("/consent", async (c) => {
  const formData = await c.req.formData();
  const accept = formData.get("accept") === "true";
  const scope = formData.get("scope") as string;
  const oauthQuery = formData.get("oauth_query") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const state = formData.get("state") as string;
  const csrfToken = (formData.get("csrf_token") as string | null) ?? null;

  if (!validateCsrfToken(c, csrfToken)) {
    if (redirectUri) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set("error", "access_denied");
      errorUrl.searchParams.set("error_description", "CSRF validation failed");
      if (state) errorUrl.searchParams.set("state", state);
      return c.redirect(errorUrl.toString());
    }
    return c.text("Invalid CSRF token", 400);
  }

  if (!accept) {
    // ユーザーが拒否した場合はエラー付きでクライアントへリダイレクト
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "access_denied");
    errorUrl.searchParams.set("error_description", "User denied the request");
    if (state) errorUrl.searchParams.set("state", state);
    return c.redirect(errorUrl.toString());
  }

  // 同意内容をJSONでBetter Auth APIへ転送
  const consentResponse = await auth.api.oauth2Consent({
    body: {
      accept: true,
      scope,
      oauth_query: oauthQuery,
    },
    headers: c.req.raw.headers,
    asResponse: true,
  });

  if (!consentResponse.ok) {
    // 同意APIが失敗したら元のパラメータでauthorizeへ戻す
    const authorizeUrl = `/api/auth/oauth2/authorize?${oauthQuery}`;
    return c.redirect(authorizeUrl);
  }

  // 同意APIのレスポンスに含まれるCookieを転送
  const cookies = consentResponse.headers.getSetCookie();
  for (const cookie of cookies) {
    c.header("Set-Cookie", cookie, { append: true });
  }

  // レスポンスからリダイレクト先URLを取得
  const responseData = (await consentResponse.json().catch(() => ({}))) as { redirectUri?: string };
  if (responseData.redirectUri) {
    return c.redirect(responseData.redirectUri);
  }

  // フォールバック: 元のパラメータでauthorizeへリダイレクト
  return c.redirect(`/api/auth/oauth2/authorize?${oauthQuery}`);
});

export { consentRoutes };
