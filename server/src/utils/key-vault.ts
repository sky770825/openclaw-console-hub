/**
 * API Key 保險箱 — 中央金鑰註冊表與脫敏函數
 *
 * 所有 API Key 從 process.env 收集一次，提供 sanitize() 函數
 * 將任何文字中的金鑰值替換為 [REDACTED:名稱]。
 *
 * 用途：
 * - logger.ts — 日誌脫敏
 * - telegram/action-handlers.ts — action 結果脫敏（防止 key 進入 NEUXA 對話 context）
 * - routes/proxy.ts — 回應脫敏
 */

import fs from 'fs';
import path from 'path';

// ─── 金鑰註冊表 ───

interface KeyEntry {
  name: string;   // 人類可讀名稱，如 "GOOGLE_API_KEY"
  value: string;  // 實際 key 值
}

const KEY_REGISTRY: KeyEntry[] = [];

/** 已知的敏感環境變數名稱 */
const SECRET_ENV_NAMES = [
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'MINIMAX_API_KEY',
  'OPENCLAW_API_KEY',
  'OPENCLAW_READ_KEY',
  'OPENCLAW_WRITE_KEY',
  'OPENCLAW_ADMIN_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CONTROL_BOT_TOKEN',
  'TELEGRAM_GROUP_BOT_TOKEN',
  'TELEGRAM_STOP_BOT_TOKEN',
  'TELEGRAM_XIAOCAI_BOT_TOKEN',
  'N8N_API_KEY',
  'FADP_ADMIN_TOKEN',
  'FADP_BROADCAST_SIGNING_KEY',
];

/** 從 process.env 和 openclaw.json 收集所有敏感值 */
function initRegistry(): void {
  KEY_REGISTRY.length = 0;

  // 1. 從 process.env 收集
  for (const name of SECRET_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value && value.length >= 8) {
      KEY_REGISTRY.push({ name, value });
    }
  }

  // 2. 從 openclaw.json 收集 provider API keys
  try {
    const ocPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json');
    if (fs.existsSync(ocPath)) {
      const data = JSON.parse(fs.readFileSync(ocPath, 'utf8'));
      const providers = data?.models?.providers;
      if (providers && typeof providers === 'object') {
        for (const [provName, provData] of Object.entries(providers)) {
          const apiKey = (provData as Record<string, unknown>)?.apiKey;
          if (typeof apiKey === 'string' && apiKey.trim().length >= 8) {
            KEY_REGISTRY.push({ name: `${provName.toUpperCase()}_API_KEY`, value: apiKey.trim() });
          }
        }
      }
    }
  } catch { /* openclaw.json 不存在或解析失敗，略過 */ }

  // 按 value 長度降序排（長 key 優先替換，避免短 key 匹配到長 key 的子字串）
  KEY_REGISTRY.sort((a, b) => b.value.length - a.value.length);
}

// 啟動時初始化
initRegistry();

// ─── 脫敏函數 ───

/**
 * 將文字中的所有已知 API Key、Bearer token、URL key param 替換為 [REDACTED]。
 * 安全地用在任何字串上 — 沒有 key 就原樣返回。
 */
export function sanitize(text: string): string {
  if (!text) return text;
  let result = text;

  // 1. 替換所有已知 key 的精確值
  for (const entry of KEY_REGISTRY) {
    if (result.includes(entry.value)) {
      // 用 split + join 避免特殊字元問題
      result = result.split(entry.value).join(`[REDACTED:${entry.name}]`);
    }
  }

  // 2. URL query param: ?key=... 或 &key=...
  result = result.replace(/([?&]key=)[^\s&"']+/gi, '$1[REDACTED]');

  // 3. Authorization: Bearer xxx
  result = result.replace(/(Bearer\s+)\S{20,}/gi, '$1[REDACTED]');

  // 4. 常見 API key 格式（即使不在註冊表裡也要擋）
  result = result.replace(/\bAIza[A-Za-z0-9_-]{30,}\b/g, '[REDACTED:GOOGLE_KEY]');
  result = result.replace(/\bsk-[A-Za-z0-9]{20,}\b/g, '[REDACTED:OPENAI_KEY]');
  result = result.replace(/\bxai-[A-Za-z0-9]{20,}\b/g, '[REDACTED:XAI_KEY]');

  // 5. x-api-key header value
  result = result.replace(/(x-api-key:\s*)\S{20,}/gi, '$1[REDACTED]');

  return result;
}

/**
 * 取得指定環境變數的 key 值。只能在 server 內部使用。
 * 這是唯一合法取得 API key 的方式。
 */
export function getKey(envName: string): string {
  const entry = KEY_REGISTRY.find(e => e.name === envName);
  return entry?.value || process.env[envName]?.trim() || '';
}

/** 檢查某個 key 是否有設定 */
export function hasKey(envName: string): boolean {
  return getKey(envName).length > 0;
}

/** 重新載入金鑰註冊表（.env 或 openclaw.json 變更後呼叫） */
export function reloadKeys(): void {
  initRegistry();
}
