/**
 * Google API Key 輪替 — 避免單一 key 配額耗盡
 * 多檔共用（action-handlers.ts, site-generator.ts, xiaocai-think.ts）
 */

const GOOGLE_KEYS: string[] = [
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
  process.env.GEMINI_API_KEY,
].map(k => k?.trim() ?? '').filter(Boolean);

let googleKeyIndex = 0;

export function getGoogleKey(): string {
  if (GOOGLE_KEYS.length === 0) return process.env.GOOGLE_API_KEY?.trim() ?? '';
  const key = GOOGLE_KEYS[googleKeyIndex % GOOGLE_KEYS.length];
  googleKeyIndex++;
  return key;
}

export function hasGoogleKey(): boolean {
  return GOOGLE_KEYS.length > 0 || !!process.env.GOOGLE_API_KEY;
}
