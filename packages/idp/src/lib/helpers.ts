import type { Context } from "hono";

export function buildAuthPageUrl(
  c: Context,
  path: string,
  extraParams: Record<string, string>,
): string {
  const url = new URL(c.req.url);
  const params = new URLSearchParams(url.searchParams);
  params.delete("error");
  params.delete("success");
  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function buildOauthAuthorizeUrl(c: Context): string | null {
  const url = new URL(c.req.url);
  const params = new URLSearchParams(url.searchParams);
  params.delete("error");
  params.delete("success");
  params.delete("redirect");
  if (params.size === 0) {
    return null;
  }
  return `/api/auth/oauth2/authorize?${params.toString()}`;
}
