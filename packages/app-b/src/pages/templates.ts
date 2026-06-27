type OrganizationMembership = {
  id: string;
  slug: string;
  name: string;
  role: string;
};

type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  organizations?: OrganizationMembership[];
  activeOrganizationId?: string;
};

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
  .app-badge {
    display: inline-block;
    background: #10b981;
    color: white;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  h1 {
    margin: 0 0 24px;
    font-size: 24px;
    font-weight: 600;
  }
  .user-info {
    background: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  .user-info p {
    margin: 8px 0;
    font-size: 14px;
    color: #374151;
  }
  .user-info strong {
    color: #111827;
  }
  .btn {
    display: inline-block;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    border-radius: 8px;
    transition: background 0.2s;
  }
  .btn-primary {
    background: #10b981;
    color: white;
  }
  .btn-primary:hover {
    background: #059669;
  }
  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    margin-left: 8px;
  }
  .btn-secondary:hover {
    background: #e5e7eb;
  }
  .guest-message {
    color: #6b7280;
    margin-bottom: 20px;
  }
  .error {
    color: #dc2626;
    background: #fef2f2;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
  }
  .sso-hint {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    font-size: 13px;
    color: #6b7280;
  }
  .orgs {
    margin-bottom: 20px;
  }
  .orgs-title {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 8px;
  }
  .orgs-empty {
    font-size: 14px;
    color: #9ca3af;
  }
  .org-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 8px;
  }
  .org-item.org-active {
    border-color: #10b981;
    background: #ecfdf5;
  }
  .org-label {
    font-size: 14px;
    color: #111827;
  }
  .org-role {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background: #f3f4f6;
    color: #374151;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .org-current {
    font-size: 12px;
    font-weight: 600;
    color: #10b981;
  }
  .org-form {
    display: inline;
    margin: 0;
  }
  .org-switch {
    background: none;
    border: none;
    color: #10b981;
    font-size: 13px;
    cursor: pointer;
    padding: 0;
  }
  .org-switch:hover {
    text-decoration: underline;
  }
`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderOrganizations(
  organizations: OrganizationMembership[],
  activeOrganizationId?: string,
): string {
  if (organizations.length === 0) {
    return `<div class="orgs"><p class="orgs-title">所属組織</p><p class="orgs-empty">所属組織はありません</p></div>`;
  }

  const items = organizations
    .map((org) => {
      const isActive = org.id === activeOrganizationId;
      const action = isActive
        ? `<span class="org-current">現在</span>`
        : `<form method="post" action="/active-organization" class="org-form">
            <input type="hidden" name="organizationId" value="${escapeHtml(org.id)}">
            <button type="submit" class="org-switch">これにする</button>
          </form>`;
      return `
        <div class="org-item${isActive ? " org-active" : ""}">
          <span class="org-label">
            ${escapeHtml(org.name)}
            <span class="org-role">${escapeHtml(org.role)}</span>
          </span>
          ${action}
        </div>
      `;
    })
    .join("");

  return `
    <div class="orgs">
      <p class="orgs-title">所属組織</p>
      ${items}
    </div>
  `;
}

export function renderHomePage(appName: string, user: AuthUser | null, error?: string): string {
  const userSection = user
    ? `
      <div class="user-info">
        <p><strong>ユーザーID:</strong> ${escapeHtml(user.id)}</p>
        ${user.name ? `<p><strong>名前:</strong> ${escapeHtml(user.name)}</p>` : ""}
        ${user.email ? `<p><strong>メール:</strong> ${escapeHtml(user.email)}</p>` : ""}
      </div>
      ${renderOrganizations(user.organizations ?? [], user.activeOrganizationId)}
      <a href="/logout" class="btn btn-secondary">ログアウト</a>
    `
    : `
      <p class="guest-message">ログインしていません</p>
      <a href="/login" class="btn btn-primary">ログイン</a>
    `;

  const ssoHint = user
    ? ""
    : `
      <div class="sso-hint">
        SSO テスト: 他のアプリでログイン済みの場合、IdPのログイン画面をスキップして自動的にログインできます。
      </div>
    `;

  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(appName)}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="card">
        <span class="app-badge">${escapeHtml(appName)}</span>
        <h1>${user ? "ログイン済み" : "ようこそ"}</h1>
        ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
        ${userSection}
        ${ssoHint}
      </div>
    </body>
    </html>
  `;
}

export function renderErrorPage(appName: string, error: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>エラー - ${escapeHtml(appName)}</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="card">
        <span class="app-badge">${escapeHtml(appName)}</span>
        <h1>エラー</h1>
        <div class="error">${escapeHtml(error)}</div>
        <a href="/" class="btn btn-primary">ホームに戻る</a>
      </div>
    </body>
    </html>
  `;
}
