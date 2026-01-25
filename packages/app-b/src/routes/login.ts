import {
  buildAuthorizationUrl,
  encodePKCECookie,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  PKCE_COOKIE_NAME,
  pkceCookieOptions,
} from "@better-auth-sso-poc/shared";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { config, oauthConfig } from "../config.js";

const loginRoutes = new Hono();

loginRoutes.get("/login", (c) => {
  // PKCE用パラメータとnonceを生成
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const nonce = generateNonce();

  // state・code_verifier・nonceを一時Cookieに保存
  const pkceCookie = encodePKCECookie({ state, codeVerifier, nonce }, config.sessionSecret);
  setCookie(c, PKCE_COOKIE_NAME, pkceCookie, pkceCookieOptions);

  // 認可URLを作成してリダイレクト
  const authUrl = buildAuthorizationUrl(oauthConfig, state, codeChallenge, nonce);

  return c.redirect(authUrl);
});

export { loginRoutes };
