import { SESSION_COOKIE_NAME } from "@better-auth-sso-poc/shared";
import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";

const logoutRoutes = new Hono();

logoutRoutes.get("/logout", (c) => {
  // セッションCookieを削除
  deleteCookie(c, SESSION_COOKIE_NAME);

  // ホームへリダイレクト
  // 注意: PoCではアプリのセッションのみ削除し、IdPのセッションは残す
  // これにより他アプリ訪問時にSSOが継続する
  return c.redirect("/");
});

export { logoutRoutes };
