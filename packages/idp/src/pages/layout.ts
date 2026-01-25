import { escapeHtml } from "@better-auth-sso-poc/shared";

interface LayoutOptions {
  title: string;
  styles?: string;
  body: string;
}

export function renderPage({ title, styles, body }: LayoutOptions): string {
  const styleBlock = styles ? `<style>${styles}</style>` : "";
  return `
    <!DOCTYPE html>
    <html lang="ja">
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
