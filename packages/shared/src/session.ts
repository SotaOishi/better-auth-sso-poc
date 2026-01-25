import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { PKCEState, SessionData } from "./oauth/types.js";

const SESSION_COOKIE_NAME = "app_session";
const PKCE_COOKIE_NAME = "oauth_pkce";
const SESSION_COOKIE_VERSION = "v1";
const IV_LENGTH = 12; // AES-GCM推奨のIVサイズ

// セキュアコンテキスト（HTTPS）かどうか判定
const isSecure = process.env.USE_HTTPS === "true" || process.env.NODE_ENV === "production";

/**
 * セッションCookieのオプション
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: isSecure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7日（秒）
};

/**
 * PKCE一時Cookieのオプション（短期）
 */
export const pkceCookieOptions = {
  httpOnly: true,
  secure: isSecure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10, // 10分
};

/**
 * HMAC-SHA256で署名
 */
function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/**
 * 署名を検証
 */
function verifySignature(data: string, signature: string, secret: string): boolean {
  const expected = sign(data, secret);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * シークレットからAES-256-GCM用の共通鍵を導出
 */
function deriveEncryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest(); // 32バイト
}

/**
 * 平文をAES-256-GCMで暗号化しbase64urlのペイロードを返す
 * 構造: iv(12バイト) | authTag(16バイト) | ciphertext
 */
function encrypt(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = deriveEncryptionKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

/**
 * AES-256-GCMのbase64urlペイロードを復号して平文に戻す
 */
function decrypt(payload: string, secret: string): string | null {
  try {
    const buffer = Buffer.from(payload, "base64url");
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = buffer.subarray(IV_LENGTH + 16);

    if (iv.length !== IV_LENGTH || authTag.length !== 16 || ciphertext.length === 0) {
      return null;
    }

    const key = deriveEncryptionKey(secret);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * セッションデータを暗号化しバージョン付きでCookie値にエンコード
 */
export function encodeSessionCookie(session: SessionData, secret: string): string {
  const encryptedPayload = encrypt(JSON.stringify(session), secret);
  return `${SESSION_COOKIE_VERSION}.${encryptedPayload}`;
}

/**
 * セッションCookieを復号・検証
 */
export function decodeSessionCookie(cookie: string, secret: string): SessionData | null {
  try {
    const [version, payload] = cookie.split(".");
    if (version !== SESSION_COOKIE_VERSION || !payload) return null;

    const decrypted = decrypt(payload, secret);
    if (!decrypted) return null;

    const session = JSON.parse(decrypted) as SessionData;

    // 有効期限を確認
    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * PKCE Stateを署名付きでCookie値にエンコード
 */
export function encodePKCECookie(pkce: PKCEState, secret: string): string {
  const data = Buffer.from(JSON.stringify(pkce)).toString("base64url");
  const signature = sign(data, secret);
  return `${data}.${signature}`;
}

/**
 * PKCE Cookieを復号・検証
 */
export function decodePKCECookie(cookie: string, secret: string): PKCEState | null {
  try {
    const [data, signature] = cookie.split(".");
    if (!data || !signature) return null;

    if (!verifySignature(data, signature, secret)) {
      return null;
    }

    const decoded = Buffer.from(data, "base64url").toString("utf-8");
    return JSON.parse(decoded) as PKCEState;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, PKCE_COOKIE_NAME };
