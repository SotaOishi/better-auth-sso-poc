import { escapeHtml } from "@better-auth-sso-poc/shared";
import { renderPage } from "./layout.js";

interface HomeUser {
  name?: string | null;
  email: string;
}

export function renderHomePage(user: HomeUser | null) {
  if (user) {
    return renderPage({
      title: "IdP - ホーム",
      styles: `
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 20px; }
        .card { background: #f9fafb; padding: 24px; border-radius: 12px; }
        h1 { margin: 0 0 16px; }
        .email { color: #666; margin-bottom: 24px; }
        a { color: #0070f3; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `,
      body: `
        <div class="card">
          <h1>ようこそ、${escapeHtml(user.name || "ユーザー")}さん</h1>
          <p class="email">${escapeHtml(user.email)}</p>
          <p><a href="/logout">ログアウト</a></p>
        </div>
      `,
    });
  }

  return renderPage({
    title: "IdP サーバー",
    styles: `
      body { font-family: system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 20px; text-align: center; }
      h1 { margin-bottom: 24px; }
      a { color: #0070f3; text-decoration: none; margin: 0 8px; }
      a:hover { text-decoration: underline; }
    `,
    body: `
      <h1>IdP サーバー</h1>
      <p>
        <a href="/login">ログイン</a>
        <a href="/signup">新規登録</a>
      </p>
    `,
  });
}
