/**
 * OAuthクライアント設定
 */
export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  idpBaseUrl: string;
  scopes: string[];
}

/**
 * OAuth 2.0 トークンレスポンス（RFC 6749）
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

/**
 * OIDCのUserInfoレスポンス
 */
export interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

/**
 * Cookieに保存するセッションデータ
 */
export interface SessionData {
  user: UserInfo;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

/**
 * 認証フロー中に一時Cookieへ保存するPKCE state
 */
export interface PKCEState {
  state: string;
  codeVerifier: string;
  nonce: string;
}

/**
 * IDトークンのペイロード（必要最小限のOIDCクレーム）
 */
export interface IdTokenPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

/**
 * IDトークン検証のオプション
 */
export interface IdTokenValidationOptions {
  /** 期待するissuer（IdPのURL） */
  issuer: string;
  /** 期待するaudience（client_id） */
  audience: string;
  /** 署名検証に使うJWKSエンドポイントURL */
  jwksUri: string;
  /** 期待するnonce値（リプレイ防止に必須） */
  nonce: string;
  /** exp/iat検証のためのクロック許容秒数（デフォルト: 60） */
  clockTolerance?: number;
  /** 許容する最大トークン年齢（秒）。iatがこれより古い場合は拒否（デフォルト: 3600=1時間） */
  maxTokenAge?: number;
}
