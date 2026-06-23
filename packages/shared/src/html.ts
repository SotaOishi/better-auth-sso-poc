/**
 * IdPページで共通利用する簡易なHTMLエスケープユーティリティ
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface HtmlDocumentOptions {
  title: string;
  styles?: string;
  body: string;
  lang?: string;
}

/**
 * 文字列テンプレートベースのページで共通利用する最小HTMLドキュメントレンダラー。
 *
 * `styles` と `body` はアプリ側で組み立て済みの信頼済みHTMLとして扱い、
 * 外部入力を含む値は呼び出し側で `escapeHtml()` してから渡す。
 */
export function renderHtmlDocument({
  title,
  styles,
  body,
  lang = "ja",
}: HtmlDocumentOptions): string {
  const styleBlock = styles ? `<style>${styles}</style>` : "";
  return `
    <!DOCTYPE html>
    <html lang="${escapeHtml(lang)}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
      ${styleBlock}
    </head>
    <body>
      ${body}
    </body>
    </html>
  `;
}
