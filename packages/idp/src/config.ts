function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid port value: ${value}`);
  }
  return port;
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function originOf(url: string): string {
  return new URL(url).origin;
}

function parseList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const useHttps = process.env.USE_HTTPS === "true";
const port = parsePort(process.env.PORT ?? process.env.IDP_PORT, 3000);
const defaultProtocol = useHttps ? "https" : "http";
const defaultIdpHost = useHttps ? "auth.localtest.me" : "localhost";
const defaultAppAHost = useHttps ? "a.localtest.me" : "localhost";
const defaultAppBHost = useHttps ? "b.localtest.me" : "localhost";

const idpUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.IDP_URL ??
  `${defaultProtocol}://${defaultIdpHost}:${port}`;
const appAUrl =
  process.env.APP_A_URL ?? `${defaultProtocol}://${defaultAppAHost}:${process.env.APP_A_PORT ?? 3001}`;
const appBUrl =
  process.env.APP_B_URL ?? `${defaultProtocol}://${defaultAppBHost}:${process.env.APP_B_PORT ?? 3002}`;

const configuredCorsOrigins = parseList(process.env.IDP_CORS_ORIGINS);

export const idpConfig = {
  port,
  useHttps,
  baseUrl: ensureTrailingSlash(idpUrl),
  appUrls: {
    appA: ensureTrailingSlash(appAUrl),
    appB: ensureTrailingSlash(appBUrl),
  },
  corsOrigins:
    configuredCorsOrigins.length > 0 ? configuredCorsOrigins : [originOf(appAUrl), originOf(appBUrl)],
  oauthRedirectUris: {
    appA: new URL("/api/auth/oauth2/callback/idp", ensureTrailingSlash(appAUrl)).toString(),
    appB: new URL("/api/auth/oauth2/callback/idp", ensureTrailingSlash(appBUrl)).toString(),
  },
};
