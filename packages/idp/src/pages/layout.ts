import { renderHtmlDocument } from "@better-auth-sso-poc/shared";

interface LayoutOptions {
  title: string;
  styles?: string;
  body: string;
}

export function renderPage({ title, styles, body }: LayoutOptions): string {
  return renderHtmlDocument({ title, styles, body });
}
