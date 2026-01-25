import {
  decodePKCECookie,
  encodeSessionCookie,
  exchangeCodeForTokens,
  PKCE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  type SessionData,
  sessionCookieOptions,
  verifyAndDecodeIdToken,
} from "@better-auth-sso-poc/shared";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { APP_NAME, config, oauthConfig } from "../config.js";
import { renderErrorPage } from "../pages/templates.js";

const callbackRoutes = new Hono();

callbackRoutes.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  // OAuthのエラー応答を処理
  if (error) {
    const message = errorDescription || error;
    return c.html(renderErrorPage(APP_NAME, `認証エラー: ${message}`), 400);
  }

  // 必須パラメータを検証
  if (!code || !state) {
    return c.html(renderErrorPage(APP_NAME, "認証コードまたはstateパラメータがありません"), 400);
  }

  // PKCE用Cookieを取得して検証
  const pkceCookie = getCookie(c, PKCE_COOKIE_NAME);
  if (!pkceCookie) {
    return c.html(
      renderErrorPage(APP_NAME, "認証セッションが見つかりません。もう一度ログインしてください。"),
      400,
    );
  }

  const pkceState = decodePKCECookie(pkceCookie, config.sessionSecret);
  if (!pkceState) {
    return c.html(
      renderErrorPage(APP_NAME, "認証セッションが無効です。もう一度ログインしてください。"),
      400,
    );
  }

  // stateを検証（CSRF防止）
  if (state !== pkceState.state) {
    return c.html(
      renderErrorPage(APP_NAME, "CSRF検証に失敗しました。もう一度ログインしてください。"),
      400,
    );
  }

  // nonceの存在を検証（リプレイ攻撃防止に必須）
  if (!pkceState.nonce) {
    return c.html(
      renderErrorPage(
        APP_NAME,
        "認証セッションにnonceがありません。もう一度ログインしてください。",
      ),
      400,
    );
  }

  try {
    // 認可コードをトークンに交換
    const tokens = await exchangeCodeForTokens(oauthConfig, code, pkceState.codeVerifier);

    // IDトークンを検証・デコード
    if (!tokens.id_token) {
      return c.html(renderErrorPage(APP_NAME, "IDトークンが取得できませんでした"), 500);
    }

    // IDトークンを検証: 署名/iss/aud/exp/iat(maxTokenAge)/nonce
    // 補足: Better Authのoauth-providerではissuerが{baseUrl}/api/authになる
    const idTokenPayload = await verifyAndDecodeIdToken(tokens.id_token, {
      issuer: `${oauthConfig.idpBaseUrl}/api/auth`,
      audience: oauthConfig.clientId,
      jwksUri: `${oauthConfig.idpBaseUrl}/api/auth/jwks`,
      nonce: pkceState.nonce,
    });

    // セッションデータを生成
    const sessionData: SessionData = {
      user: {
        sub: idTokenPayload.sub,
        name: idTokenPayload.name,
        email: idTokenPayload.email,
        email_verified: idTokenPayload.email_verified,
      },
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + sessionCookieOptions.maxAge * 1000,
    };

    // セッションCookieを設定
    const sessionCookie = encodeSessionCookie(sessionData, config.sessionSecret);
    setCookie(c, SESSION_COOKIE_NAME, sessionCookie, sessionCookieOptions);

    // PKCE Cookieを削除
    deleteCookie(c, PKCE_COOKIE_NAME);

    // ホームへリダイレクト
    return c.redirect("/");
  } catch (err) {
    console.error("Token exchange error:", err);
    const message = err instanceof Error ? err.message : "トークン交換に失敗しました";
    return c.html(renderErrorPage(APP_NAME, message), 500);
  }
});

export { callbackRoutes };
