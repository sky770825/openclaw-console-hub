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

/** 危險路徑關鍵字 — 包含這些字串的路徑封鎖寫入 */
export const FORBIDDEN_PATH_PATTERNS = [
  '.env', 'credentials', 'secret', 'password', 'api_key', 'apikey',
  '.token', '.pem', '.key', 'id_rsa', 'authorized_keys',
  'openclaw.json', // 含 provider API keys
];

/** 危險指令 — 腳本中不可出現（只擋真正破壞性操作，不擋變數名引用） */
export const FORBIDDEN_COMMANDS = [
  'rm -rf /', 'rm -rf ~', 'rm -rf *',
  'git push',
  'sudo',
];

/** 安全檢查：路徑是否允許操作 */
export function isPathSafe(targetPath: string, operation: 'read' | 'write'): { safe: boolean; reason?: string } {
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(NEUXA_WORKSPACE, targetPath);
  const basename = path.basename(resolved);

  if (operation === 'read') {
    // 讀取只擋靈魂文件的刪除（不擋讀），其他全放行
    // 小蔡需要讀取 .env / config 來排查問題，寫入才是真正的風險
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

  // 禁止寫入 server 源碼目錄 — 但放行 crew-bots/ 子目錄（小蔡可自行優化星群）
  if ((resolved.includes('/server/src/') || resolved.includes('/server/dist/'))
    && !resolved.includes('/server/src/telegram/crew-bots/')) {
    return { safe: false, reason: '🛑 禁止寫入 server 源碼目錄，只有老蔡能改（crew-bots/ 除外）' };
  }

  return { safe: true };
}

/** 核心文件保護 — run_script 禁止寫入這些路徑 */
const PROTECTED_FILE_PATTERNS = [
  'executor-agents', 'xiaocai-think', 'bot-polling', 'governanceEngine',
  'openclawSupabase', 'security.ts', 'action-handlers',
  'SOUL.md', 'AGENTS.md', 'IDENTITY.md', 'AWAKENING.md',
  '.env', 'openclaw.json', 'sessions.json', 'config.json',
  'package.json', 'package-lock.json',
];

/** 腳本寫入偵測 — 檢查腳本是否企圖寫入受保護檔案 */
const WRITE_INDICATORS = [
  />\s*\S/, /tee\s/, /cp\s.*server\/src/, /mv\s.*server\/src/,
  /sed\s+-i/, /cat\s.*>/, /echo\s.*>/, /printf\s.*>/,
  /npm\s+install/, /npm\s+uninstall/, /npm\s+update/,
];

/** 安全檢查：腳本內容是否安全 */
export function isScriptSafe(script: string): { safe: boolean; reason?: string } {
  const lower = script.toLowerCase();
  for (const cmd of FORBIDDEN_COMMANDS) {
    if (lower.includes(cmd.toLowerCase())) {
      return { safe: false, reason: `腳本包含禁止指令: "${cmd}"` };
    }
  }

  // 檢查是否企圖寫入受保護的核心文件
  const hasWriteOp = WRITE_INDICATORS.some(r => r.test(script));
  if (hasWriteOp) {
    for (const pf of PROTECTED_FILE_PATTERNS) {
      if (lower.includes(pf.toLowerCase())) {
        return { safe: false, reason: `🛑 禁止透過腳本修改核心文件: "${pf}"` };
      }
    }
  }

  return { safe: true };
}
