import { Hono } from "hono";
import { auth } from "../auth.js";

const logoutRoutes = new Hono();

logoutRoutes.get("/logout", async (c) => {
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

  // ホームへリダイレクト
  // 注意: PoCではアプリのセッションのみ削除し、IdPのセッションは残す
  // これにより他アプリ訪問時にSSOが継続する
  return c.redirect("/");
});

export { logoutRoutes };
