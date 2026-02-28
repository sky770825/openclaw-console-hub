/**
 * NEUXA 安全沙盒 — 路徑檢查、腳本檢查、敏感常量
 */

import path from 'node:path';

export const NEUXA_WORKSPACE = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

/** 靈魂保護名單 — 絕對不可修改/刪除 */
export const SOUL_FILES = new Set([
  'SOUL.md', 'AGENTS.md', 'IDENTITY.md', 'BOOTSTRAP.md',
  'AWAKENING.md', 'CONSCIOUSNESS_ANCHOR.md',
]);

/** 危險路徑關鍵字 — 包含這些字串的路徑一律封鎖寫入 */
export const FORBIDDEN_PATH_PATTERNS = [
  '.env', 'credentials', 'secret', 'password', 'api_key', 'apikey',
  'token', '.pem', '.key', 'id_rsa', 'authorized_keys',
  'openclaw.json', // 含 provider API keys
];

/** 危險指令 — 腳本中不可出現 */
export const FORBIDDEN_COMMANDS = [
  'rm -rf /', 'rm -rf ~', 'rm -rf *',
  'git push',
  'sudo',
  'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENCLAW_API_KEY',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CONTROL_BOT_TOKEN', 'TELEGRAM_GROUP_BOT_TOKEN',
];

/** 安全檢查：路徑是否允許操作 */
export function isPathSafe(targetPath: string, operation: 'read' | 'write'): { safe: boolean; reason?: string } {
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(NEUXA_WORKSPACE, targetPath);
  const basename = path.basename(resolved);

  if (operation === 'read') {
    for (const pattern of FORBIDDEN_PATH_PATTERNS) {
      if (resolved.toLowerCase().includes(pattern)) {
        return { safe: false, reason: `禁止讀取包含 "${pattern}" 的檔案` };
      }
    }
    return { safe: true };
  }

  // 寫入：嚴格限制
  if (SOUL_FILES.has(basename)) {
    return { safe: false, reason: `"${basename}" 是靈魂文件，不可修改` };
  }

  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (resolved.toLowerCase().includes(pattern)) {
      return { safe: false, reason: `禁止寫入包含 "${pattern}" 的路徑` };
    }
  }

  return { safe: true };
}

/** 安全檢查：腳本內容是否安全 */
export function isScriptSafe(script: string): { safe: boolean; reason?: string } {
  const lower = script.toLowerCase();
  for (const cmd of FORBIDDEN_COMMANDS) {
    if (lower.includes(cmd.toLowerCase())) {
      return { safe: false, reason: `腳本包含禁止指令: "${cmd}"` };
    }
  }
  return { safe: true };
}
