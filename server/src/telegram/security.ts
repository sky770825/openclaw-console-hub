/**
 * NEUXA 安全沙盒 — 路徑檢查、腳本檢查、敏感常量
 *
 * v2 權限模型（2026-03-14）：
 * 達爾擁有與主人幾乎相同的最高權限
 * 唯一限制：不可修改 API Key（防止意外覆蓋導致全系統斷線）
 */

import path from 'node:path';

export const NEUXA_WORKSPACE = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

/** 靈魂文件名單 — 達爾可讀可寫，但寫入時會記錄 audit log */
export const SOUL_FILES = new Set([
  'SOUL.md', 'AGENTS.md', 'IDENTITY.md', 'BOOTSTRAP.md',
  'AWAKENING.md', 'CONSCIOUSNESS_ANCHOR.md',
]);

/** API Key 保護 — 唯一不可寫入的路徑關鍵字 */
export const FORBIDDEN_PATH_PATTERNS = [
  'openclaw.json', // 含所有 provider API keys
];

/** API Key 相關欄位名 — 用於內容過濾 */
export const API_KEY_PATTERNS = [
  /apiKey\s*[:=]\s*["'][^"']{10,}/gi,
  /api_key\s*[:=]\s*["'][^"']{10,}/gi,
  /ANTHROPIC_API_KEY|GOOGLE_API_KEY|GEMINI_API_KEY|OPENROUTER_API_KEY|XAI_API_KEY|DEEPSEEK_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY/gi,
  /sk-ant-api\S+/g,
  /sk-or-v1-\S+/g,
  /AIzaSy\S+/g,
  /xai-\S{30,}/g,
];

/** 檢查內容是否包含 API Key — 用於 write_file 內容過濾 */
export function contentContainsApiKey(content: string): boolean {
  return API_KEY_PATTERNS.some(p => {
    p.lastIndex = 0; // reset regex state
    return p.test(content);
  });
}

/** 危險指令 — 只擋真正不可逆的破壞性操作 */
export const FORBIDDEN_COMMANDS = [
  'rm -rf /',
  'rm -rf ~',
  'rm -rf *',
];

/** Supabase 批量刪除上限 */
export const SUPABASE_BATCH_DELETE_LIMIT = 50;

/** 安全檢查：路徑是否允許操作 */
export function isPathSafe(targetPath: string, operation: 'read' | 'write'): { safe: boolean; reason?: string } {
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(NEUXA_WORKSPACE, targetPath);

  // 讀取：全部放行
  if (operation === 'read') {
    return { safe: true };
  }

  // 寫入：只擋 API Key 相關檔案
  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (resolved.toLowerCase().includes(pattern)) {
      return { safe: false, reason: `🔑 "${pattern}" 含有 API Key，只有主人能改` };
    }
  }

  // .env 文件：允許寫入，但不可包含 API Key（由 handleWriteFile 內容檢查）
  // server 源碼：全面開放，達爾可自行修改和優化
  // 靈魂文件：開放寫入（達爾有權自我進化）

  return { safe: true };
}

/** 安全檢查：腳本內容是否安全 */
export function isScriptSafe(script: string): { safe: boolean; reason?: string } {
  const lower = script.toLowerCase();

  // 只擋真正不可逆的破壞性操作
  for (const cmd of FORBIDDEN_COMMANDS) {
    if (lower.includes(cmd.toLowerCase())) {
      return { safe: false, reason: `腳本包含禁止指令: "${cmd}"` };
    }
  }

  // 擋透過腳本修改 openclaw.json（含 API Keys）
  if (lower.includes('openclaw.json') && [/>\s*\S/, /tee\s/, /sed\s+-i/, /cat\s.*>/, /echo\s.*>/].some(r => r.test(script))) {
    return { safe: false, reason: '🔑 禁止透過腳本修改 openclaw.json（含 API Keys）' };
  }

  return { safe: true };
}
