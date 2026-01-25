import { escapeHtml } from "@better-auth-sso-poc/shared";
import type { Context } from "hono";
import { renderPage } from "./layout.js";

const styles = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 400px;
    margin: 80px auto;
    padding: 20px;
    background: #f5f5f5;
  }
  .card {
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  h1 {
    margin: 0 0 24px;
    font-size: 24px;
    font-weight: 600;
    text-align: center;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
    display: block;
  }
  input {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  input:focus {
    outline: none;
    border-color: #0070f3;
  }
  button {
    padding: 14px;
    font-size: 16px;
    font-weight: 500;
    background: #0070f3;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:hover {
    background: #005bb5;
  }
  .error {
    color: #dc2626;
    background: #fef2f2;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .footer {
    text-align: center;
    margin-top: 16px;
    font-size: 14px;
    color: #666;
  }
  .footer a {
    color: #0070f3;
    text-decoration: none;
  }
  .footer a:hover {
    text-decoration: underline;
  }
`;

interface LoginPageOptions {
  csrfToken: string;
}

export function renderLoginPage(c: Context, options: LoginPageOptions) {
  const url = new URL(c.req.url);
  const error = url.searchParams.get("error");
  const preservedParams = new URLSearchParams(url.searchParams);
  preservedParams.delete("error");
  const preservedQuery = preservedParams.toString();
  const formAction = preservedQuery ? `/login?${preservedQuery}` : "/login";
  const signupUrl = preservedQuery ? `/signup?${preservedQuery}` : "/signup";
  const csrfToken = options.csrfToken;

  return c.html(
    renderPage({
      title: "ログイン - IdP",
      styles,
      body: `
        <div class="card">
          <h1>ログイン</h1>
          ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
          <form method="POST" action="${escapeHtml(formAction)}">
            <input type="hidden" name="csrf_token" value="${escapeHtml(csrfToken)}" />
            <div>
              <label for="email">メールアドレス</label>
              <input type="email" id="email" name="email" placeholder="you@example.com" required />
            </div>
            <div>
              <label for="password">パスワード</label>
              <input type="password" id="password" name="password" placeholder="パスワードを入力" required />
            </div>
            <button type="submit">ログイン</button>
          </form>
          <div class="footer">
            アカウントをお持ちでない方は<a href="${escapeHtml(signupUrl)}">新規登録</a>
          </div>
        </div>
      `,
    }),
  );
}
