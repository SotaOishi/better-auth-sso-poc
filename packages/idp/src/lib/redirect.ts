import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { idpConfig } from "../config.js";
import { db } from "../db/index.js";
import { oauthClient } from "../db/schema.js";

function isSafeRelativePath(candidate: string): boolean {
  return candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\");
}

function allowedRedirectOrigins(): Set<string> {
  return new Set(idpConfig.redirectAllowedOrigins.map((origin) => new URL(origin).origin));
}

/**
 * Returns a sanitized redirect target for user-controlled `redirect` params.
 *
 * Relative paths are preferred. Absolute URLs are allowed only when their origin
 * is explicitly configured.
 */
export function safeRedirectUrl(
  _c: Context,
  candidate: string | null | undefined,
  fallback = "/",
): string {
  if (!candidate) {
    return fallback;
  }

  if (isSafeRelativePath(candidate)) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallback;
    }
    if (!allowedRedirectOrigins().has(url.origin)) {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

export function redirectSafely(
  c: Context,
  candidate: string | null | undefined,
  fallback = "/",
  status: 301 | 302 | 303 | 307 | 308 = 302,
): Response {
  return c.redirect(safeRedirectUrl(c, candidate, fallback), status);
}

/**
 * OAuth redirect_uri values must be verified against the registered client.
 * Hidden form fields and query params are not trusted by themselves.
 */
export async function resolveRegisteredOAuthRedirectUri(
  clientId: string | null | undefined,
  redirectUri: string | null | undefined,
): Promise<string | null> {
  if (!clientId || !redirectUri) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const [client] = await db
    .select({
      disabled: oauthClient.disabled,
      redirectUris: oauthClient.redirectUris,
    })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .limit(1);

  if (!client || client.disabled) {
    return null;
  }

  return client.redirectUris.includes(parsed.toString()) ? parsed.toString() : null;
}

export async function buildOAuthErrorRedirectUrl({
  clientId,
  redirectUri,
  state,
  error,
  errorDescription,
}: {
  clientId: string | null | undefined;
  redirectUri: string | null | undefined;
  state: string | null | undefined;
  error: string;
  errorDescription: string;
}): Promise<string | null> {
  const registeredRedirectUri = await resolveRegisteredOAuthRedirectUri(clientId, redirectUri);
  if (!registeredRedirectUri) {
    return null;
  }

  const errorUrl = new URL(registeredRedirectUri);
  errorUrl.searchParams.set("error", error);
  errorUrl.searchParams.set("error_description", errorDescription);
  if (state) {
    errorUrl.searchParams.set("state", state);
  }
  return errorUrl.toString();
}
