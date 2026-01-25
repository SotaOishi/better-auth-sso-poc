import { createHash, randomBytes } from "node:crypto";

/**
 * Base64urlエンコード（RFC 7636）
 */
function base64urlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 暗号学的に安全なcode_verifierを生成（43〜128文字）
 * RFC 7636: code_verifier = 43*128unreserved
 */
export function generateCodeVerifier(): string {
  // 32バイト => base64url（パディングなし）で43文字
  return base64urlEncode(randomBytes(32));
}

/**
 * S256方式でcode_verifierからcode_challengeを生成
 * RFC 7636: code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash("sha256").update(codeVerifier).digest();
  return base64urlEncode(hash);
}

/**
 * CSRF対策用の暗号学的に安全なstateを生成
 */
export function generateState(): string {
  return base64urlEncode(randomBytes(24));
}

/**
 * リプレイ攻撃防止のための暗号学的に安全なnonceを生成
 * OIDC Core 1.0: nonceはクライアントセッションとID Tokenを紐付ける
 */
export function generateNonce(): string {
  return base64urlEncode(randomBytes(24));
}
