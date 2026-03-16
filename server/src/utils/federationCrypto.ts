/**
 * FADP — 聯盟協防協議 加密工具
 * Ed25519 challenge-response 簽章驗證 + 金鑰工具
 */

import { createHash, randomBytes } from 'crypto';

/**
 * 產生 64 字元的 hex challenge（32 bytes）
 */
export function generateChallenge(): string {
  return randomBytes(32).toString('hex');
}

/**
 * 驗證 Ed25519 簽章
 * 注意：Node.js createVerify 支援 Ed25519 只在 v12+ 且使用 SubjectPublicKeyInfo (DER/SPKI) 格式
 * 外部節點簽章時使用: sign(challenge, privateKey) → signatureHex
 * 公鑰格式：hex 編碼的 DER SPKI（44 bytes for Ed25519）
 */
export function verifyEd25519(publicKeyHex: string, challenge: string, signatureHex: string): boolean {
  try {
    const { createVerify } = require('crypto');
    const pubKeyBuffer = Buffer.from(publicKeyHex, 'hex');
    const sigBuffer = Buffer.from(signatureHex, 'hex');

    const verify = createVerify('SHA256WithEd25519');
    verify.update(challenge);
    return verify.verify(
      { key: pubKeyBuffer, format: 'der', type: 'spki' },
      sigBuffer
    );
  } catch {
    return false;
  }
}

/**
 * 簡化版：驗證 HMAC-SHA256 簽章（用於沒有 Ed25519 的節點）
 * 外部節點計算：HMAC-SHA256(challenge, sharedSecret) → hex
 */
export function verifyHmacSha256(sharedSecret: string, challenge: string, signatureHex: string): boolean {
  try {
    const { createHmac } = require('crypto');
    const expected = createHmac('sha256', sharedSecret).update(challenge).digest('hex');
    return timingSafeEqual(expected, signatureHex);
  } catch {
    return false;
  }
}

/**
 * 時序安全的字串比較（防止時序攻擊）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  const { timingSafeEqual: cryptoTimingSafeEqual } = require('crypto');
  return cryptoTimingSafeEqual(bufA, bufB);
}

/**
 * SHA-256 hash API Key（用於資料庫儲存，不儲存明文）
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * 產生 FADP 聯盟 API Key（格式：fadp_<48 hex chars>）
 */
export function generateFederationApiKey(): string {
  return `fadp_${randomBytes(24).toString('hex')}`;
}

/**
 * 產生廣播事件的簽章
 * 用於防止其他節點偽造攻擊廣播
 */
export function signBroadcast(payload: string, signingKey: string): string {
  const { createHmac } = require('crypto');
  return createHmac('sha256', signingKey).update(payload).digest('hex');
}

/**
 * 驗證廣播事件簽章
 */
export function verifyBroadcastSignature(payload: string, signature: string, signingKey: string): boolean {
  const expected = signBroadcast(payload, signingKey);
  return timingSafeEqual(expected, signature);
}
