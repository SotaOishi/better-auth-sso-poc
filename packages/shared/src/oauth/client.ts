import { createRemoteJWKSet, jwtVerify } from "jose";
import type {
  IdTokenPayload,
  IdTokenValidationOptions,
  OAuthClientConfig,
  TokenResponse,
  UserInfo,
} from "./types.js";

// 毎回フェッチしないようJWKSをキャッシュ
type JWKSFunction = ReturnType<typeof createRemoteJWKSet>;
const jwksCache = new Map<string, JWKSFunction>();

/**
 * OAuthフローの認可URLを生成
 */
export function buildAuthorizationUrl(
  config: OAuthClientConfig,
  state: string,
  codeChallenge: string,
  nonce: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
  });

  return `${config.idpBaseUrl}/api/auth/oauth2/authorize?${params.toString()}`;
}

/**
 * 認可コードをトークンに交換
 */
export async function exchangeCodeForTokens(
  config: OAuthClientConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${config.idpBaseUrl}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/**
 * IdPからユーザー情報を取得
 */
export async function fetchUserInfo(
  config: OAuthClientConfig,
  accessToken: string,
): Promise<UserInfo> {
  const response = await fetch(`${config.idpBaseUrl}/api/auth/oauth2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UserInfo fetch failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<UserInfo>;
}

/**
 * 指定URIのJWKS関数を取得（なければキャッシュに作成）
 */
function getJWKS(jwksUri: string): JWKSFunction {
  let jwks = jwksCache.get(jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri));
    jwksCache.set(jwksUri, jwks);
  }
  return jwks;
}

/**
 * OIDCの検証を網羅したIDトークンの検証とデコード
 *
 * 検証内容:
 * - IdPのJWKSを使ったJWT署名
 * - iss(issuer)が期待するIdPか
 * - aud(audience)がclient_idと一致するか
 * - exp(有効期限)が未来であるか
 * - iat(発行時刻)が古すぎないか（maxTokenAgeでチェック）
 * - nonceが一致するか（リプレイ防止）
 */
export async function verifyAndDecodeIdToken(
  idToken: string,
  options: IdTokenValidationOptions,
): Promise<IdTokenPayload> {
  if (!options.nonce) {
    throw new Error("ID token nonce is required");
  }

  const clockTolerance = options.clockTolerance ?? 60;
  // デフォルトの最大トークン年齢: 1時間（IdPのaccessTokenExpiresInに合わせる）
  const maxTokenAge = options.maxTokenAge ?? 3600;

  // 署名検証用のJWKSを取得
  const jwks = getJWKS(options.jwksUri);

  // 署名を検証しペイロードをデコード
  // maxTokenAgeはiatが指定秒数より古くないことを検証
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: options.issuer,
    audience: options.audience,
    clockTolerance,
    maxTokenAge,
  });

  // nonceを検証（リプレイ防止に必須）
  if (payload.nonce !== options.nonce) {
    throw new Error("ID token nonce mismatch");
  }

  // 型をIdTokenPayloadにキャスト（必須クレームはjoseで検証済み）
  return payload as unknown as IdTokenPayload;
}

/**
 * リフレッシュトークンでアクセストークンを再発行
 */
export async function refreshAccessToken(
  config: OAuthClientConfig,
  refreshToken: string,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(`${config.idpBaseUrl}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}
