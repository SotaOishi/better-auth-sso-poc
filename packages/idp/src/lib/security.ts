import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const CSRF_COOKIE_NAME = "idp_csrf";
const isSecure = process.env.USE_HTTPS === "true" || process.env.NODE_ENV === "production";

const csrfCookieOptions = {
  httpOnly: true,
  secure: isSecure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10, // 10分
};

export function issueCsrfToken(c: Context): string {
  const token = randomBytes(32).toString("hex");
  setCookie(c, CSRF_COOKIE_NAME, token, csrfCookieOptions);
  return token;
}

export function validateCsrfToken(c: Context, tokenFromBody: string | null): boolean {
  const cookieToken = getCookie(c, CSRF_COOKIE_NAME);
  if (!tokenFromBody || !cookieToken) return false;

  try {
    return timingSafeEqual(Buffer.from(tokenFromBody), Buffer.from(cookieToken));
  } catch {
    return false;
  }
}
