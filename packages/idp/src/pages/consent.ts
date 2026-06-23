import { escapeHtml } from "@better-auth-sso-poc/shared";
import type { Context } from "hono";
import { renderPage } from "./layout.js";

const styles = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 500px;
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
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 600;
  }
  .client-name {
    font-weight: 600;
    color: #0070f3;
  }
  .scopes {
    background: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    margin: 20px 0;
  }
  .scopes h3 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
  .scopes ul {
    margin: 0;
    padding-left: 20px;
  }
  .scopes li {
    padding: 4px 0;
    color: #555;
  }
  .buttons {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }
  button {
    flex: 1;
    padding: 14px;
    font-size: 16px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .allow {
    background: #0070f3;
    color: white;
  }
  .allow:hover {
    background: #005bb5;
  }
  .deny {
    background: #e5e7eb;
    color: #374151;
  }
  .deny:hover {
    background: #d1d5db;
  }
`;

const scopeDescriptions: Record<string, string> = {
  openid: "ユーザーIDへのアクセス",
  profile: "プロフィール情報（名前、画像）へのアクセス",
  email: "メールアドレスへのアクセス",
  offline_access: "ログイン状態の維持",
};

interface ConsentPageOptions {
  csrfToken: string;
}

export function renderConsentPage(c: Context, options: ConsentPageOptions) {
  const clientId = c.req.query("client_id") || "Unknown App";
  const scope = c.req.query("scope") || "";
  const scopes = scope.split(" ").filter(Boolean);
  const redirectUri = c.req.query("redirect_uri") || "";
  const state = c.req.query("state") || "";

  // 同意APIに渡すためのクエリ文字列全体を取得
  const url = new URL(c.req.url);
  const oauthQuery = url.search.slice(1); // 先頭の'?'を除去
  const csrfToken = options.csrfToken;

  return c.html(
    renderPage({
      title: "アクセス許可 - IdP",
      styles,
      body: `
        <div class="card">
          <h1>アクセス許可</h1>
          <p><span class="client-name">${escapeHtml(clientId)}</span> があなたのアカウントへのアクセスを求めています。</p>

          <div class="scopes">
            <h3>リクエストされた権限:</h3>
            <ul>
              ${scopes.map((s) => `<li>${escapeHtml(scopeDescriptions[s] || s)}</li>`).join("")}
            </ul>
          </div>

          <form method="POST" action="/consent">
            <input type="hidden" name="accept" value="true" />
            <input type="hidden" name="csrf_token" value="${escapeHtml(csrfToken)}" />
            <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
            <input type="hidden" name="oauth_query" value="${escapeHtml(oauthQuery)}" />
            <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
            <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
            <input type="hidden" name="state" value="${escapeHtml(state)}" />
            <div class="buttons">
              <button type="button" class="deny" onclick="window.history.back()">拒否</button>
              <button type="submit" class="allow">許可</button>
            </div>
          </form>
        </div>
      `,
    }),
  );
}
