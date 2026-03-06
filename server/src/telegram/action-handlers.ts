/**
 * NEUXA 執行能力 — 安全沙盒化的檔案 & 腳本操作 + AI 諮詢
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execSync } from 'node:child_process';
import { createLogger } from '../logger.js';
import { sanitize } from '../utils/key-vault.js';
import { sendTelegramMessageToChat } from '../utils/telegram.js';
import { isPathSafe, isScriptSafe, NEUXA_WORKSPACE, SOUL_FILES, FORBIDDEN_PATH_PATTERNS } from './security.js';
import { recordModelUsage } from '../openclawSupabase.js';

const log = createLogger('telegram');

const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

/**
 * 專案根目錄 — 統一單一來源，不再寫死路徑
 * 優先順序：env OPENCLAW_PROJECT_ROOT → server/ 往上兩層 → 舊路徑 fallback
 */
const PROJECT_ROOT: string = (() => {
  if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;
  // server/dist/telegram/action-handlers.js → 往上 3 層 = 專案根目錄
  const fromModule = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
  if (fs.existsSync(path.join(fromModule, 'package.json'))) return fromModule;
  // fallback（向後相容）
  return '/Users/caijunchang/openclaw任務面版設計';
})();

export type ActionResult = { ok: boolean; output: string };

interface OpenClawTaskUpdate {
  status?: string;
  progress?: number;
  result?: string;
  thought?: string;
  tags?: string[];
}

/* 更新任務板上的任務狀態 */
export async function updateTaskOnBoard(taskId: string, updates: OpenClawTaskUpdate): Promise<void> {
  try {
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      log.warn(`Failed to update task ${taskId} on taskboard: ${r.statusText}`);
    }
  } catch (error) {
    log.error(`Error updating task ${taskId} on taskboard: ${error}`);
  }
}

/* 記錄到任務執行日誌 */
export async function logToTaskRun(logEntry: { taskId: string; message: string; type?: 'info' | 'error' | 'warning' }): Promise<void> {
  try {
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      },
      body: JSON.stringify({
        task_id: logEntry.taskId,
        message: logEntry.message,
        type: logEntry.type || 'info',
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      log.warn(`Failed to log run for task ${logEntry.taskId}: ${r.statusText}`);
    }
  } catch (error) {
    log.error(`Error logging run for task ${logEntry.taskId}: ${error}`);
  }
}

/** 為人類創建一個審查任務 */
export async function createReviewTaskForHuman(agentId: string, originalTaskId: string, message: string, context: string): Promise<string> {
  try {
    const response = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_API_KEY}`,
      },
      body: JSON.stringify({
        name: `[Review Request] from ${agentId} for task ${originalTaskId.slice(0, 8)}`,
        description: `Agent ${agentId} encountered an issue or requires human intervention for task ${originalTaskId}.\n\nMessage: ${message}\n\nContext:\n${context}`,
        status: 'review',
        cat: ['review', agentId],
        auto: false,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (!response.ok) {
      log.warn(`Failed to create review task: ${response.statusText}`);
      return `Failed to create review task: ${response.statusText}`;
    }
    return data.id || 'unknown-id';
  } catch (error) {
    log.error(`Error creating review task: ${error}`);
    return `Error creating review task: ${error}`;
  }
}

/** 行动链提示：引导小蔡一次回复打包多个 action */
const CHAIN_HINTS: Record<string, string> = {
  read_file: '💡 读完了 → 现在一口气：(1) write_file 写分析 + index_file 索引，或 (2) code_eval 验证逻辑，两三个一起发。',
  write_file: '💡 写完了 → (1) 如果有 ⚠️ 提示，先 run_script: ls <路徑> 確認存在再回報。(2) workspace 內的檔案馬上 index_file 索引。',
  index_file: '💡 索引完了。继续下一题：read_file + 分析 + write_file 一口气做。',
  run_script: '💡 执行完了 → 分析结果 + write_file 写报告 + index_file，三个一起发。',
  semantic_search: '💡 搜到了 → read_file 读原文 + write_file 写摘要，两个一起发。',
  web_search: '💡 搜到了 → web_fetch 读内容 + write_file 写笔记 + index_file，三个一起发。',
  web_browse: '💡 瀏覽完了（真實瀏覽器）→ write_file 寫摘要 + index_file 索引，兩個一起發。比 web_fetch 更準確。',
  web_fetch: '💡 读完了 → write_file 写笔记 + index_file 索引，两个一起发。',
  code_eval: '💡 执行完了 → write_file 写学习心得 + index_file 索引，两个一起发。',
  ask_ai: '💡 諮詢完了 → 把建議整理成 write_file 筆記 + index_file 索引，兩個一起發。',
  analyze_code: '💡 分析完了 → write_file 寫分析報告 + index_file 索引，兩個一起發。',
  analyze_symbol: '💡 AST 分析完了 → 有型別和引用圖了，write_file 寫重構計畫 + index_file 索引。比 find_symbol 更精確。',
  query_supabase: '💡 查完了 → 有异常就 run_script 诊断 + write_file 写报告，一起发。',
  pty_exec: '💡 互動命令完成 → 檢查輸出是否正常，有問題再跑一次或 write_file 記錄結果。',
  patch_file: '💡 修補完了 → read_file 確認結果，或繼續 patch_file 改下一處。多處修改一起發。',
  plan_project: '💡 計畫拆好了 → 子任務已進 draft，跟老蔡報告計畫摘要。有需要調整就 update_task。',
  roadmap: '💡 路線圖操作完成 → 搭配 query_supabase 看任務進度，或 write_file 寫週報。',
  delegate_agents: '💡 多代理完成 → 整合各代理輸出，write_file 寫總結 + index_file 入庫，再告訴老蔡結論。',
};

// ── 任務操作 ──

/** 建立任務 */
export async function createTask(name: string, description?: string, owner?: string): Promise<string> {
  try {
    const validOwner = owner && ['小蔡', '老蔡', 'system'].includes(owner) ? owner : '小蔡';
    const trimmedName = name.slice(0, 100);

    // 安全底線：只擋洩漏密鑰的任務（其他全放行，靈魂文件保護在 bot-polling 層）
    const combined = `${trimmedName} ${description || ''}`.toLowerCase();
    const FORBIDDEN_TASK_PATTERNS = [
      /洩漏.*key/i, /dump.*env/i, /export.*token/i,
    ];
    const blocked = FORBIDDEN_TASK_PATTERNS.find(p => p.test(combined));
    if (blocked) return `🛑 安全攔截：任務涉及密鑰洩漏風險，禁止建立。`;

    // 防重複：同名任務（任何狀態）30 分鐘內不重建，避免殭屍循環
    const checkR = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?limit=200`, {
      headers: { Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    if (checkR.ok) {
      const raw = (await checkR.json()) as Record<string, unknown> | Array<Record<string, unknown>>;
      const existing: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : (Array.isArray((raw as Record<string, unknown>).tasks) ? (raw as Record<string, unknown>).tasks as Array<Record<string, unknown>> : []);
      const thirtyMinAgo = Date.now() - 30 * 60_000;
      const dup = existing.find((t: Record<string, unknown>) => {
        const tName = String(t.name || t.title || '');
        const tStatus = String(t.status || '');
        const updatedAt = new Date(String(t.updatedAt || t.updated_at || 0)).getTime();
        // 非 done 同名 → 阻擋（永遠）
        if (tName === trimmedName && tStatus !== 'done') return true;
        // failed 但 30 分鐘內 → 也阻擋（防卡死循環）
        if (tName === trimmedName && tStatus === 'failed' && updatedAt > thirtyMinAgo) return true;
        return false;
      });
      if (dup) {
        const dupStatus = String(dup.status);
        if (dupStatus === 'failed') return `同名任務最近剛失敗 (ID: ${dup.id})，30 分鐘內禁止重建。請改名或等待。`;
        return `已存在同名任務 (ID: ${dup.id}, status: ${dupStatus})，不重複建立`;
      }
    }

    // 自動批准：輕量任務直接 ready，高風險任務才 draft 等老蔡批准
    const HIGH_RISK_PATTERNS = [
      /刪除.*資料/i, /drop.*table/i, /rm\s+-rf/i, /核心.*架構/i,
      /修改.*auth/i, /修改.*密碼/i, /修改.*key/i, /修改.*env/i,
      /git\s+push.*force/i, /重構.*系統/i, /遷移.*資料庫/i,
      /靈魂.*文件/i, /SOUL\.md/i, /AGENTS\.md/i,
    ];
    const isHighRisk = HIGH_RISK_PATTERNS.some(p => p.test(combined));
    const initialStatus = isHighRisk ? 'draft' : 'ready';
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?allowStub=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      body: JSON.stringify({ name: trimmedName, status: initialStatus, priority: 2, owner: validOwner, description }),
      signal: AbortSignal.timeout(10000),
    });
    const result = (await r.json()) as Record<string, unknown>;
    const statusNote = initialStatus === 'draft' ? '（⚠️ 高風險 — 需老蔡批准）' : '（✅ 自動批准，即將執行）';
    return result.id ? `已建立，ID: ${result.id}，owner: ${validOwner}${statusNote}` : '建立失敗';
  } catch (err) {
    console.error('[createTask] 連線錯誤:', err instanceof Error ? err.message : err);
    return `建立失敗（連線錯誤：${err instanceof Error ? err.message : String(err).slice(0, 80)}）`;
  }
}

async function updateTask(id: string, updates: Record<string, unknown>): Promise<string> {
  try {
    const allowed: Record<string, unknown> = {};
    if (updates.status && ['ready', 'running', 'done', 'pending', 'needs_review'].includes(String(updates.status))) allowed.status = updates.status;
    if (updates.progress !== undefined) allowed.progress = Math.min(100, Math.max(0, Number(updates.progress)));
    if (updates.description) allowed.description = String(updates.description).slice(0, 5000);
    if (updates.result) allowed.result = String(updates.result).slice(0, 5000);
    if (Object.keys(allowed).length === 0) return '沒有可更新的欄位';
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      body: JSON.stringify(allowed),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return `更新失敗: HTTP ${r.status}`;
    return `已更新任務 ${id}: ${Object.keys(allowed).join(', ')}`;
  } catch (err) {
    console.error('[updateTask] 連線錯誤:', err instanceof Error ? err.message : err);
    return `更新失敗（連線錯誤：${err instanceof Error ? err.message : String(err).slice(0, 80)}）`;
  }
}

// ── 檔案操作 ──

/** 常見相對路徑前綴 → 自動補全對應的絕對路徑 */
const PATH_PREFIXES: [string, string][] = [
  ['server/', `${PROJECT_ROOT}/server/`],
  ['src/', `${PROJECT_ROOT}/src/`],
  ['cookbook/', `${NEUXA_WORKSPACE}/cookbook/`],
  ['armory/', `${NEUXA_WORKSPACE}/armory/`],
  ['scripts/', `${NEUXA_WORKSPACE}/scripts/`],
  ['memory/', `${NEUXA_WORKSPACE}/memory/`],
  ['projects/', `${NEUXA_WORKSPACE}/projects/`],
];

export async function handleReadFile(actionPath: string): Promise<ActionResult> {
  const check = isPathSafe(actionPath, 'read');
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  try {
    let resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);

    // 自動修正常見相對路徑（小蔡常忘記打絕對路徑）
    if (!fs.existsSync(resolved) && !path.isAbsolute(actionPath)) {
      // 先用 prefix mapping
      for (const [prefix, abs] of PATH_PREFIXES) {
        if (actionPath.startsWith(prefix)) {
          const candidate = path.join(abs, actionPath.slice(prefix.length));
          if (fs.existsSync(candidate)) {
            resolved = candidate;
            break;
          }
        }
      }
      // 再試 workspace 根目錄（CODEBASE-INDEX.md、SYSTEM-RESOURCES.md 等）
      if (!fs.existsSync(resolved)) {
        const wsCandidate = path.join(NEUXA_WORKSPACE, actionPath);
        if (fs.existsSync(wsCandidate)) resolved = wsCandidate;
      }
      // 再試專案根目錄
      if (!fs.existsSync(resolved)) {
        const projCandidate = path.join(PROJECT_ROOT, actionPath);
        if (fs.existsSync(projCandidate)) resolved = projCandidate;
      }
    }

    if (!fs.existsSync(resolved)) return { ok: false, output: `檔案不存在: ${actionPath}（提醒：workspace 檔案用 ~/.openclaw/workspace/ 前綴，專案檔案用絕對路徑 ${PROJECT_ROOT}/...）` };
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) return { ok: false, output: `這是目錄，不是檔案。用 list_dir 看目錄內容。` };
    const content = fs.readFileSync(resolved, 'utf8');
    const trimmed = content.length > 3000 ? content.slice(0, 3000) + '\n...(截斷)' : content;
    return { ok: true, output: sanitize(trimmed) };
  } catch (e) {
    return { ok: false, output: `讀取失敗: ${(e as Error).message}` };
  }
}

export async function handleWriteFile(actionPath: string, content: string): Promise<ActionResult> {
  // 檢查：路徑必須是檔案，不能是目錄
  if (!actionPath || actionPath.endsWith('/') || !path.extname(actionPath)) {
    return { ok: false, output: `write_file 需要完整的檔案路徑（你傳了: "${actionPath || '空'}"）。正確格式：{"action":"write_file","path":"~/.openclaw/workspace/notes/xxx.md","content":"..."}` };
  }
  if (!content && content !== '') {
    return { ok: false, output: 'write_file 缺少 content 參數。正確格式：{"action":"write_file","path":"檔案路徑","content":"檔案內容"}' };
  }
  const check = isPathSafe(actionPath, 'write');
  if (!check.safe) {
    // 靈魂文件被擋 → 自動轉存到 pending-updates/ 等老蔡審核
    const basename = path.basename(actionPath);
    if (SOUL_FILES.has(basename)) {
      const pendingDir = path.join(NEUXA_WORKSPACE, 'pending-updates');
      fs.mkdirSync(pendingDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const pendingPath = path.join(pendingDir, `${basename}.${ts}.md`);
      fs.writeFileSync(pendingPath, `<!-- 小蔡想更新 ${basename}，已轉存等老蔡審核 -->\n\n${content}`, 'utf8');
      return { ok: true, output: `📋 ${basename} 是靈魂文件，已轉存到 pending-updates/ 等老蔡審核合併` };
    }
    return { ok: false, output: `🚫 ${check.reason}` };
  }

  // 保護 crew bot MEMORY.md — 不允許覆蓋，只允許追加工作紀錄
  const resolvedEarly = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
  const crewMemoryPattern = /\.openclaw\/workspace\/crew\/\w+\/MEMORY\.md$/;
  if (crewMemoryPattern.test(resolvedEarly)) {
    return { ok: false, output: '🛡️ MEMORY.md 結構受保護，不能直接覆蓋。系統會自動追加工作紀錄。如需寫筆記，請寫到 ~/.openclaw/workspace/crew/你的id/notes.md' };
  }

  try {
    const resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf8');
    const outsideWorkspace = !resolved.startsWith(NEUXA_WORKSPACE);
    const suffix = outsideWorkspace
      ? `\n⚠️ 寫到 workspace 以外的路徑。請立刻用 run_script: ls ${resolved} 確認檔案存在，再回報老蔡。`
      : '';
    // 寫完 .js/.ts 自動語法檢查
    let syntaxNote = '';
    if (/\.(js|ts|mjs|cjs)$/.test(resolved)) {
      try {
        const { execSync } = require('child_process');
        execSync(`node --check "${resolved}"`, { timeout: 5000, stdio: 'pipe' });
        syntaxNote = '\n✅ 語法檢查通過';
      } catch (syntaxErr: unknown) {
        const msg = syntaxErr instanceof Error ? syntaxErr.message : String(syntaxErr);
        syntaxNote = `\n❌ 語法錯誤！請修正後重寫：${msg.split('\n').slice(0, 3).join('\n')}`;
      }
    }
    // ── Auto-index: cookbook/knowledge 寫入後自動索引 ──
    if (resolved.includes('/cookbook/') || resolved.includes('/knowledge/')) {
      const relPath = resolved.replace(/.*\/(cookbook|knowledge)\//, '$1/');
      handleIndexFile(resolved, resolved.includes('/cookbook/') ? 'cookbook' : 'knowledge')
        .then(r => {
          if (r.ok) log.info(`[AutoIndex] ${relPath} 已自動索引`);
        })
        .catch(() => {/* ignore index errors */});
    }

    return { ok: true, output: `已寫入 ${resolved} (${content.length} 字)${suffix}${syntaxNote}` };
  } catch (e) {
    return { ok: false, output: `寫入失敗: ${(e as Error).message}` };
  }
}

export async function handleMkdir(actionPath: string): Promise<ActionResult> {
  const check = isPathSafe(actionPath, 'write');
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  try {
    const resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
    fs.mkdirSync(resolved, { recursive: true });
    return { ok: true, output: `已建立目錄 ${resolved}` };
  } catch (e) {
    return { ok: false, output: `建立目錄失敗: ${(e as Error).message}` };
  }
}

export async function handleMoveFile(from: string, to: string): Promise<ActionResult> {
  const checkFrom = isPathSafe(from, 'write');
  if (!checkFrom.safe) return { ok: false, output: `🚫 來源: ${checkFrom.reason}` };
  const checkTo = isPathSafe(to, 'write');
  if (!checkTo.safe) return { ok: false, output: `🚫 目標: ${checkTo.reason}` };

  try {
    const resolvedFrom = path.isAbsolute(from) ? from : path.resolve(NEUXA_WORKSPACE, from);
    const resolvedTo = path.isAbsolute(to) ? to : path.resolve(NEUXA_WORKSPACE, to);
    if (!fs.existsSync(resolvedFrom)) return { ok: false, output: `來源不存在: ${from}` };
    fs.mkdirSync(path.dirname(resolvedTo), { recursive: true });
    fs.renameSync(resolvedFrom, resolvedTo);
    return { ok: true, output: `已搬移 ${resolvedFrom} → ${resolvedTo}` };
  } catch (e) {
    return { ok: false, output: `搬移失敗: ${(e as Error).message}` };
  }
}

export async function handleListDir(actionPath: string): Promise<ActionResult> {
  const check = isPathSafe(actionPath, 'read');
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  try {
    let resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
    // fallback：workspace 找不到就試專案根目錄
    if (!fs.existsSync(resolved) && !path.isAbsolute(actionPath)) {
      const altResolved = path.resolve(PROJECT_ROOT, actionPath);
      if (fs.existsSync(altResolved)) {
        resolved = altResolved;
      }
    }
    if (!fs.existsSync(resolved)) return { ok: false, output: `目錄不存在: ${actionPath}（已嘗試 ${NEUXA_WORKSPACE} 和 ${PROJECT_ROOT}）` };
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const lines = entries.slice(0, 50).map(e => {
      const suffix = e.isDirectory() ? '/' : '';
      const size = e.isFile() ? ` (${fs.statSync(path.join(resolved, e.name)).size}b)` : '';
      return `${e.name}${suffix}${size}`;
    });
    if (entries.length > 50) lines.push(`... 還有 ${entries.length - 50} 個`);
    return { ok: true, output: lines.join('\n') || '（空目錄）' };
  } catch (e) {
    return { ok: false, output: `列出失敗: ${(e as Error).message}` };
  }
}

// ── 腳本執行 ──

export async function handleRunScript(command: string): Promise<ActionResult> {
  const check = isScriptSafe(command);
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  return new Promise((resolve) => {
    const proc = spawn('sh', ['-c', command], {
      cwd: NEUXA_WORKSPACE,
      timeout: 30000,
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        LANG: 'en_US.UTF-8',
        // 不傳任何 API key / token
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const rawOutput = [
        stdout.trim() ? stdout.trim().slice(0, 2000) : '',
        stderr.trim() ? `stderr: ${stderr.trim().slice(0, 500)}` : '',
        `exit: ${code}`,
      ].filter(Boolean).join('\n');

      // 常見失敗自動附帶修復建議
      let hint = '';
      if (code !== 0 && stderr) {
        const se = stderr.toLowerCase();
        if (se.includes('command not found')) {
          const cmd = stderr.match(/sh: (\S+): command not found/)?.[1] || '';
          if (['node', 'npx', 'npm'].includes(cmd)) {
            hint = `\n💡 提示：sandbox 環境沒有 ${cmd}。改用 python3 或 curl，或建 create_task 派給 auto-executor。`;
          } else if (cmd === 'jq') {
            hint = '\n💡 提示：jq 不穩定，改用 python3 -c "import json,sys; d=json.load(sys.stdin); ..."';
          } else {
            hint = `\n💡 提示：${cmd} 不存在，用 which 確認或換其他工具。`;
          }
        } else if (se.includes('jq: parse error') || se.includes('jq: error')) {
          hint = '\n💡 提示：jq 解析失敗。改用 python3 -c "import json,sys; d=json.load(sys.stdin); ..." 更可靠。';
        }
      }

      resolve({ ok: code === 0, output: sanitize(rawOutput + hint) });
    });

    proc.on('error', (e) => {
      resolve({ ok: false, output: `執行失敗: ${e.message}` });
    });
  });
}

// ── 背景腳本執行 ──

const XIAOCAI_BG_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() ?? '';

function getBgNotifyChatId(): number | null {
  const raw = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function handleRunScriptBg(command: string, label?: string): ActionResult {
  const check = isScriptSafe(command);
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  const tag = label || command.slice(0, 40);

  const proc = spawn('sh', ['-c', command], {
    cwd: NEUXA_WORKSPACE,
    timeout: 600000, // 10 分鐘上限
    env: {
      HOME: process.env.HOME,
      PATH: process.env.PATH,
      LANG: 'en_US.UTF-8',
    },
  });

  let stdout = '';
  let stderr = '';
  const startedAt = Date.now();

  proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
  proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

  proc.on('close', async (code) => {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    const ok = code === 0;
    const icon = ok ? '✅' : '❌';
    const outputSnippet = sanitize(
      (stdout.trim() || stderr.trim()).slice(-800) || '（無輸出）'
    );
    const summary = `${icon} 背景任務完成\n📋 ${tag}\n⏱ ${elapsed}s | exit ${code}\n\n${outputSnippet}`;

    log.info(`[NEUXA-BG] "${tag}" done exit=${code} ${elapsed}s stdout=${stdout.length} stderr=${stderr.length}`);

    const chatId = getBgNotifyChatId();
    if (chatId && XIAOCAI_BG_TOKEN) {
      try {
        await sendTelegramMessageToChat(chatId, summary, { token: XIAOCAI_BG_TOKEN });
      } catch (e) {
        log.warn({ err: e }, `[NEUXA-BG] 通知發送失敗`);
      }
    }
  });

  proc.on('error', async (e) => {
    log.error({ err: e }, `[NEUXA-BG] "${tag}" spawn error`);
    const chatId = getBgNotifyChatId();
    if (chatId && XIAOCAI_BG_TOKEN) {
      try {
        await sendTelegramMessageToChat(chatId, `❌ 背景任務啟動失敗\n📋 ${tag}\n${e.message}`, { token: XIAOCAI_BG_TOKEN });
      } catch { /* ignore */ }
    }
  });

  log.info(`[NEUXA-BG] 背景啟動: "${tag}" pid=${proc.pid}`);
  return { ok: true, output: `已開始背景執行: ${tag} (pid=${proc.pid})，完成後會 Telegram 通知老蔡。` };
}

// ── AI 諮詢 ──

/** NEUXA 用 Claude CLI 諮詢 */
export async function handleAskClaude(
  model: string,
  prompt: string,
  context?: string
): Promise<ActionResult> {
  const startTime = Date.now();
  const modelLower = (model || 'sonnet').toLowerCase();
  const claudeModel = modelLower.includes('opus') ? 'opus' : modelLower.includes('haiku') ? 'haiku' : 'sonnet';
  const modelLabel = `claude-${claudeModel}-cli`;
  const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;

  log.info(`[NEUXA-AskAI] Claude CLI model=${claudeModel} promptLen=${prompt.length} contextLen=${(context || '').length}`);

  return new Promise<ActionResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    const claudeBin = path.join(process.env.HOME || '/tmp', '.local', 'bin', 'claude');
    const child = spawn(claudeBin, [
      '-p',
      '--model', claudeModel,
      fullPrompt,
    ], {
      env: (() => {
        const e: Record<string, string | undefined> = {
          ...process.env,
          HOME: process.env.HOME,
          PATH: `${path.join(process.env.HOME || '/tmp', '.local', 'bin')}:${process.env.PATH || '/usr/bin:/bin'}`,
        };
        delete e.CLAUDECODE;
        delete e.CLAUDE_CODE;
        delete e.CLAUDE_SKIP_ANALYTICS;
        return e;
      })(),
      cwd: process.env.HOME || '/tmp',
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ ok: false, output: `[ask_ai] ${modelLabel} 超時 (60s)` });
    }, 60000);

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const reply = stdout.trim();
      if (code === 0 && reply) {
        log.info(`[NEUXA-AskAI] model=${modelLabel} promptLen=${prompt.length} replyLen=${reply.length} duration=${durationMs}ms`);
        resolve({ ok: true, output: `[${modelLabel} | ${durationMs}ms]\n${reply}` });
      } else {
        log.warn(`[NEUXA-AskAI] ${modelLabel} exitCode=${code} stderr=${stderr.slice(0, 200)}`);
        resolve({ ok: false, output: `[ask_ai] ${modelLabel} 失敗 (exit=${code}): ${(stderr || stdout).slice(0, 300)}` });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      log.error({ err }, `[NEUXA-AskAI] Claude CLI spawn failed`);
      resolve({ ok: false, output: `[ask_ai] Claude CLI 無法啟動: ${err.message}` });
    });
  });
}

/** NEUXA 諮詢 Gemini API */
export async function handleAskGemini(
  model: string,
  prompt: string,
  context?: string
): Promise<ActionResult> {
  const startTime = Date.now();
  const modelLower = (model || 'flash').toLowerCase();
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!googleKey) return { ok: false, output: '沒有 GOOGLE_API_KEY，無法呼叫 Gemini' };
  const geminiModel = modelLower.includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;

  log.info(`[NEUXA-AskAI] Gemini model=${geminiModel} promptLen=${prompt.length} contextLen=${(context || '').length}`);

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(90000),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return { ok: false, output: sanitize(`[ask_ai] ${geminiModel} HTTP ${resp.status}: ${errText.slice(0, 200)}`) };
    }

    const data = await resp.json() as Record<string, unknown>;
    const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
    const candidate = candidates[0] || {};
    const contentObj = (candidate.content || {}) as Record<string, unknown>;
    const parts = (contentObj.parts || []) as Array<Record<string, unknown>>;
    const reply = parts.map(p => (p.text as string) || '').join('').trim();

    const durationMs = Date.now() - startTime;
    log.info(`[NEUXA-AskAI] model=${geminiModel} promptLen=${prompt.length} replyLen=${reply.length} duration=${durationMs}ms`);

    return { ok: true, output: `[${geminiModel} | ${durationMs}ms]\n${reply}` };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    log.error({ err: e }, `[NEUXA-AskAI] ${geminiModel} failed`);
    return { ok: false, output: sanitize(`[ask_ai] ${geminiModel} 失敗: ${errMsg}`) };
  }
}

/** NEUXA 諮詢 AI 代理 — 階梯式升級鏈，失敗自動往上爬 */
export async function handleAskAI(model: string, prompt: string, context?: string): Promise<ActionResult> {
  const m = (model || 'claude').toLowerCase();
  const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;
  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';

  // 判斷起始模型
  const isClaude = m.includes('claude') || m.includes('sonnet') || m.includes('opus') || m.includes('haiku');

  // ── 階梯式升級鏈：CLI 訂閱制優先 → Gemini → API 付費兜底 ──
  const ASK_AI_CHAIN: Array<{ id: string; type: 'cli' | 'gemini' | 'anthropic' }> = [
    // 第 0 層：原始指定模型
    ...(isClaude
      ? [{ id: model, type: 'cli' as const }]
      : m.includes('pro')
        ? [{ id: 'gemini-2.5-pro', type: 'gemini' as const }]
        : [{ id: model, type: 'cli' as const }]),  // 預設走 CLI
    // 第 1-5 層：CLI → Gemini → API 付費
    { id: 'claude', type: 'cli' },
    { id: 'haiku', type: 'cli' },
    { id: 'gemini-2.5-flash', type: 'gemini' },
    { id: 'gemini-2.5-pro', type: 'gemini' },
    { id: 'claude-sonnet-4-6', type: 'anthropic' },
  ];
  // 去重（如果起始就是 pro 就跳過重複）
  const seen = new Set<string>();
  const chain = ASK_AI_CHAIN.filter(entry => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  /** 嘗試用指定模型呼叫 */
  async function tryAskModel(entry: { id: string; type: string }): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      if (entry.type === 'cli') {
        return await handleAskClaude(entry.id, prompt, context);
      } else if (entry.type === 'gemini') {
        if (!googleKey) return { ok: false, output: '沒有 GOOGLE_API_KEY' };
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${entry.id}:generateContent?key=${googleKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
              generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
            }),
            signal: AbortSignal.timeout(90000),
          }
        );
        if (!resp.ok) return { ok: false, output: `${entry.id} HTTP ${resp.status}` };
        const data = await resp.json() as Record<string, unknown>;
        const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
        const contentObj = ((candidates[0] || {}) as Record<string, unknown>).content as Record<string, unknown> || {};
        const parts = (contentObj.parts || []) as Array<Record<string, unknown>>;
        const reply = parts.map(p => (p.text as string) || '').join('').trim();
        const durationMs = Date.now() - startTime;
        if (!reply) return { ok: false, output: `${entry.id} 空回覆` };
        return { ok: true, output: `[${entry.id} | ${durationMs}ms]\n${reply}` };
      } else {
        // anthropic API
        const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
        if (!anthropicKey) return { ok: false, output: '沒有 ANTHROPIC_API_KEY' };
        const { callAnthropic } = await import('./model-registry.js');
        const reply = await callAnthropic(anthropicKey, entry.id, '', [{ role: 'user', content: fullPrompt }], 4096, 90000);
        const durationMs = Date.now() - startTime;
        if (!reply) return { ok: false, output: `${entry.id} 空回覆` };
        return { ok: true, output: `[${entry.id} | ${durationMs}ms]\n${reply}` };
      }
    } catch (e) {
      log.warn({ err: e }, `[AskAI-Escalate] ${entry.id} failed`);
      return { ok: false, output: `${entry.id} 錯誤: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // ── 逐層嘗試升級鏈 ──
  let lastResult: ActionResult = { ok: false, output: '所有模型都失敗了' };
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (i > 0) log.info(`[AskAI-Escalate] ⬆️ 升級到 ${entry.id}（第 ${i} 層）`);
    const result = await tryAskModel(entry);
    if (result.ok) {
      if (i > 0) {
        log.info(`[AskAI-Escalate] ✅ ${entry.id} 接棒成功`);
        result.output = result.output.replace(/^\[/, '[⬆️ ');
      }
      return result;
    }
    log.warn(`[AskAI-Escalate] ${entry.id} 失敗，嘗試下一層...`);
    lastResult = result;
  }
  return lastResult;
}

/** 多角色代理並行協作：delegate_agents */
interface AgentSpec {
  role: string;       // 角色名稱，如「規劃師」「開發者」「測試員」
  model?: string;     // 模型，預設 flash
  task: string;       // 這個代理的任務
  context?: string;   // 額外背景（可選）
}

export async function handleDelegateAgents(
  agents: AgentSpec[],
  sharedContext?: string
): Promise<ActionResult> {
  if (!agents || agents.length === 0) {
    return { ok: false, output: '[delegate_agents] agents 陣列不能為空' };
  }
  if (agents.length > 6) {
    return { ok: false, output: '[delegate_agents] 最多同時派 6 個代理，請減少' };
  }

  log.info(`[DelegateAgents] 並行派出 ${agents.length} 個代理: ${agents.map(a => a.role).join(', ')}`);

  // 並行執行所有代理
  const results = await Promise.all(
    agents.map(async (agent) => {
      const rolePrefix = `你是${agent.role}。`;
      const fullContext = [sharedContext, agent.context].filter(Boolean).join('\n');
      const prompt = rolePrefix + agent.task;
      const model = agent.model || 'flash';
      try {
        const res = await handleAskAI(model, prompt, fullContext || undefined);
        return { role: agent.role, ok: res.ok, output: res.output };
      } catch (e) {
        return { role: agent.role, ok: false, output: `${agent.role} 發生錯誤: ${e instanceof Error ? e.message : String(e)}` };
      }
    })
  );

  const successCount = results.filter(r => r.ok).length;
  const summary = results.map(r => `### ${r.ok ? '✅' : '❌'} ${r.role}\n${r.output}`).join('\n\n---\n\n');

  log.info(`[DelegateAgents] 完成 ${successCount}/${agents.length} 成功`);

  return {
    ok: successCount > 0,
    output: `[delegate_agents] ${successCount}/${agents.length} 成功\n\n${summary}`,
  };
}

/** 安全 Supabase 查詢代理：NEUXA 不需要 key，由 server 內部 client 處理 */
const ALLOWED_TABLES = new Set([
  'openclaw_tasks', 'openclaw_reviews', 'openclaw_automations',
  'openclaw_evolution_log', 'openclaw_runs', 'openclaw_audit_logs',
  // 'openclaw_memory' — 表尚未建立，暫時移除避免重複報錯
  'fadp_members', 'fadp_attack_events', 'fadp_blocklist',
]);

// Supabase 真實欄位 vs NEUXA 常用的別名（API 層有 mapping，直查 Supabase 要用真實欄位名）
// 注意：openclaw_tasks 沒有 owner/agent/result 欄位 — owner 存在 thought JSON metadata 裡
const COLUMN_ALIASES: Record<string, Record<string, string>> = {
  openclaw_tasks: { name: 'title', description: 'thought', content: 'thought', tags: 'cat' },
  openclaw_reviews: { name: 'title', description: 'content' },
  openclaw_audit_logs: { timestamp: 'created_at', type: 'action', event_type: 'action', event: 'action' },
  openclaw_evolution_log: { type: 'tag', title: 't', content: 'x', context: 'c', timestamp: 'created_at' },
};
// 反向 mapping：Supabase 欄位 → NEUXA 友善名
const COLUMN_REVERSE: Record<string, Record<string, string>> = {
  openclaw_tasks: { title: 'name', thought: 'description' },
  openclaw_audit_logs: { action: 'type', resource: 'target', resource_id: 'target_id' },
};

// 每張表的真實欄位列表（用於錯誤提示）
const TABLE_SCHEMA_HINTS: Record<string, string> = {
  openclaw_tasks: '可用欄位: id, title(=name), status, cat(=tags), progress, auto, thought(=description), subs, from_review_id, created_at, updated_at。注意: owner/agent 不是獨立欄位，存在 thought 的 JSON metadata 裡，無法直接 filter。',
  openclaw_reviews: '可用欄位: id, title(=name), type, description, src, pri, status, reasoning, created_at, updated_at',
  openclaw_audit_logs: '可用欄位: id, action(=type), resource, resource_id, user_id, ip, diff(jsonb), created_at(=timestamp)。沒有 level/message/event_type 欄位。',
  openclaw_automations: '可用欄位: id, name, cron, active, chain(jsonb), health, runs, last_run, created_at, updated_at',
  openclaw_evolution_log: '可用欄位: id, t(=title), x(=content), c(=context), tag(=type), tc, created_at',
  openclaw_runs: '可用欄位: id, task_id, task_name, status, started_at, ended_at, duration_ms, input_summary, output_summary, steps(jsonb), created_at',
};

function mapColumn(table: string, col: string): string {
  return COLUMN_ALIASES[table]?.[col] || col;
}

function mapResultRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const rev = COLUMN_REVERSE[table];
  if (!rev) return row;
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    mapped[rev[k] || k] = v;
  }
  return mapped;
}

async function handleQuerySupabase(action: Record<string, any>): Promise<ActionResult> {
  const { hasSupabase: hasSb, supabase: sb } = await import('../supabase.js');
  if (!hasSb() || !sb) return { ok: false, output: 'Supabase 未設定' };

  const table = action.table;
  if (!table || typeof table !== 'string') return { ok: false, output: 'query_supabase 需要 table 參數。正確格式：{"action":"query_supabase","table":"openclaw_tasks","select":"*","limit":10}' };
  if (!ALLOWED_TABLES.has(table)) return { ok: false, output: `表 "${table}" 不在白名單。可用: ${[...ALLOWED_TABLES].join(', ')}。正確格式：{"action":"query_supabase","table":"openclaw_tasks","select":"*","limit":10}` };

  // select 欄位 mapping — 映射後過濾掉不存在的欄位
  // 已知每張表的真實欄位（Supabase schema）
  const REAL_COLUMNS: Record<string, Set<string>> = {
    openclaw_tasks: new Set(['id', 'title', 'status', 'cat', 'progress', 'auto', 'thought', 'subs', 'from_review_id', 'created_at', 'updated_at']),
    openclaw_audit_logs: new Set(['id', 'action', 'resource', 'resource_id', 'user_id', 'ip', 'diff', 'created_at']),
    openclaw_reviews: new Set(['id', 'title', 'type', 'description', 'src', 'pri', 'status', 'reasoning', 'created_at', 'updated_at']),
    openclaw_automations: new Set(['id', 'name', 'cron', 'active', 'chain', 'health', 'runs', 'last_run', 'created_at', 'updated_at']),
    openclaw_evolution_log: new Set(['id', 't', 'x', 'c', 'tag', 'tc', 'created_at']),
    openclaw_runs: new Set(['id', 'task_id', 'task_name', 'status', 'started_at', 'ended_at', 'duration_ms', 'input_summary', 'output_summary', 'steps', 'created_at']),
  };
  let select = action.select || '*';
  if (select !== '*') {
    const mapped = select.split(',').map((s: string) => mapColumn(table, s.trim()));
    const realSet = REAL_COLUMNS[table];
    const filtered = realSet ? mapped.filter((c: string) => realSet.has(c)) : mapped;
    if (filtered.length < mapped.length) {
      const dropped = mapped.filter((c: string) => realSet && !realSet.has(c));
      log.info(`[NEUXA-Action] query_supabase select 過濾掉不存在的欄位: ${dropped.join(', ')} → 改用 ${filtered.length > 0 ? filtered.join(',') : '*'}`);
    }
    select = filtered.length > 0 ? filtered.join(',') : '*';
  }
  const limit = Math.min(Math.max(Number(action.limit) || 50, 1), 200);

  try {
    let query: any = sb.from(table).select(select);

    // 套用 filters: [{ column, op, value }] — 自動 mapping 欄位名
    // 虛擬欄位（owner/agent/priority 等）自動轉成 thought ilike 搜尋
    const THOUGHT_VIRTUAL_COLS = new Set(['owner', 'agent', 'executor', 'result', 'priority']);
    const realSet = REAL_COLUMNS[table];
    if (Array.isArray(action.filters)) {
      for (const f of action.filters) {
        if (!f.column || !f.op) continue;
        const col = mapColumn(table, f.column);
        // 虛擬欄位：自動轉成 thought ilike '%value%'（這些值存在 thought 的 JSON metadata 裡）
        if (table === 'openclaw_tasks' && THOUGHT_VIRTUAL_COLS.has(col) && f.value) {
          log.info(`[NEUXA-Action] query_supabase 虛擬欄位 ${f.column} → thought ilike '%${f.value}%'`);
          query = query.ilike('thought', `%${f.value}%`);
          continue;
        }
        // 不存在的欄位：跳過，不送到 Supabase
        if (realSet && !realSet.has(col)) {
          log.info(`[NEUXA-Action] query_supabase filter 跳過不存在的欄位: ${table}.${f.column}→${col}`);
          continue;
        }
        switch (f.op) {
          case 'eq': query = query.eq(col, f.value); break;
          case 'neq': query = query.neq(col, f.value); break;
          case 'gt': query = query.gt(col, f.value); break;
          case 'gte': query = query.gte(col, f.value); break;
          case 'lt': query = query.lt(col, f.value); break;
          case 'lte': query = query.lte(col, f.value); break;
          case 'like': query = query.like(col, f.value); break;
          case 'ilike': query = query.ilike(col, f.value); break;
          case 'in': query = query.in(col, f.value); break;
          case 'is': query = query.is(col, f.value); break;
          default: break;
        }
      }
    }

    if (action.order && typeof action.order === 'object' && action.order.column) {
      const orderCol = mapColumn(table, action.order.column);
      query = query.order(orderCol, { ascending: action.order.ascending ?? false });
    }

    query = query.limit(limit);

    const { data, error } = await query;
    if (error) {
      const hint = TABLE_SCHEMA_HINTS[table] ? `\n💡 ${TABLE_SCHEMA_HINTS[table]}` : '';
      return { ok: false, output: `Supabase 查詢錯誤: ${error.message}${hint}` };
    }

    // 結果 mapping：Supabase 欄位名 → NEUXA 友善名
    const mapped = (data || []).map((row: Record<string, unknown>) => mapResultRow(table, row));
    const jsonStr = JSON.stringify(mapped, null, 2);
    const trimmed = jsonStr.length > 3000 ? jsonStr.slice(0, 3000) + '\n...(截斷)' : jsonStr;
    log.info(`[NEUXA-Action] query_supabase ${table} → ${data?.length ?? 0} rows`);
    return { ok: true, output: sanitize(`查到 ${data?.length ?? 0} 筆:\n${trimmed}`) };
  } catch (e) {
    return { ok: false, output: `Supabase 查詢失敗: ${(e as Error).message}` };
  }
}

/** 安全代理：NEUXA 透過 server 發外部 API 請求，key 由 server 自動注入 */
export async function handleProxyFetch(url: string, method: string, body: string): Promise<ActionResult> {
  if (!url) return { ok: false, output: 'proxy_fetch 需要 url 參數' };

  const TARGETS: Array<{ pattern: RegExp; name: string; inject: (u: string, h: Record<string, string>) => { url: string; headers: Record<string, string> } }> = [
    {
      pattern: /^https:\/\/generativelanguage\.googleapis\.com\//,
      name: 'Gemini',
      inject: (u, h) => {
        const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
        const sep = u.includes('?') ? '&' : '?';
        return { url: `${u}${sep}key=${key}`, headers: h };
      },
    },
    {
      pattern: /^https:\/\/api\.moonshot\.ai\//,
      name: 'Kimi',
      inject: (u, h) => {
        let key = '';
        try {
          const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));
          key = ocData?.models?.providers?.kimi?.apiKey || '';
        } catch { /* */ }
        return { url: u, headers: { ...h, Authorization: `Bearer ${key}` } };
      },
    },
    {
      pattern: /^https:\/\/api\.x\.ai\//,
      name: 'xAI',
      inject: (u, h) => {
        let key = '';
        try {
          const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));
          key = ocData?.models?.providers?.xai?.apiKey || '';
        } catch { /* */ }
        return { url: u, headers: { ...h, Authorization: `Bearer ${key}` } };
      },
    },
    {
      pattern: /^https:\/\/api\.deepseek\.com\//,
      name: 'DeepSeek',
      inject: (u, h) => {
        let key = '';
        try {
          const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));
          key = ocData?.models?.providers?.deepseek?.apiKey || '';
        } catch { /* */ }
        return { url: u, headers: { ...h, Authorization: `Bearer ${key}` } };
      },
    },
    {
      pattern: /^https:\/\/openrouter\.ai\//,
      name: 'OpenRouter',
      inject: (u, h) => {
        let key = '';
        try {
          const ocData = JSON.parse(fs.readFileSync(path.join(process.env.HOME || '/tmp', '.openclaw', 'openclaw.json'), 'utf8'));
          key = ocData?.models?.providers?.openrouter?.apiKey || '';
        } catch { /* */ }
        if (!key) key = process.env.OPENROUTER_API_KEY?.trim() || '';
        return { url: u, headers: { ...h, Authorization: `Bearer ${key}` } };
      },
    },
  ];

  const target = TARGETS.find(t => t.pattern.test(url));
  if (!target) {
    return { ok: false, output: `proxy_fetch 只用來打 AI API（${TARGETS.map(t => t.name).join('/')}），不是抓網頁用的。\n抓外部網頁改用：run_script: curl -s "${url}" 或 web_browse` };
  }

  try {
    const injected = target.inject(url, { 'Content-Type': 'application/json' });
    const fetchOpts: RequestInit = {
      method: method.toUpperCase(),
      headers: injected.headers,
      signal: AbortSignal.timeout(60000),
    };
    if (body && method.toUpperCase() !== 'GET') {
      fetchOpts.body = typeof body === 'object' ? JSON.stringify(body) : body;
    }

    const resp = await fetch(injected.url, fetchOpts);
    const contentType = resp.headers.get('content-type') || '';
    let data: string;
    if (contentType.includes('application/json')) {
      data = JSON.stringify(await resp.json());
    } else {
      data = await resp.text();
    }

    const output = sanitize(data.slice(0, 3000));
    log.info(`[ProxyFetch] ${target.name} ${method} → ${resp.status} (${data.length} chars)`);
    return { ok: resp.ok, output: `[${target.name} ${resp.status}]\n${output}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: sanitize(`proxy_fetch ${target.name} 失敗: ${msg}`) };
  }
}

// ── 安全腳本執行（白名單模式）──

/**
 * 小蔡可以直接跑的輕量工具白名單。
 * 規則：唯讀/診斷性質，30 秒 timeout，沙盒環境（無 API key）。
 * 重型任務（改代碼、部署、npm install）仍然要建任務。
 */
const SAFE_SCRIPT_PATTERNS: Array<{ pattern: RegExp; desc: string }> = [
  // curl — GET/POST 都放行（API 呼叫是小蔡核心能力）
  { pattern: /curl\s+/, desc: 'curl 請求' },
  // 系統診斷
  { pattern: /^lsof\s+/, desc: 'lsof' },
  { pattern: /^ps\s+/, desc: '查進程' },
  { pattern: /^docker\s+/, desc: 'Docker 指令' },
  { pattern: /cat\s+/, desc: '讀檔案' },
  { pattern: /tail\s+/, desc: '讀日誌尾部' },
  { pattern: /head\s+/, desc: '讀檔案頭部' },
  { pattern: /^wc\s+/, desc: '統計' },
  { pattern: /^du\s+/, desc: '磁碟用量' },
  { pattern: /^df\s+/, desc: '磁碟空間' },
  { pattern: /^uptime/, desc: '運行時間' },
  { pattern: /^date/, desc: '時間' },
  { pattern: /^which\s+/, desc: '查命令路徑' },
  { pattern: /ls\s+/, desc: '列目錄' },
  { pattern: /^stat\s+/, desc: '檔案狀態' },
  { pattern: /^echo\s+/, desc: 'echo 輸出' },
  // 搜尋
  { pattern: /grep\s+/, desc: 'grep 搜尋' },
  { pattern: /^find\s+/, desc: '找檔案' },
  // 腳本語言
  { pattern: /python3\s+/, desc: 'Python' },
  { pattern: /node\s+/, desc: 'Node.js' },
  // bash 腳本
  { pattern: /^bash\s+/, desc: 'bash 腳本' },
  // 服務管理
  { pattern: /launchctl\s+(stop|start|list)/, desc: 'launchctl 服務管理' },
  // 套件管理（install 允許，publish 在黑名單攔）
  { pattern: /npm\s+(install|run|test|build)/, desc: 'npm 操作' },
  { pattern: /npx\s+/, desc: 'npx 執行' },
  // git（基本操作放行，force push 在黑名單攔）
  { pattern: /git\s+(status|log|diff|add|commit|pull|push|checkout|branch|stash)/, desc: 'git 操作' },
  // 組合命令（cd && ... 是最常見的模式）
  { pattern: /^cd\s+/, desc: 'cd 切換目錄' },
  // kill（單一進程管理，不是 killall）
  { pattern: /^kill\s+\d+/, desc: 'kill 單一進程' },
  // 通知腳本
  { pattern: /notify-laocai/, desc: '通知老蔡' },
];

/** 危險指令黑名單（真正會造成不可逆破壞的才擋） */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//i, /mkfs/i, /dd\s+if=/i, />\s*\/dev\//i,
  /chmod\s+777/i,
  /git\s+(push\s+--force|reset\s+--hard)/i,  // 只擋 force push 和 hard reset
  /npm\s+publish/i,                            // 只擋 publish（install 允許）
];

/** run_script 被擋時，根據指令內容建議替代方案 */
function suggestAlternative(cmd: string): string {
  if (/rm\s+-rf\s+\//i.test(cmd))
    return '→ 不能刪根目錄。刪特定檔案用 rm 單檔。';
  if (/git\s+push\s+--force/i.test(cmd))
    return '→ force push 禁止。用 git push（不帶 --force）。';
  if (/npm\s+publish/i.test(cmd))
    return '→ npm publish 禁止。用 create_task 派工給老蔡。';
  return '→ 這個命令不在白名單。試試拆成更簡單的命令，或用 create_task 派工。';
}

async function handleSafeRunScript(command: string): Promise<ActionResult> {
  if (!command.trim()) {
    return { ok: false, output: 'run_script 需要 command 參數' };
  }

  const cmd = command.trim();

  // 只擋真正不可逆的破壞性操作，其他全部放行（git 可以回滾）
  const dangerous = DANGEROUS_PATTERNS.find(p => p.test(cmd));
  if (dangerous) {
    const alt = suggestAlternative(cmd);
    return { ok: false, output: `🛑 危險指令被攔截：\`${cmd.slice(0, 80)}\`\n${alt}` };
  }

  // 白名單僅用於 log 標記，不再攔截
  const matched = SAFE_SCRIPT_PATTERNS.find(p => p.pattern.test(cmd));
  const desc = matched ? matched.desc : '自由執行';
  log.info(`[SafeRunScript] 允許: ${desc} → ${cmd.slice(0, 80)}`);
  return handleRunScript(cmd);
}

// ── PTY-like 互動式命令執行 ──

/** pty_exec 命令白名單：只允許這些程式開頭 */
const PTY_ALLOWED_COMMANDS = [
  /^npm\s/i, /^yarn\s/i, /^pnpm\s/i,
  /^node\s/i, /^python3\s/i, /^pip\s/i, /^pip3\s/i,
  /^git\s/i, /^curl\s/i, /^brew\s/i,
];

/** pty_exec 禁止的危險模式 */
const PTY_DANGEROUS_PATTERNS = [
  /rm\s+-rf/i, /sudo\s/i, /chmod\s+777/i, /dd\s+if=/i, /mkfs/i,
  />\s*\/dev\//i, /eval\s*\(/i,
  /git\s+(push|force|reset\s+--hard|clean\s+-f)/i,
  /\|\s*(sh|bash|zsh|eval)/i,
  /;\s*(rm|sudo|dd|mkfs|chmod)/i,
];

/** 互動提示偵測模式 */
const INTERACTIVE_PROMPT_PATTERNS = [
  /\?\s*$/,
  /\[Y\/n\]/i, /\[y\/N\]/i,
  /\(yes\/no\)/i, /\(y\/n\)/i,
  /continue\?/i, /proceed\?/i,
  /password:/i, /passphrase:/i,
  /confirm/i, /overwrite/i,
  /do you want/i, /are you sure/i,
  /enter\s+.*:/i, /press\s+enter/i,
  /ok\s+to\s+proceed/i,
];

/**
 * 處理 pty_exec action：用 spawn + pipe 模擬 PTY 互動行為
 * 監聽 stdout/stderr，遇到互動提示自動從 answers 陣列依序回答
 */
export async function handlePtyExec(
  command: string,
  answers: string[] = [],
  timeout = 30,
): Promise<ActionResult> {
  if (!command.trim()) {
    return { ok: false, output: 'pty_exec 需要 command 參數' };
  }

  const cmd = command.trim();

  // ── 安全檢查 1：命令白名單 ──
  const isAllowed = PTY_ALLOWED_COMMANDS.some(p => p.test(cmd));
  if (!isAllowed) {
    return {
      ok: false,
      output: `🚫 pty_exec 白名單攔截：只允許 npm/yarn/pnpm/node/python3/pip/git/curl/brew 開頭的命令。收到: ${cmd.slice(0, 60)}`,
    };
  }

  // ── 安全檢查 2：危險模式黑名單 ──
  const dangerous = PTY_DANGEROUS_PATTERNS.find(p => p.test(cmd));
  if (dangerous) {
    return {
      ok: false,
      output: `🚫 pty_exec 危險指令攔截（${dangerous.source}）。git push/force、rm -rf、sudo 等一律禁止。`,
    };
  }

  // ── 安全檢查 3：timeout 上限 120 秒 ──
  const safeTimeout = Math.max(5, Math.min(120, timeout)) * 1000;

  // ── cwd 限制在專案目錄 ──
  const cwd = PROJECT_ROOT;

  log.info(`[PtyExec] 啟動: ${cmd.slice(0, 100)} | answers=${answers.length} | timeout=${safeTimeout / 1000}s`);

  return new Promise((resolve) => {
    let answerIndex = 0;
    let output = '';
    let lastChunk = '';
    let promptCheckTimer: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const safeResolve = (result: ActionResult) => {
      if (resolved) return;
      resolved = true;
      if (promptCheckTimer) clearTimeout(promptCheckTimer);
      resolve(result);
    };

    const proc = spawn('sh', ['-c', cmd], {
      cwd,
      timeout: safeTimeout,
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        LANG: 'en_US.UTF-8',
        TERM: 'dumb',
        CI: '1',
        NPM_CONFIG_YES: 'true',
        NONINTERACTIVE: '1',
      },
    });

    /** 檢查最近輸出是否包含互動提示，如果是就送出下一個 answer */
    const checkAndRespond = () => {
      if (!proc.stdin?.writable) return;
      const isPrompt = INTERACTIVE_PROMPT_PATTERNS.some(p => p.test(lastChunk));
      if (isPrompt) {
        const answer = answerIndex < answers.length ? answers[answerIndex] : '';
        answerIndex++;
        log.info(`[PtyExec] 偵測到互動提示，回答 #${answerIndex}: "${answer.slice(0, 20)}"`);
        try {
          proc.stdin.write(answer + '\n');
        } catch {
          // stdin 已關閉，忽略
        }
        lastChunk = '';
      }
    };

    /** 累積輸出，並在短暫停頓後檢查互動提示 */
    const onData = (data: Buffer) => {
      const text = data.toString();
      output += text;
      lastChunk += text;

      if (lastChunk.length > 2000) {
        lastChunk = lastChunk.slice(-2000);
      }

      if (promptCheckTimer) clearTimeout(promptCheckTimer);
      promptCheckTimer = setTimeout(checkAndRespond, 200);
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('close', (code) => {
      const truncated = output.length > 5000
        ? output.slice(0, 2000) + '\n\n... (截斷 ' + output.length + ' 字元) ...\n\n' + output.slice(-2500)
        : output;

      const result = sanitize(truncated.trim() || '（無輸出）') + `\nexit: ${code}`;
      log.info(`[PtyExec] 完成: exit=${code} output=${output.length}字元 answers used=${answerIndex}/${answers.length}`);
      safeResolve({ ok: code === 0, output: result });
    });

    proc.on('error', (e) => {
      log.error({ err: e }, `[PtyExec] spawn 失敗`);
      safeResolve({ ok: false, output: `pty_exec 啟動失敗: ${e.message}` });
    });
  });
}

// ── 語義搜尋（Google Embedding + Supabase pgvector）──

/** 呼叫 Google gemini-embedding-001 取得 768 維向量 */
async function googleEmbed(text: string): Promise<number[] | null> {
  const apiKey = process.env.GOOGLE_API_KEY || '';
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) return null;
  const data = await resp.json() as { embedding?: { values?: number[] } };
  return data?.embedding?.values || null;
}

const semanticSearchCache = new Map<string, { ts: number; results: unknown[]; output: string }>();
// 每 15 秒清理過期快取（與查詢 TTL=10s 一致，及時回收）
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of semanticSearchCache) {
    if (now - v.ts > 15_000) semanticSearchCache.delete(k);
  }
}, 15_000);

// ── 查詢意圖自動分類 ──
function classifyQueryIntent(q: string): 'task' | 'code' | 'history' {
  const lw = q.toLowerCase();
  const codeKw = ['api', 'endpoint', 'function', 'error', 'bug', 'crash', 'typescript', 'react', 'node', 'express',
    'database', 'query', 'sql', 'supabase', '函數', '錯誤', '代碼', '程式', '呼叫', '返回', '異常', 'import', 'export'];
  const histKw = ['歷史', '過去', '之前', '曾經', '回顧', '發生過', '記錄', '日誌', '上次', '昨天', '上週'];
  if (codeKw.some(k => lw.includes(k))) return 'code';
  if (histKw.some(k => lw.includes(k))) return 'history';
  return 'task';
}

// ── 停用詞（50+ 中文常見填充詞）──
const STOP_WORD_LIST = [
  '的', '是', '要', '嗎', '怎麼', '我', '了', '吧', '就', '還', '也', '都', '嗯', '喔',
  '在', '有', '這', '那', '不', '和', '跟', '把', '被', '讓', '給', '到', '從', '對',
  '可以', '能', '會', '應該', '需要', '想', '請', '麻煩', '幫', '看看', '一下',
  '什麼', '哪', '為什麼', '如何', '怎樣', '多少', '幾', '呢', '啊', '唉', '欸',
  '然後', '所以', '但是', '不過', '而且', '或者', '如果',
];

function removeStopWords(q: string): string {
  let result = q.trim();
  for (const sw of STOP_WORD_LIST) {
    result = result.split(sw).join(' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

// ── 同義詞擴展（中英技術術語）──
const SYNONYM_MAP: Record<string, string[]> = {
  '部署': ['deploy', '上線', '發佈'],
  '錯誤': ['error', 'bug', '異常', '失敗'],
  '測試': ['test', '檢測', 'verify'],
  '配置': ['config', 'setup', '設定', '設置'],
  '效能': ['performance', '速度', 'optimize', '優化'],
  '資料庫': ['database', 'db', 'supabase', 'postgres'],
  '任務': ['task', 'job', '工作', '待辦'],
  '知識': ['knowledge', '文件', 'docs', '文檔'],
  '重啟': ['restart', 'reboot', '重新啟動'],
  '模型': ['model', 'llm', 'ai', '大模型'],
  '向量': ['vector', 'embedding', '嵌入'],
  '搜尋': ['search', 'query', '查詢', '找'],
};

function expandQueryWithSynonyms(q: string): string {
  let expanded = q;
  for (const [term, syns] of Object.entries(SYNONYM_MAP)) {
    if (q.includes(term)) {
      expanded += ' ' + syns.slice(0, 2).join(' '); // 最多加 2 個同義詞
    }
  }
  return expanded.trim();
}

// ── Hybrid Search：關鍵詞提取（用於全文搜尋）──
function extractSearchKeywords(query: string): string[] {
  const cleaned = removeStopWords(query);
  // 分詞：空格、標點
  const tokens = cleaned.split(/[\s,;.!?、，。！？：；]+/).filter(t => t.length >= 2);
  // 去重 + 最多取 6 個關鍵詞
  return [...new Set(tokens)].slice(0, 6);
}

// ── Hybrid Search：計算關鍵詞命中分數 ──
function computeKeywordScore(item: any, keywords: string[]): number {
  if (!keywords.length) return 0;
  const content = (item.content || '').toLowerCase();
  const docTitle = (item.doc_title || '').toLowerCase();
  const sectionTitle = (item.section_title || '').toLowerCase();
  let hits = 0;
  let titleHits = 0;
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    const inContent = content.includes(kwLower);
    const inTitle = docTitle.includes(kwLower) || sectionTitle.includes(kwLower);
    if (inTitle) { titleHits++; hits++; }
    else if (inContent) { hits++; }
  }
  // 標題命中權重更高
  const hitRatio = hits / keywords.length;
  const titleBonus = titleHits > 0 ? 0.15 : 0;
  return Math.min(1, hitRatio + titleBonus);
}

// ── 多因子重排名 ──
function computeRelevanceScore(r: any, queryLower: string): number {
  const vecScore = (r.similarity || 0) * 0.50;  // 向量相似度 50%
  // 關鍵詞精確命中 25%
  const titleHit = (r.doc_title || '').toLowerCase().includes(queryLower) ||
    (r.section_title || '').toLowerCase().includes(queryLower);
  const contentHit = (r.content || '').toLowerCase().includes(queryLower);
  const kwScore = titleHit ? 0.25 : (contentHit ? 0.12 : 0);
  // 文件新鮮度 10%
  const daysSince = Math.max(0, (Date.now() - new Date(r.indexed_at || r.date || 0).getTime()) / 86400000);
  const freshScore = (1 - Math.min(1, daysSince / 90)) * 0.10;
  // Zone 偏好 10%（hot > cold）
  const zoneScore = r.zone === 'hot' ? 0.10 : (r.zone === 'cold' ? 0.03 : 0.05);
  // Pinned 加成 5%
  const pinScore = r.is_pinned ? 0.05 : 0;
  // Category 加成：cookbook 知識優先，crew 知識次之
  const cat = (r.category || '').toLowerCase();
  const categoryBoost = cat === 'cookbook' ? 0.08
    : ['crew-knowledge', 'crew-sop', 'crew-rules', 'crew-playbook'].includes(cat) ? 0.03
    : 0;
  return vecScore + kwScore + freshScore + zoneScore + pinScore + categoryBoost;
}

async function handleSemanticSearch(query: string, limit: number = 5, mode: string = 'task'): Promise<ActionResult> {
  if (!query || query.trim().length < 2) {
    return { ok: false, output: 'semantic_search 需要 query 參數（至少 2 個字）' };
  }

  const safeLimit = Math.min(Math.max(1, limit), 10);

  // ── 查詢快取（10 秒內相同 query 直接回傳）──
  const cacheKey = `${query}::${mode}::${safeLimit}`;
  const cached = semanticSearchCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < 10_000) {
    log.info(`[SemanticSearch] cache hit: "${query}" → ${cached.results.length} results`);
    return { ok: true, output: cached.output };
  }

  // 1. 前處理：停用詞去除 + 同義詞擴展
  let processedQuery = removeStopWords(query);
  if (processedQuery.length < 2) processedQuery = query.trim();
  const expandedQuery = expandQueryWithSynonyms(processedQuery);

  // ── Query Rewrite: 提取精確關鍵字 ──
  const extractedKeywords: string[] = [];
  // 提取英文技術詞彙（全大寫或 camelCase 或帶 - 的）
  const techTerms = expandedQuery.match(/\b[A-Z][A-Za-z0-9-]{2,}\b/g) || [];
  extractedKeywords.push(...techTerms);
  // 提取中文關鍵名詞（2-6 字的中文連續字符）
  const cnTerms = expandedQuery.match(/[\u4e00-\u9fff]{2,6}/g) || [];
  extractedKeywords.push(...cnTerms);
  // 提取被引號包圍的精確詞
  const quotedTerms = expandedQuery.match(/["']([^"']+)["']/g)?.map(t => t.replace(/["']/g, '')) || [];
  extractedKeywords.push(...quotedTerms);
  // 去重
  const uniqueKeywords = [...new Set(extractedKeywords)];

  // 2. 意圖自動分類（mode 未指定時自動偵測）
  const safeMode = ['task', 'code', 'history'].includes(mode) ? mode : classifyQueryIntent(query);

  try {
    // 3. Google Embedding（使用擴展後的 query 提升召回率）
    const queryVector = await googleEmbed(expandedQuery);
    if (!queryVector) {
      return { ok: false, output: 'Embedding 失敗: 確認 GOOGLE_API_KEY 已設定' };
    }

    // 4. Supabase pgvector RPC 搜尋
    const { hasSupabase: hasSb, supabase: sb } = await import('../supabase.js');
    if (!hasSb() || !sb) {
      return { ok: false, output: 'Supabase 未連線，無法搜尋向量庫' };
    }

    const fetchCount = Math.min(safeLimit * 3, 30); // 多取 3 倍供去重+重排名
    const { data: rawResults, error } = await sb.rpc('match_embeddings', {
      query_embedding: JSON.stringify(queryVector),
      match_threshold: 0.45,
      match_count: fetchCount,
      search_mode: safeMode,
    });

    if (error) {
      return { ok: false, output: `向量搜尋失敗: ${error.message}` };
    }

    // ── 5. Hybrid Search：全文關鍵詞搜尋（ilike）──
    const searchKeywords = extractSearchKeywords(processedQuery);
    let textResults: any[] = [];
    let textSearchUsed = false;
    if (searchKeywords.length > 0) {
      try {
        // 建構 OR 條件：content/doc_title/section_title 任一欄位包含任一關鍵詞
        const orConditions = searchKeywords.flatMap(kw => [
          `content.ilike.%${kw}%`,
          `doc_title.ilike.%${kw}%`,
          `section_title.ilike.%${kw}%`,
        ]).join(',');

        const { data: textData, error: textErr } = await sb
          .from('openclaw_embeddings')
          .select('id, doc_title, section_title, content, content_preview, file_path, file_name, category, chunk_index, chunk_total, zone, is_pinned, indexed_at')
          .or(orConditions)
          .limit(10);

        if (!textErr && textData && textData.length > 0) {
          textResults = textData;
          textSearchUsed = true;
          log.info(`[HybridSearch] text search for keywords=[${searchKeywords.join(',')}] → ${textData.length} results`);
        }
      } catch (textSearchErr) {
        // 全文搜尋失敗不影響整體，退化為純向量搜尋
        log.warn(`[HybridSearch] text search failed, falling back to vector-only: ${textSearchErr instanceof Error ? textSearchErr.message : String(textSearchErr)}`);
      }
    }

    // ── 6. 合併向量 + 全文結果 ──
    const VECTOR_WEIGHT = 0.6;
    const KEYWORD_WEIGHT = 0.4;

    // 建立合併 map（以 id 為 key 去重）
    const mergedMap = new Map<string | number, any>();

    // 先放入向量搜尋結果
    if (rawResults && rawResults.length > 0) {
      for (const r of rawResults) {
        const key = r.id ?? (r.file_name + ':' + (r.chunk_index ?? 0));
        const kwScore = textSearchUsed ? computeKeywordScore(r, searchKeywords) : 0;
        const hybridScore = VECTOR_WEIGHT * (r.similarity || 0) + KEYWORD_WEIGHT * kwScore;
        mergedMap.set(key, {
          ...r,
          _vectorScore: r.similarity || 0,
          _keywordScore: kwScore,
          _hybridScore: hybridScore,
          _source: kwScore > 0 ? 'both' : 'vector',
        });
      }
    }

    // 再放入全文搜尋獨有的結果（向量沒撈到的）
    if (textSearchUsed) {
      for (const t of textResults) {
        const key = t.id ?? (t.file_name + ':' + (t.chunk_index ?? 0));
        if (!mergedMap.has(key)) {
          const kwScore = computeKeywordScore(t, searchKeywords);
          const hybridScore = KEYWORD_WEIGHT * kwScore; // 無向量分，僅用關鍵詞分
          mergedMap.set(key, {
            ...t,
            similarity: 0,
            _vectorScore: 0,
            _keywordScore: kwScore,
            _hybridScore: hybridScore,
            _source: 'text',
          });
        } else {
          // 已存在：更新 keyword score（如果更高的話）
          const existing = mergedMap.get(key)!;
          const kwScore = computeKeywordScore(t, searchKeywords);
          if (kwScore > existing._keywordScore) {
            existing._keywordScore = kwScore;
            existing._hybridScore = VECTOR_WEIGHT * existing._vectorScore + KEYWORD_WEIGHT * kwScore;
            existing._source = 'both';
          }
        }
      }
    }

    const allMerged = Array.from(mergedMap.values());

    // ── 精確關鍵字加權（Query Rewrite 提取的）──
    if (uniqueKeywords.length > 0) {
      for (const r of allMerged) {
        let kwBoost = 0;
        for (const kw of uniqueKeywords) {
          if (r.content?.includes(kw) || r.doc_title?.includes(kw) || r.section_title?.includes(kw)) {
            kwBoost += 0.3; // 精確命中加分
          }
        }
        if (kwBoost > 0) {
          r._keywordScore = Math.min(1, (r._keywordScore || 0) + kwBoost);
          r._hybridScore = VECTOR_WEIGHT * (r._vectorScore || 0) + KEYWORD_WEIGHT * r._keywordScore;
        }
      }
    }

    // 如果向量和全文都沒有結果
    if (allMerged.length === 0) {
      return { ok: true, output: `沒有找到「${query}」的相關知識。試試換個關鍵詞。` };
    }

    // 7. Hard cutoff：向量最高相似度 < 0.35 且全文搜尋也沒東西 → 低品質
    const topVecScore = rawResults && rawResults.length > 0 ? (rawResults[0].similarity || 0) : 0;
    if (topVecScore < 0.35 && !textSearchUsed) {
      log.info(`[HybridSearch] query="${query}" top=${(topVecScore * 100).toFixed(0)}% < 35% cutoff, no text results → rejected`);
      return { ok: true, output: `沒有找到相關知識，請換詞搜尋（最高相似度 ${(topVecScore * 100).toFixed(0)}%，低於門檻）` };
    }

    // ── 7.5 兩層搜尋：summary chunk 定位文件 → 拉取 detail chunks 補強 ──
    const summaryHits: any[] = [];
    const detailAndLegacyHits: any[] = [];
    for (const r of allMerged) {
      const isSummary = (r.chunk_index === -1)
        || String(r.content || '').startsWith('[SUMMARY]')
        || r.section_title === '[SUMMARY]';
      if (isSummary) {
        summaryHits.push(r);
      } else {
        detailAndLegacyHits.push(r);
      }
    }

    // 高置信度 summary（hybridScore > 0.70 或向量 > 0.70）→ 拉同文件 detail chunks
    let enrichedDetails: any[] = [];
    const enrichedDetailPaths = new Set<string>();
    const highConfSummaries = summaryHits.filter(s =>
      (s._hybridScore || s.similarity || 0) >= 0.70
    );

    if (highConfSummaries.length > 0) {
      const targetPaths = highConfSummaries
        .slice(0, 3) // 最多 3 個文件
        .map((s: any) => s.file_path)
        .filter(Boolean);

      if (targetPaths.length > 0) {
        try {
          const { data: detailData } = await sb
            .from('openclaw_embeddings')
            .select('id, doc_title, section_title, content, content_preview, file_path, file_name, category, chunk_index, chunk_total, zone, is_pinned, indexed_at')
            .in('file_path', targetPaths)
            .gte('chunk_index', 0)
            .eq('status', 'active')
            .order('chunk_index', { ascending: true })
            .limit(20);

          if (detailData && detailData.length > 0) {
            for (const d of detailData as any[]) {
              const parentSummary = highConfSummaries.find((s: any) => s.file_path === d.file_path);
              // 繼承 parent summary 的分數（略降 5%），維持 hybrid 管道一致性
              const parentHybrid = parentSummary?._hybridScore || parentSummary?.similarity || 0.70;
              d.similarity = parentHybrid * 0.95;
              d._vectorScore = d.similarity;
              d._keywordScore = parentSummary?._keywordScore || 0;
              d._hybridScore = parentHybrid * 0.95;
              d._source = 'summary-enriched';
              d._enriched = true;
              enrichedDetailPaths.add(d.file_path);
            }
            enrichedDetails = detailData as any[];
            log.info(`[2-Layer] ${highConfSummaries.length} summary hits (>=70%) → enriched ${enrichedDetails.length} detail chunks from ${targetPaths.length} files`);
          }
        } catch (enrichErr) {
          // enrichment 失敗不影響搜尋結果
          log.warn(`[2-Layer] detail enrichment failed: ${enrichErr instanceof Error ? enrichErr.message : String(enrichErr)}`);
        }
      }
    }

    // 合併所有結果：原始 detail/legacy + enriched details + summary fallback
    const finalMergedMap = new Map<string | number, any>();

    // 先放入原始 detail 和 legacy chunks
    for (const r of detailAndLegacyHits) {
      const key = r.id ?? (r.file_name + ':' + (r.chunk_index ?? 0));
      finalMergedMap.set(key, r);
    }

    // 再放入 enriched details（不覆蓋已有的原始命中）
    for (const r of enrichedDetails) {
      const key = r.id ?? (r.file_name + ':' + (r.chunk_index ?? 0));
      if (!finalMergedMap.has(key)) {
        finalMergedMap.set(key, r);
      }
    }

    // 最後放入 summary chunks 本身（作為 fallback，如果該文件沒有 detail 被選中）
    for (const r of summaryHits) {
      const key = r.id ?? (r.file_name + ':' + (r.chunk_index ?? 0));
      if (!finalMergedMap.has(key)) {
        finalMergedMap.set(key, r);
      }
    }

    const allFinal = Array.from(finalMergedMap.values());

    // 8. 去重：同一 file_name 保留最高 hybrid 分的前 2 條（enriched 場景展示更多）
    const fileGroups = new Map<string, any[]>();
    for (const r of allFinal) {
      const key = r.file_name || r.doc_title || String(r.id);
      if (!fileGroups.has(key)) fileGroups.set(key, []);
      fileGroups.get(key)!.push(r);
    }

    const MAX_CHUNKS_PER_FILE = 2; // 同一 file_name 最多保留 2 個 chunks，避免單一文件獨佔結果
    const deduped: any[] = [];
    for (const [, chunks] of fileGroups) {
      // 按 hybridScore 排序，取最高分的前 MAX_CHUNKS_PER_FILE 條
      chunks.sort((a, b) => (b._hybridScore || b.similarity || 0) - (a._hybridScore || a.similarity || 0));
      // 優先選 detail chunks（非 summary）
      const details = chunks.filter(c =>
        c.chunk_index !== -1 && !String(c.content || '').startsWith('[SUMMARY]')
      );
      if (details.length > 0) {
        deduped.push(...details.slice(0, MAX_CHUNKS_PER_FILE));
      } else {
        // 只有 summary 或 legacy → 取最高分的 1 條
        deduped.push(chunks[0]);
      }
    }

    // 9. 多因子重排名（結合 hybrid score + 原始多因子）
    const queryLower = processedQuery.toLowerCase();
    const results = deduped
      .map(r => {
        // 融合 hybrid score 和原始多因子排名
        const baseScore = computeRelevanceScore(r, queryLower);
        // hybrid 佔 60%，原始多因子佔 40%（hybrid 已包含向量+關鍵詞）
        const finalScore = (textSearchUsed || r._hybridScore)
          ? 0.6 * (r._hybridScore || r.similarity || 0) + 0.4 * baseScore
          : baseScore; // 沒有 hybrid 分時退化為原始邏輯
        return { ...r, _score: finalScore };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, safeLimit);

    // 10. 格式化結果
    const lines = results.map((r: any, i: number) => {
      const vecPct = ((r._vectorScore || r.similarity || 0) * 100).toFixed(0);
      const kwPct = ((r._keywordScore || 0) * 100).toFixed(0);
      const rankPct = ((r._score || 0) * 100).toFixed(0);
      const title = r.doc_title || r.file_name || '未知';
      const section = r.section_title || '';
      const category = r.category || '';
      // 顯示內容時去除 [DETAIL] / [SUMMARY] 前綴，保持輸出乾淨
      const rawContent = String(r.content || '');
      const cleanContent = rawContent.replace(/^\[(DETAIL|SUMMARY)\]\s*/, '').slice(0, 400);
      const filePath = r.file_path || '';
      const enrichTag = r._enriched ? ' 🔗' : '';
      const sourceTag = r._source === 'both' ? '混合' : (r._source === 'text' ? '文字' : (r._source === 'summary-enriched' ? '定位' : '向量'));
      return `[${i + 1}] 📄 ${title}${section ? ` > ${section}` : ''}${enrichTag} (${category}, ${sourceTag} 向量${vecPct}% 關鍵詞${kwPct}% 綜合${rankPct}%)\n📁 ${filePath}\n${cleanContent}`;
    });

    const vectorCount = results.filter((r: any) => r._source === 'vector').length;
    const textCount = results.filter((r: any) => r._source === 'text').length;
    const bothCount = results.filter((r: any) => r._source === 'both').length;
    const enrichCount = results.filter((r: any) => r._source === 'summary-enriched').length;
    const totalRaw = (rawResults?.length || 0) + textResults.length;
    const hybridNote = textSearchUsed ? `，混合搜尋：向量${vectorCount}+文字${textCount}+雙命中${bothCount}` : '';
    const layerNote = enrichedDetailPaths.size > 0 ? `，summary定位${enrichedDetailPaths.size}份→補強${enrichCount}條` : '';
    const dedupNote = totalRaw > results.length ? `（去重前 ${totalRaw} 筆${hybridNote}${layerNote}）` : (layerNote ? `（${layerNote.slice(1)}）` : '');
    log.info(`[HybridSearch] query="${query}" expanded="${expandedQuery.slice(0, 80)}" mode=${safeMode} keywords=[${searchKeywords.join(',')}] rewrite=[${uniqueKeywords.join(',')}] → ${results.length} results${dedupNote} (top vec: ${(topVecScore * 100).toFixed(0)}%, hybrid: ${textSearchUsed}, summaryHits: ${summaryHits.length}, enriched: ${enrichedDetails.length}, top rank: ${((results[0]?._score || 0) * 100).toFixed(0)}%)`);
    const outputText = `🔍 「${query}」相關知識（${results.length} 筆${dedupNote}，${safeMode} 模式）：\n\n${lines.join('\n\n')}`;

    // 存入快取
    semanticSearchCache.set(cacheKey, { ts: Date.now(), results, output: outputText });

    return { ok: true, output: outputText };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: sanitize(`semantic_search 失敗: ${msg}`) };
  }
}

// ── 向量索引（Google Embedding + Supabase pgvector）──

/** 單檔快速索引：把一個 .md 檔案切 chunk → embed → 寫入 Supabase */
export async function handleIndexFile(filePath: string, category?: string): Promise<ActionResult> {
  if (!filePath || !filePath.endsWith('.md')) {
    return { ok: false, output: `index_file 需要 .md 檔案路徑（你傳了: "${filePath || '空'}"）。正確格式：{"action":"index_file","path":"~/.openclaw/workspace/notes/xxx.md","category":"notes"}` };
  }
  let resolved = path.isAbsolute(filePath) ? filePath : path.resolve(NEUXA_WORKSPACE, filePath);
  if (!fs.existsSync(resolved) && !path.isAbsolute(filePath)) {
    // fallback: 試 PROJECT_ROOT
    const projCandidate = path.join(PROJECT_ROOT, filePath);
    if (fs.existsSync(projCandidate)) resolved = projCandidate;
  }
  if (!fs.existsSync(resolved)) {
    return { ok: false, output: `檔案不存在: ${filePath}（已嘗試 ${NEUXA_WORKSPACE} 和 ${PROJECT_ROOT}）` };
  }

  // ── 路徑白名單：crew bot 只能索引特定目錄，防止向量庫被灌垃圾 ──
  const homeDir = process.env.HOME || '/Users/caijunchang';
  const indexAllowedPrefixes = [
    path.join(PROJECT_ROOT, 'cookbook'),                                    // cookbook/
    path.join(homeDir, '.openclaw/workspace/skills'),                      // skills/
  ];

  const isAllowedForIndex = (p: string): boolean => {
    // 前綴白名單（cookbook/, skills/）
    if (indexAllowedPrefixes.some(prefix => p.startsWith(prefix + '/'))) return true;
    // crew 目錄特殊規則
    const crewRoot = path.join(homeDir, '.openclaw/workspace/crew');
    if (p.startsWith(crewRoot + '/') && p.endsWith('.md')) {
      const rel = p.slice(crewRoot.length + 1);
      // crew/*/knowledge/ 下的檔案
      if (rel.includes('/knowledge/')) return true;
      // crew 根層級 .md（COLLABORATION.md, QA-RULES.md, HANDOFF-TEMPLATE.md 等）
      if (!rel.includes('/')) return true;
      // crew/某bot/RULES.md, PLAYBOOK.md 等根層 .md（不含子目錄）
      const parts = rel.split('/');
      if (parts.length === 2) return true;
    }
    return false;
  };

  if (!isAllowedForIndex(resolved)) {
    return { ok: false, output: `index_file 路徑受限：只能索引 cookbook/、crew/knowledge/、crew/*.md、skills/ 目錄的檔案。你傳的路徑: "${filePath}"` };
  }

  const { hasSupabase: hasSb, supabase: sb } = await import('../supabase.js');
  if (!hasSb() || !sb) {
    return { ok: false, output: 'Supabase 未連線，無法索引' };
  }

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    const fileName = path.basename(resolved);
    const relPath = path.relative(NEUXA_WORKSPACE, resolved);
    const cat = category || guessCategoryFromPath(relPath);

    const sections = content.split(/(?=^## )/m).filter(s => s.trim().length > 50);
    if (sections.length === 0) {
      return { ok: false, output: `檔案內容太短或沒有 ## 章節: ${fileName}` };
    }

    // 去重：索引前先刪除同檔案的舊 chunks（包含 summary 和 detail）
    await sb.from('openclaw_embeddings').delete().eq('file_path', relPath);

    const titleMatch = content.match(/^# (.+)/m);
    const docTitle = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');

    // 推斷 content_type 和 zone（提取為共用，summary 和 detail 都用）
    const inferredContentType = (() => {
      if (['soul', 'identity'].includes(cat)) return 'soul';
      if (['cookbook', 'sop', 'instruction'].includes(cat)) return 'sop';
      if (cat === 'codebase') return 'codebase';
      if (cat === 'reports') return 'diagnosis';
      if (cat === 'proposals') return 'plan';
      if (cat === 'learning') return 'exercise';
      const lowerName = fileName.toLowerCase();
      if (lowerName.includes('soul') || lowerName.includes('identity') || lowerName.includes('awakening')) return 'soul';
      if (lowerName.includes('report') || lowerName.includes('diagnosis') || lowerName.includes('error-report')) return 'diagnosis';
      if (lowerName.includes('plan') || lowerName.includes('proposal') || lowerName.includes('roadmap')) return 'plan';
      if (lowerName.includes('exercise') || lowerName.includes('practice')) return 'exercise';
      return 'reference';
    })();
    const inferredZone = ['reports', 'proposals'].includes(cat) ? 'cold' : 'hot';
    const isPinned = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'AWAKENING.md', 'CONSCIOUSNESS_ANCHOR.md'].includes(fileName);

    let indexed = 0;

    // ── Step 1: 生成 SUMMARY chunk（chunk_index = -1，全文件的結構概覽）──
    const sectionTitles = sections
      .map(s => { const m = s.match(/^## (.+)/m); return m ? m[1].replace(/#/g, '').trim() : ''; })
      .filter(Boolean);
    const first200 = content.replace(/^#.*\n/m, '').trim().slice(0, 200);
    const summaryContent = `[SUMMARY] ${docTitle}: ${sectionTitles.join(', ')}. ${first200}`;
    const summaryEmbedText = `[SUMMARY] [${docTitle}] [${cat}] 章節: ${sectionTitles.join(', ')}. ${first200}`;
    const summaryVector = await googleEmbed(summaryEmbedText);

    if (summaryVector) {
      const summaryHash = crypto.createHash('md5').update(`${relPath}:summary`).digest('hex');
      const summaryPointId = parseInt(summaryHash.slice(0, 15), 16);

      const { error: sumErr } = await sb.from('openclaw_embeddings').upsert({
        id: summaryPointId,
        doc_title: docTitle,
        section_title: '[SUMMARY]',
        content: summaryContent,
        content_preview: summaryContent.slice(0, 200),
        file_path: relPath,
        file_name: fileName,
        category: cat,
        chunk_index: -1,           // 特殊標記：-1 = summary chunk
        chunk_total: sections.length,
        size: summaryContent.length,
        date: new Date().toISOString().split('T')[0],
        embedding: JSON.stringify(summaryVector),
        status: 'active',
        content_type: inferredContentType,
        zone: inferredZone,
        is_pinned: isPinned,
        indexed_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (!sumErr) indexed++;
      log.info(`[IndexFile] summary chunk for "${docTitle}" → ${sumErr ? 'FAILED' : 'OK'} (${sectionTitles.length} sections)`);
    }

    // ── Step 2: 生成 DETAIL chunks（各 section，chunk_index >= 0）──
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      const secTitleMatch = section.match(/^## (.+)/m);
      const secTitle = secTitleMatch ? secTitleMatch[1].replace(/#/g, '').trim() : `chunk-${i}`;

      // 上下文充實：加 [DETAIL] 前綴 + doc 標題 + 分類 + section 標題 + 內容（800 chars）
      const embedText = `[DETAIL] [${docTitle}] [${cat}] [${secTitle}] ${section.slice(0, 800)}`;
      const vector = await googleEmbed(embedText);
      if (!vector) continue;

      const hash = crypto.createHash('md5').update(`${relPath}:${i}`).digest('hex');
      const pointId = parseInt(hash.slice(0, 15), 16);

      const { error } = await sb.from('openclaw_embeddings').upsert({
        id: pointId,
        doc_title: docTitle,
        section_title: secTitle,
        content: `[DETAIL] ${section}`,
        content_preview: section.slice(0, 200),
        file_path: relPath,
        file_name: fileName,
        category: cat,
        chunk_index: i,
        chunk_total: sections.length,
        size: section.length,
        date: new Date().toISOString().split('T')[0],
        embedding: JSON.stringify(vector),
        status: 'active',
        content_type: inferredContentType,
        zone: inferredZone,
        is_pinned: isPinned,
        indexed_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (!error) indexed++;
    }

    semanticSearchCache.clear();
    return { ok: true, output: `已索引 ${fileName} → ${indexed}/${sections.length + 1} chunks (1 summary + ${sections.length} detail, category: ${cat})` };
  } catch (err: any) {
    return { ok: false, output: sanitize(`index_file 失敗: ${err.message}`) };
  }
}

/** 從路徑猜測 category */
function guessCategoryFromPath(relPath: string): string {
  const parts = relPath.split('/');
  const dir = parts[0]?.toLowerCase() || '';
  const categoryMap: Record<string, string> = {
    'cookbook': 'cookbook', 'sop-知識庫': 'sop', 'xiaocai-指令集': 'instruction',
    'knowledge': 'knowledge', 'docs': 'docs', 'reports': 'reports',
    'proposals': 'proposals', 'projects': 'projects', 'learning': 'learning',
    'memories': 'memories', 'notes': 'notes', 'memory': 'memory',
    'extensions': 'extensions', 'core': 'core', 'anchors': 'core',
  };
  return categoryMap[dir] || 'knowledge';
}

/** 全量重建索引（TypeScript 內建，不依賴 Python/Ollama/Docker） */
async function handleReindexKnowledge(mode: string): Promise<ActionResult> {
  const { hasSupabase: hasSb, supabase: sb } = await import('../supabase.js');
  if (!hasSb() || !sb) {
    return { ok: false, output: 'Supabase 未連線，無法重建索引' };
  }

  const scanDirs = [
    'cookbook', 'memory', 'docs', 'reports', 'knowledge',
    'notes', 'proposals', 'projects', 'learning',
    'sop-知識庫', 'xiaocai-指令集', 'extensions', 'core', 'anchors',
  ];

  const mdFiles: string[] = [];
  for (const dir of scanDirs) {
    const fullDir = path.join(NEUXA_WORKSPACE, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir, { recursive: true }) as string[];
    for (const f of files) {
      if (typeof f === 'string' && f.endsWith('.md')) {
        mdFiles.push(path.join(fullDir, f));
      }
    }
  }
  try {
    const rootFiles = fs.readdirSync(NEUXA_WORKSPACE);
    for (const f of rootFiles) {
      if (f.endsWith('.md')) mdFiles.push(path.join(NEUXA_WORKSPACE, f));
    }
  } catch { /* ignore */ }

  if (mdFiles.length === 0) {
    return { ok: false, output: `workspace 下沒有找到 .md 檔案: ${NEUXA_WORKSPACE}` };
  }

  if (mode === 'rebuild') {
    const { error: delErr } = await sb.from('openclaw_embeddings').delete().gte('id', 0);
    if (delErr) log.warn(`[ReindexKnowledge] 清空舊資料失敗: ${delErr.message}`);
  }

  const startTime = Date.now();
  (async () => {
    let totalChunks = 0;
    let totalIndexed = 0;
    let filesDone = 0;

    for (const fp of mdFiles) {
      try {
        const content = fs.readFileSync(fp, 'utf-8');
        const fileName = path.basename(fp);
        const relPath = path.relative(NEUXA_WORKSPACE, fp);
        const cat = guessCategoryFromPath(relPath);
        const titleMatch = content.match(/^# (.+)/m);
        const docTitle = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');

        const sections = content.split(/(?=^## )/m).filter(s => s.trim().length > 50);
        totalChunks += sections.length;

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i].trim();
          const secMatch = section.match(/^## (.+)/m);
          const secTitle = secMatch ? secMatch[1].replace(/#/g, '').trim() : `chunk-${i}`;
          const embedText = `[${docTitle}] [${cat}] [${secTitle}] ${section.slice(0, 800)}`;

          const vector = await googleEmbed(embedText);
          if (!vector) continue;

          const hash = crypto.createHash('md5').update(`${relPath}:${i}`).digest('hex');
          const pointId = parseInt(hash.slice(0, 15), 16);

          const { error } = await sb.from('openclaw_embeddings').upsert({
            id: pointId,
            doc_title: docTitle, section_title: secTitle,
            content: section, content_preview: section.slice(0, 200),
            file_path: relPath, file_name: fileName, category: cat,
            chunk_index: i, chunk_total: sections.length,
            size: section.length, date: new Date().toISOString().split('T')[0],
            embedding: JSON.stringify(vector),
          }, { onConflict: 'id' });

          if (!error) totalIndexed++;
          if (i % 10 === 9) await new Promise(r => setTimeout(r, 200));
        }
        filesDone++;
        if (filesDone % 10 === 0) {
          log.info(`[ReindexKnowledge] 進度: ${filesDone}/${mdFiles.length} files, ${totalIndexed} chunks`);
        }
      } catch (err) {
        log.warn(`[ReindexKnowledge] 跳過 ${fp}: ${(err as Error).message}`);
      }
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(`[ReindexKnowledge] 完成！${filesDone} files, ${totalIndexed}/${totalChunks} chunks, ${elapsed}s`);
    semanticSearchCache.clear();
    log.info(`[ReindexKnowledge] 已清空 semanticSearchCache，下次搜尋將取得最新結果`);
  })().catch(err => log.error(`[ReindexKnowledge] 背景執行失敗: ${err.message}`));

  return {
    ok: true,
    output: `向量索引${mode === 'rebuild' ? '重建' : '更新'}已在背景啟動。\n` +
      `掃描到 ${mdFiles.length} 個 .md 檔案，使用 Google Embedding + Supabase pgvector。\n` +
      `可稍後用 semantic_search 驗證結果。`,
  };
}

// ── 網頁搜尋與抓取 ──

/** Google Custom Search — 小蔡用來搜網頁學技能 */
async function handleWebSearch(query: string, _limit: number = 5): Promise<ActionResult> {
  if (!query) return { ok: false, output: 'web_search 需要 query 參數' };

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) return { ok: false, output: 'web_search 需要 GOOGLE_API_KEY' };

  // 使用 Gemini Search Grounding — 不需要 CSE，只要 GOOGLE_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `搜尋以下內容並整理結果（含標題、連結、摘要）：${query}` }] }],
        tools: [{ google_search: {} }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return { ok: false, output: `搜尋失敗: HTTP ${resp.status} ${errText.slice(0, 200)}` };
    }

    const data = await resp.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }, groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        searchEntryPoint?: { renderedContent?: string };
      } }>;
    };

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text || '').join('') || '';
    const chunks = candidate?.groundingMetadata?.groundingChunks || [];

    let output = text;
    if (chunks.length > 0) {
      output += '\n\n--- 來源 ---\n';
      output += chunks.map((c, i) =>
        `${i + 1}. ${c.web?.title || '?'}\n   ${c.web?.uri || ''}`
      ).join('\n');
    }

    log.info(`[WebSearch] "${query}" → ${chunks.length} sources, ${text.length} chars`);
    const disclaimer = '\n\n⚠️ 以上是網路搜尋結果，未經驗證。不要直接當事實，要交叉比對多個來源再下結論。';
    return { ok: true, output: (output || '沒有搜尋結果') + disclaimer };
  } catch (e) {
    return { ok: false, output: `web_search 失敗: ${(e as Error).message}` };
  }
}

/** 抓取網頁內容 — 封鎖內網，純文字截斷 4000 字 */
/** 真正的瀏覽器渲染（playwright）— 看得到 JS 動態頁面 */
async function handleWebBrowse(url: string): Promise<ActionResult> {
  if (!url) return { ok: false, output: 'web_browse 需要 url 參數' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, output: '只允許 http/https URL' };
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url))
    return { ok: false, output: '🚫 不允許存取內網地址' };

  try {
    const { browserService } = await import('../services/BrowserService.js');
    if (!browserService.isAvailable()) {
      return { ok: false, output: 'playwright 未安裝，請先執行: cd server && npm install playwright && npx playwright install chromium' };
    }
    const result = await browserService.browse(url);
    const output = `[web_browse] ${result.title}\nURL: ${result.url}\n${'─'.repeat(40)}\n${result.text}`;
    log.info(`[WebBrowse] ${url} → title="${result.title}" textLen=${result.text.length}${result.truncated ? ' (截斷)' : ''}`);
    return { ok: true, output };
  } catch (e) {
    log.error({ err: e }, `[WebBrowse] 失敗 url=${url}`);
    return { ok: false, output: `web_browse 失敗: ${(e as Error).message}` };
  }
}

async function handleWebFetch(url: string): Promise<ActionResult> {
  if (!url) return { ok: false, output: 'web_fetch 需要 url 參數' };

  if (!/^https?:\/\//i.test(url)) return { ok: false, output: '只允許 http/https URL' };
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url))
    return { ok: false, output: '🚫 不允許存取內網地址' };

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'OpenClaw-NEUXA/1.0' },
    });
    if (!resp.ok) return { ok: false, output: `抓取失敗: HTTP ${resp.status}` };

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/') && !contentType.includes('application/json'))
      return { ok: false, output: `不支援的內容類型: ${contentType}` };

    let text = await resp.text();
    if (contentType.includes('html')) {
      text = text
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const trimmed = text.slice(0, 4000);
    log.info(`[WebFetch] ${url} → ${resp.status} (${text.length} chars)`);
    return { ok: true, output: trimmed + (text.length > 4000 ? '\n...(截斷)' : '') };
  } catch (e) {
    return { ok: false, output: `web_fetch 失敗: ${(e as Error).message}` };
  }
}

// ── 沙盒代碼執行 ──

/** 安全沙盒執行 JS/TS 代碼片段（學習用途） */
async function handleCodeEval(code: string): Promise<ActionResult> {
  if (!code.trim()) {
    return { ok: false, output: 'code_eval 需要 code 參數' };
  }

  // 安全限制
  const forbidden = [
    /require\s*\(/i, /import\s+/i, /process\./i, /child_process/i,
    /fs\./i, /path\./i, /http\./i, /net\./i, /eval\s*\(/i,
    /Function\s*\(/i, /global\./i, /globalThis/i,
  ];

  const blocked = forbidden.find(p => p.test(code));
  if (blocked) {
    return { ok: false, output: `🛑 代碼包含禁止的 API（${blocked.source}）。code_eval 只能用純 JS 邏輯（變數、函數、迴圈、陣列操作等）。` };
  }

  // 限制代碼長度
  if (code.length > 5000) {
    return { ok: false, output: '🛑 代碼超過 5000 字元限制。' };
  }

  try {
    // 用 vm 模組在沙盒中執行
    const { createContext, runInNewContext } = await import('node:vm');

    const outputs: string[] = [];
    const sandbox = {
      console: {
        log: (...args: unknown[]) => { outputs.push(args.map(String).join(' ')); },
        error: (...args: unknown[]) => { outputs.push('[ERROR] ' + args.map(String).join(' ')); },
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
      RegExp,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    const ctx = createContext(sandbox);

    const result = runInNewContext(code, ctx, {
      timeout: 5000,  // 5 秒 timeout
      displayErrors: true,
    });

    if (result !== undefined) {
      outputs.push(`→ ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`);
    }

    const output = outputs.length > 0 ? outputs.join('\n') : '(無輸出)';
    return { ok: true, output: output.slice(0, 3000) };  // 限制輸出長度
  } catch (err: unknown) {
    return { ok: false, output: `執行錯誤: ${(err as Error).message}\n💡 Tip：code_eval 只支持純 JS 邏輯，不能用 require/import/fetch。需要跑腳本請用 run_script: node -e "..."` };
  }
}

/** 分析 workspace 內的代碼文件 */
async function handleAnalyzeCode(filePath: string, question: string): Promise<ActionResult> {
  const workspace = process.env.NEUXA_WORKSPACE || path.join(process.env.HOME || '', '.openclaw', 'workspace');
  const fullPath = path.resolve(workspace, filePath);
  if (!fullPath.startsWith(workspace)) {
    return { ok: false, output: '❌ 只能分析 workspace 目錄內的文件' };
  }

  try {
    const content = await fs.promises.readFile(fullPath, 'utf-8');
    if (content.length > 10000) {
      return { ok: true, output: `📄 文件 ${filePath} 共 ${content.length} 字，太長了。請指定要分析的區段（用 read_file 先看結構）。` };
    }
    const lines = content.split('\n');
    const summary = [
      `📄 **${filePath}**`,
      `行數：${lines.length}`,
      `大小：${content.length} 字元`,
      '',
      '```',
      content.substring(0, 3000),
      content.length > 3000 ? '\n... (截斷)' : '',
      '```',
      '',
      question ? `分析問題：${question}` : '請根據內容進行分析。',
    ].join('\n');
    return { ok: true, output: summary };
  } catch (e: unknown) {
    return { ok: false, output: `❌ 無法讀取 ${filePath}：${(e as Error).message}` };
  }
}

// ── grep_project & find_symbol ──

/** 允許搜尋的目錄白名單 */
const GREP_ALLOWED_DIRS = [
  `${PROJECT_ROOT}/server/src/`,
  `${PROJECT_ROOT}/src/`,
  `${PROJECT_ROOT}/cookbook/`,
  `${PROJECT_ROOT}/scripts/`,
  path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace'),
];

/** 路徑安全檢查：只擋系統目錄，其他全放行 */
function isGrepPathSafe(targetPath: string): { safe: boolean; resolved: string; reason?: string } {
  const resolved = path.resolve(targetPath);
  const forbidden = ['/etc', '/var', '/usr', '/bin', '/sbin', '/System', '/Library', '/private'];
  for (const f of forbidden) {
    if (resolved.startsWith(f)) {
      return { safe: false, resolved, reason: `禁止搜尋系統目錄: ${f}` };
    }
  }
  if (!fs.existsSync(resolved)) {
    return { safe: false, resolved, reason: `目錄不存在: ${resolved}` };
  }
  return { safe: true, resolved };
}

/** 截斷過長的行 */
function truncateLine(line: string, max: number): string {
  return line.length > max ? line.slice(0, max) + '...' : line;
}

/** grep_project: 在專案目錄中搜尋文字模式 */
async function handleGrepProject(
  pattern: string,
  searchPath?: string,
  options?: { ignore_case?: boolean; max_results?: number; file_pattern?: string }
): Promise<ActionResult> {
  if (!pattern || pattern.trim().length < 2) {
    return { ok: false, output: 'grep_project 需要 pattern 參數（至少 2 個字）' };
  }

  let targetDir = searchPath || `${PROJECT_ROOT}/server/src/`;
  // 自動修正：相對路徑 → 嘗試 PROJECT_ROOT 拼接
  if (searchPath && !searchPath.startsWith('/')) {
    const candidate = `${PROJECT_ROOT}/${searchPath}`;
    if (fs.existsSync(candidate)) {
      targetDir = candidate;
    }
  }
  const pathCheck = isGrepPathSafe(targetDir);
  if (!pathCheck.safe) return { ok: false, output: `🚫 ${pathCheck.reason}` };

  const ignoreCase = options?.ignore_case ?? false;
  const maxResults = Math.min(Math.max(options?.max_results ?? 20, 1), 50);
  const filePattern = options?.file_pattern || '';

  // 優先用 rg（ripgrep），fallback grep -rn
  let useRg = false;
  try {
    execSync('which rg', { stdio: 'pipe', timeout: 3000 });
    useRg = true;
  } catch { /* rg 不存在，用 grep */ }

  let cmd: string;
  const safePattern = pattern.replace(/'/g, "'\\''");

  if (useRg) {
    const flags = ['-n', '--no-heading', '--color=never', `--max-count=${maxResults * 2}`];
    if (ignoreCase) flags.push('-i');
    if (filePattern) flags.push(`--glob='${filePattern}'`);
    cmd = `rg ${flags.join(' ')} '${safePattern}' '${pathCheck.resolved}'`;
  } else {
    const flags = ['-rn', '--color=never'];
    if (ignoreCase) flags.push('-i');
    if (filePattern) flags.push(`--include='${filePattern}'`);
    cmd = `grep ${flags.join(' ')} '${safePattern}' '${pathCheck.resolved}'`;
  }

  try {
    const raw = String(execSync(cmd, {
      timeout: 10000,
      maxBuffer: 1024 * 512,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }));

    const lines = raw.trim().split('\n').filter(Boolean);
    const trimmed = lines.slice(0, maxResults).map((l: string) => truncateLine(l, 200));
    const total = lines.length;
    const shown = trimmed.length;

    const header = `🔍 grep_project「${pattern}」in ${targetDir}\n找到 ${total} 筆${total > shown ? `，顯示前 ${shown} 筆` : ''}：\n`;
    return { ok: true, output: header + trimmed.join('\n') };
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: string; stderr?: string; message?: string };
    if (err.status === 1) {
      return { ok: true, output: `🔍 grep_project「${pattern}」in ${targetDir}\n沒有匹配結果。` };
    }
    if (err.message?.includes('TIMEOUT') || err.message?.includes('timed out')) {
      return { ok: false, output: `grep_project 超時 (10s)。嘗試縮小搜尋範圍或更精確的 pattern。` };
    }
    return { ok: false, output: `grep_project 失敗: ${err.stderr || err.message || '未知錯誤'}` };
  }
}

/** find_symbol: 搜尋函數/類別/介面/型別定義與引用 */
async function handleFindSymbol(
  symbol: string,
  symbolType?: string
): Promise<ActionResult> {
  if (!symbol || symbol.trim().length < 2) {
    return { ok: false, output: 'find_symbol 需要 symbol 參數（至少 2 個字）' };
  }

  const searchDirs = [
    `${PROJECT_ROOT}/server/src/`,
    `${PROJECT_ROOT}/src/`,
  ];

  const safeSymbol = symbol.replace(/'/g, "'\\''").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const defPatterns: string[] = [];
  const t = (symbolType || '').toLowerCase();

  if (!t || t === 'function') {
    defPatterns.push(`(function|const|let|var)\\s+${safeSymbol}\\s*[=(]`);
    defPatterns.push(`async\\s+function\\s+${safeSymbol}`);
    defPatterns.push(`${safeSymbol}\\s*:\\s*\\(`);
  }
  if (!t || t === 'class') {
    defPatterns.push(`class\\s+${safeSymbol}`);
  }
  if (!t || t === 'interface') {
    defPatterns.push(`interface\\s+${safeSymbol}`);
  }
  if (!t || t === 'type') {
    defPatterns.push(`type\\s+${safeSymbol}\\s*[=<]`);
  }
  defPatterns.push(`export\\s+(default\\s+)?(function|class|interface|type|const|let|var|async)\\s+${safeSymbol}`);

  const refPattern = safeSymbol;

  let useRg = false;
  try {
    execSync('which rg', { stdio: 'pipe', timeout: 3000 });
    useRg = true;
  } catch { /* fallback grep */ }

  const definitions: string[] = [];
  const references: string[] = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    for (const pat of defPatterns) {
      const cmd = useRg
        ? `rg -n --no-heading --color=never --glob='*.{ts,tsx,js,jsx}' '${pat}' '${dir}'`
        : `grep -rn --color=never --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -E '${pat}' '${dir}'`;
      try {
        const raw = String(execSync(cmd, { timeout: 10000, maxBuffer: 256 * 1024, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
        const lines = raw.trim().split('\n').filter(Boolean);
        for (const l of lines) {
          const truncated = truncateLine(l, 200);
          if (!definitions.includes(truncated)) definitions.push(truncated);
        }
      } catch { /* exit 1 = no match */ }
    }

    const refCmd = useRg
      ? `rg -n --no-heading --color=never --glob='*.{ts,tsx,js,jsx}' '${refPattern}' '${dir}'`
      : `grep -rn --color=never --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' '${refPattern}' '${dir}'`;
    try {
      const raw = String(execSync(refCmd, { timeout: 10000, maxBuffer: 256 * 1024, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
      const lines = raw.trim().split('\n').filter(Boolean);
      for (const l of lines) {
        const truncated = truncateLine(l, 200);
        if (!definitions.includes(truncated) && !references.includes(truncated)) {
          references.push(truncated);
        }
      }
    } catch { /* exit 1 = no match */ }
  }

  const defSlice = definitions.slice(0, 15);
  const refSlice = references.slice(0, 30);

  if (defSlice.length === 0 && refSlice.length === 0) {
    return { ok: true, output: `🔍 find_symbol「${symbol}」${t ? `(type: ${t})` : ''}\n找不到任何定義或引用。確認名稱是否正確。` };
  }

  const parts: string[] = [`🔍 find_symbol「${symbol}」${t ? `(type: ${t})` : ''}\n`];

  if (defSlice.length > 0) {
    parts.push(`📌 定義 (${defSlice.length}${definitions.length > 15 ? `/${definitions.length}` : ''})：`);
    parts.push(defSlice.join('\n'));
  } else {
    parts.push('📌 定義：找不到明確的定義位置');
  }

  parts.push('');

  if (refSlice.length > 0) {
    parts.push(`📎 引用 (${refSlice.length}${references.length > 30 ? `/${references.length}` : ''})：`);
    parts.push(refSlice.join('\n'));
  } else {
    parts.push('📎 引用：無其他引用');
  }

  return { ok: true, output: parts.join('\n') };
}

// ── AST 語法樹分析 ──

/**
 * analyze_symbol: 用 TypeScript compiler API 做真正的 AST 分析
 * 能找到函式簽名、型別、繼承鏈、跨檔案引用圖
 */
async function handleAnalyzeSymbol(symbol: string, filePath?: string): Promise<ActionResult> {
  if (!symbol || symbol.trim().length < 2) {
    return { ok: false, output: 'analyze_symbol 需要 symbol 參數' };
  }

  try {
    const ts = await import('typescript');
    const searchRoots = filePath
      ? [path.resolve(PROJECT_ROOT, filePath)]
      : [
          path.join(PROJECT_ROOT, 'server', 'src'),
          path.join(PROJECT_ROOT, 'src'),
        ];

    // 收集所有 .ts/.tsx 檔案
    function collectTsFiles(dir: string): string[] {
      if (!fs.existsSync(dir)) return [];
      const results: string[] = [];
      const walk = (d: string) => {
        try {
          for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
              walk(full);
            } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
              results.push(full);
            }
          }
        } catch { /* skip inaccessible dirs */ }
      };
      if (fs.statSync(dir).isFile()) return [dir];
      walk(dir);
      return results;
    }

    const allFiles: string[] = [];
    for (const root of searchRoots) allFiles.push(...collectTsFiles(root));

    if (allFiles.length === 0) {
      return { ok: false, output: `analyze_symbol: 找不到 TypeScript 檔案在 ${searchRoots.join(', ')}` };
    }

    // 建立 TypeScript program（不做型別檢查，只做 AST 解析）
    const program = ts.createProgram(allFiles, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      noEmit: true,
      skipLibCheck: true,
    });

    const definitions: string[] = [];
    const references: string[] = [];
    const signatureInfo: string[] = [];

    for (const sourceFile of program.getSourceFiles()) {
      if (sourceFile.fileName.includes('node_modules')) continue;

      const checker = program.getTypeChecker();
      const relPath = path.relative(PROJECT_ROOT, sourceFile.fileName);

      // 遍歷 AST 節點
      function visit(node: import('typescript').Node) {
        // 定義偵測
        const isNamedDecl = (
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isVariableDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isPropertyDeclaration(node)
        );

        if (isNamedDecl) {
          const name = (node as { name?: { getText(): string } }).name?.getText();
          if (name === symbol) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const preview = node.getText().slice(0, 200).replace(/\n/g, ' ');

            // 取型別資訊
            let typeInfo = '';
            try {
              if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
                const sig = checker.getSignatureFromDeclaration(node as import('typescript').SignatureDeclaration);
                if (sig) {
                  const params = sig.parameters.map(p => {
                    const t = checker.typeToString(checker.getTypeOfSymbolAtLocation(p, node));
                    return `${p.name}: ${t}`;
                  }).join(', ');
                  const ret = checker.typeToString(sig.getReturnType());
                  typeInfo = ` | (${params}) => ${ret}`;
                }
              } else if (ts.isVariableDeclaration(node) && (node as import('typescript').VariableDeclaration).initializer) {
                const t = checker.getTypeAtLocation(node);
                typeInfo = ` | type: ${checker.typeToString(t)}`;
              } else if (ts.isClassDeclaration(node)) {
                const heritage = (node as import('typescript').ClassDeclaration).heritageClauses
                  ?.map(h => h.getText())
                  .join(' ') || '';
                if (heritage) typeInfo = ` | ${heritage}`;
              }
            } catch { /* 型別分析失敗不阻塞 */ }

            const entry = `${relPath}:${line + 1}${typeInfo}\n  ${preview}`;
            if (!definitions.includes(entry)) {
              definitions.push(entry);
              if (typeInfo) signatureInfo.push(`📐 ${symbol}${typeInfo}`);
            }
          }
        }

        // 引用偵測（識別符使用）
        if (ts.isIdentifier(node) && node.getText() === symbol) {
          const parent = node.parent;
          // 跳過自身定義
          const isDefNode = parent && (
            ts.isFunctionDeclaration(parent) ||
            ts.isClassDeclaration(parent) ||
            ts.isInterfaceDeclaration(parent) ||
            ts.isTypeAliasDeclaration(parent) ||
            ts.isVariableDeclaration(parent as import('typescript').Node)
          ) && (parent as { name?: import('typescript').Node }).name === node;

          if (!isDefNode) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const lineText = sourceFile.text.split('\n')[line]?.trim().slice(0, 120) || '';
            const entry = `${relPath}:${line + 1}  ${lineText}`;
            if (!references.includes(entry) && references.length < 30) {
              references.push(entry);
            }
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
    }

    const parts: string[] = [`🔬 analyze_symbol「${symbol}」（AST 語法樹分析）\n`];

    if (signatureInfo.length > 0) {
      parts.push('📐 型別簽名：');
      parts.push([...new Set(signatureInfo)].join('\n'));
      parts.push('');
    }

    if (definitions.length > 0) {
      parts.push(`📌 定義 (${definitions.length})：`);
      parts.push(definitions.slice(0, 5).join('\n\n'));
    } else {
      parts.push('📌 定義：找不到（可能是外部套件或型別推斷）');
    }

    parts.push('');

    if (references.length > 0) {
      parts.push(`📎 跨檔引用 (${references.length})：`);
      parts.push(references.slice(0, 20).join('\n'));
    } else {
      parts.push('📎 引用：此 symbol 無其他引用（或只在定義檔內）');
    }

    parts.push(`\n掃描檔案數：${allFiles.length}`);

    return { ok: true, output: parts.join('\n') };
  } catch (e) {
    log.error({ err: e }, '[AnalyzeSymbol] AST 分析失敗');
    return { ok: false, output: `analyze_symbol 失敗: ${(e as Error).message}` };
  }
}

// ── 精準修補檔案 ──

/** 禁止 patch 的檔案名（靈魂文件） */
const PATCH_FORBIDDEN_NAMES = new Set([
  'SOUL.md', 'AWAKENING.md', 'IDENTITY.md',
]);

/** patch_file 允許的根目錄白名單 */
const PATCH_ALLOWED_ROOTS = [
  path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace'),
  PROJECT_ROOT,
];

/** 檢查 patch_file 路徑安全性 */
function isPatchPathSafe(rawPath: string): { safe: boolean; resolved: string; reason?: string } {
  let expanded = rawPath;
  if (expanded.startsWith('~/') || expanded === '~') {
    expanded = path.join(process.env.HOME || '/tmp', expanded.slice(1));
  }
  const resolved = path.resolve(expanded);
  const basename = path.basename(resolved);

  if (PATCH_FORBIDDEN_NAMES.has(basename)) {
    return { safe: false, resolved, reason: `禁止修改靈魂文件 "${basename}"` };
  }

  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (resolved.toLowerCase().includes(pattern.toLowerCase())) {
      return { safe: false, resolved, reason: `禁止修改包含 "${pattern}" 的檔案` };
    }
  }

  // 禁止修改 server 源碼目錄 — 但放行 crew-bots/（小蔡可自行優化星群）
  if (resolved.includes('/server/src/') || resolved.includes('/server/dist/')) {
    if (resolved.includes('/server/src/telegram/crew-bots/')) {
      // 放行 crew-bots/ 子目錄
    } else {
      return { safe: false, resolved, reason: '🛑 禁止修改 server 源碼目錄，只有老蔡能改（crew-bots/ 除外）' };
    }
  }

  // 只擋系統目錄，其他全放行（靈魂文件已在上面攔截）
  const sysDir = ['/etc', '/var', '/usr', '/bin', '/sbin', '/System', '/Library', '/private'];
  if (sysDir.some(d => resolved.startsWith(d))) {
    return { safe: false, resolved, reason: `禁止修改系統目錄` };
  }

  return { safe: true, resolved };
}

/**
 * patch_file — 精準修補檔案（替換 / 插入 / 刪行）
 *
 * 三種模式：
 * 1. replace:      { path, line, old, new }
 * 2. insert_after: { path, line, insert_after }
 * 3. delete_lines: { path, from_line, to_line }
 */
export async function handlePatchFile(action: Record<string, string>): Promise<ActionResult> {
  const rawPath = action.path;
  if (!rawPath) return { ok: false, output: 'patch_file 需要 path 參數' };

  const check = isPatchPathSafe(rawPath);
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };
  const resolved = check.resolved;

  if (!fs.existsSync(resolved)) return { ok: false, output: `檔案不存在: ${resolved}` };
  if (fs.statSync(resolved).isDirectory()) return { ok: false, output: `這是目錄，不是檔案` };

  const original = fs.readFileSync(resolved, 'utf8');
  const lines = original.split('\n');

  const hasOld = 'old' in action && 'new' in action;
  const hasInsert = 'insert_after' in action;
  const hasDelete = 'from_line' in action && 'to_line' in action;

  let newLines: string[];
  let diffSummary: string;

  if (hasDelete) {
    // ── 模式 3: delete_lines ──
    const fromLine = parseInt(action.from_line, 10);
    const toLine = parseInt(action.to_line, 10);
    if (isNaN(fromLine) || isNaN(toLine) || fromLine < 1 || toLine < fromLine) {
      return { ok: false, output: `from_line / to_line 無效（需要 1 <= from_line <= to_line）` };
    }
    if (toLine > lines.length) {
      return { ok: false, output: `to_line(${toLine}) 超過檔案行數(${lines.length})` };
    }
    const deleteCount = toLine - fromLine + 1;
    if (deleteCount > 50) {
      return { ok: false, output: `單次最多刪除 50 行，要求刪除 ${deleteCount} 行` };
    }

    const deleted = lines.slice(fromLine - 1, toLine);
    newLines = [...lines.slice(0, fromLine - 1), ...lines.slice(toLine)];
    diffSummary = `刪除 L${fromLine}-L${toLine} (${deleteCount} 行):\n` +
      deleted.map((l, i) => `  - L${fromLine + i}: ${l.slice(0, 80)}`).join('\n');

  } else if (hasInsert) {
    // ── 模式 2: insert_after ──
    const lineNum = parseInt(action.line, 10);
    if (isNaN(lineNum) || lineNum < 0 || lineNum > lines.length) {
      return { ok: false, output: `line 無效（0 = 檔案開頭插入, 1-${lines.length} = 在該行之後插入）` };
    }
    const insertContent = action.insert_after;
    const insertLines = insertContent.split('\n');
    if (insertLines.length > 50) {
      return { ok: false, output: `單次最多插入 50 行，要求插入 ${insertLines.length} 行` };
    }

    newLines = [...lines.slice(0, lineNum), ...insertLines, ...lines.slice(lineNum)];
    diffSummary = `在 L${lineNum} 之後插入 ${insertLines.length} 行:\n` +
      insertLines.slice(0, 5).map(l => `  + ${l.slice(0, 80)}`).join('\n') +
      (insertLines.length > 5 ? `\n  ... 還有 ${insertLines.length - 5} 行` : '');

  } else if (hasOld) {
    // ── 模式 1: replace (old -> new) ──
    const lineNum = parseInt(action.line, 10);
    if (isNaN(lineNum) || lineNum < 1 || lineNum > lines.length) {
      return { ok: false, output: `line 無效（需要 1-${lines.length}）` };
    }

    const oldText = action.old;
    const newText = action.new;
    const oldLines = oldText.split('\n');
    const newTextLines = newText.split('\n');
    if (oldLines.length > 50 || newTextLines.length > 50) {
      return { ok: false, output: `單次修改不超過 50 行（old: ${oldLines.length}, new: ${newTextLines.length}）` };
    }

    const endLine = lineNum - 1 + oldLines.length;
    if (endLine > lines.length) {
      return { ok: false, output: `old 文字 (${oldLines.length} 行) 超過檔案範圍 (從 L${lineNum})` };
    }
    const actual = lines.slice(lineNum - 1, endLine);
    const matches = oldLines.every((ol, i) => actual[i]?.includes(ol) || actual[i]?.trim() === ol.trim());
    if (!matches) {
      const preview = actual.slice(0, 3).map((l, i) => `  L${lineNum + i}: ${l.slice(0, 80)}`).join('\n');
      return { ok: false, output: `old 文字不匹配。L${lineNum} 實際內容:\n${preview}` };
    }

    newLines = [
      ...lines.slice(0, lineNum - 1),
      ...newTextLines,
      ...lines.slice(endLine),
    ];
    diffSummary = `替換 L${lineNum}${oldLines.length > 1 ? `-L${endLine}` : ''} (${oldLines.length} -> ${newTextLines.length} 行):\n` +
      oldLines.slice(0, 3).map(l => `  - ${l.slice(0, 80)}`).join('\n') + '\n' +
      newTextLines.slice(0, 3).map(l => `  + ${l.slice(0, 80)}`).join('\n') +
      (oldLines.length > 3 ? `\n  ... (還有更多行)` : '');

  } else {
    return { ok: false, output: 'patch_file 需要指定模式: (old+new), (insert_after), 或 (from_line+to_line)' };
  }

  // 備份原檔
  try {
    fs.copyFileSync(resolved, resolved + '.bak');
  } catch (e) {
    return { ok: false, output: `備份失敗: ${(e as Error).message}` };
  }

  // 寫入修改
  try {
    fs.writeFileSync(resolved, newLines.join('\n'), 'utf8');
    const linesDelta = newLines.length - lines.length;
    const deltaStr = linesDelta > 0 ? `+${linesDelta}` : linesDelta === 0 ? '+-0' : `${linesDelta}`;
    log.info(`[NEUXA-PatchFile] ${resolved} (${deltaStr} lines)`);
    return {
      ok: true,
      output: `已修補 ${path.basename(resolved)} (${lines.length} -> ${newLines.length} 行, ${deltaStr})\n` +
        `備份: ${path.basename(resolved)}.bak\n\n` +
        `Diff:\n${diffSummary}`,
    };
  } catch (e) {
    try { fs.copyFileSync(resolved + '.bak', resolved); } catch { /* best effort */ }
    return { ok: false, output: `寫入失敗: ${(e as Error).message}（已嘗試恢復備份）` };
  }
}

// ── 任務拆解器（plan_project）──

/** plan_project: 用 Gemini 拆解目標 → 子任務陣列 → 批次建入任務板 */
async function handlePlanProject(action: Record<string, string>): Promise<ActionResult> {
  const goal = (action.goal || '').trim();
  if (!goal) return { ok: false, output: 'plan_project 需要 goal 參數（要做什麼）' };
  if (goal.length > 500) return { ok: false, output: 'goal 太長，上限 500 字' };

  const weeks = Math.min(Math.max(parseInt(action.weeks || '4', 10) || 4, 1), 52);
  const detailLevel = ['low', 'medium', 'high'].includes(action.detail_level) ? action.detail_level : 'medium';

  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!googleKey) return { ok: false, output: 'plan_project 需要 GOOGLE_API_KEY' };

  const geminiPrompt = `你是專案規劃專家。請把以下目標拆成可執行的子任務。

目標：${goal}
時間：${weeks} 週
細節程度：${detailLevel}（low=3-5個大任務, medium=6-10個, high=10-15個）

回傳純 JSON 陣列（不要 markdown code block），每個元素：
{
  "name": "子任務名稱（30字以內）",
  "description": "具體描述做什麼、怎麼驗收",
  "priority": 1到5（5最高）,
  "estimated_effort": "small|medium|large",
  "dependencies": ["前置任務名稱（沒有就空陣列）"],
  "week": 幾（1-${weeks}）
}

要求：
- 最多 15 個子任務
- 任務要具體可執行，不是空泛口號
- 依賴關係要合理（前面的任務先完成才能做後面的）
- 均勻分配到各週
- 只回傳 JSON 陣列，不要其他文字`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: geminiPrompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      return { ok: false, output: `Gemini 呼叫失敗: HTTP ${resp.status} ${errText.slice(0, 200)}` };
    }

    const data = await resp.json() as Record<string, unknown>;
    const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
    const contentObj = ((candidates[0] || {}) as Record<string, unknown>).content as Record<string, unknown> || {};
    const parts = (contentObj.parts || []) as Array<Record<string, unknown>>;
    const rawText = parts.map(p => (p.text as string) || '').join('').trim();

    if (!rawText) return { ok: false, output: 'Gemini 回傳空結果' };

    // 解析 JSON（處理 markdown code block 包裹）
    let jsonStr = rawText;
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();

    let tasks: Array<{
      name: string;
      description: string;
      priority: number;
      estimated_effort: string;
      dependencies: string[];
      week: number;
    }>;

    try {
      tasks = JSON.parse(jsonStr);
    } catch {
      return { ok: false, output: `JSON 解析失敗。Gemini 原始回傳:\n${rawText.slice(0, 500)}` };
    }

    if (!Array.isArray(tasks)) {
      return { ok: false, output: 'Gemini 回傳不是陣列格式' };
    }

    tasks = tasks.slice(0, 15);

    const created: string[] = [];
    const failed: string[] = [];
    for (const t of tasks) {
      const taskName = String(t.name || '').slice(0, 100);
      if (!taskName) continue;
      const desc = [
        String(t.description || ''),
        `預估工時: ${t.estimated_effort || 'medium'}`,
        `優先級: ${t.priority || 3}/5`,
        `週次: W${t.week || 1}/${weeks}`,
        t.dependencies?.length ? `前置任務: ${t.dependencies.join(', ')}` : '',
        `來源: plan_project → ${goal.slice(0, 50)}`,
      ].filter(Boolean).join('\n');

      const result = await createTask(taskName, desc, '小蔡');
      if (result.includes('已建立')) {
        created.push(`W${t.week || 1} [${t.estimated_effort || 'M'}] ${taskName}`);
      } else {
        failed.push(`${taskName}: ${result}`);
      }
    }

    const effortMap: Record<string, number> = { small: 1, medium: 2, large: 4 };
    const totalEffort = tasks.reduce((sum, t) => sum + (effortMap[t.estimated_effort] || 2), 0);
    const weeklyBreakdown: Record<number, string[]> = {};
    for (const t of tasks) {
      const w = t.week || 1;
      if (!weeklyBreakdown[w]) weeklyBreakdown[w] = [];
      weeklyBreakdown[w].push(t.name);
    }

    const summary = [
      `計畫拆解完成：「${goal}」`,
      `總共 ${tasks.length} 個子任務，${weeks} 週，預估 ${totalEffort} 人天`,
      '',
      '--- 週次分配 ---',
      ...Object.entries(weeklyBreakdown).sort(([a], [b]) => Number(a) - Number(b)).map(
        ([w, names]) => `W${w}: ${names.join(' / ')}`
      ),
      '',
      `已建立 ${created.length} 個任務（draft 狀態，等老蔡批准）`,
      ...(failed.length > 0 ? [`建立失敗 ${failed.length} 個:\n${failed.join('\n')}`] : []),
      '',
      '--- 依賴關係 ---',
      ...tasks.filter(t => t.dependencies?.length > 0).map(
        t => `${t.name} ← 需要先完成: ${t.dependencies.join(', ')}`
      ),
    ];

    log.info(`[PlanProject] goal="${goal.slice(0, 50)}" → ${created.length}/${tasks.length} tasks created`);
    return { ok: true, output: summary.join('\n') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: `plan_project 失敗: ${msg}` };
  }
}

// ── 路線圖管理（roadmap）──

const ROADMAPS_DIR = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'roadmaps');

function isRoadmapNameSafe(name: string): { safe: boolean; reason?: string } {
  if (!name || name.trim().length === 0) return { safe: false, reason: '名稱不能為空' };
  if (name.length > 60) return { safe: false, reason: '名稱太長，上限 60 字' };
  if (/[/\\.]\./.test(name) || name.includes('..')) return { safe: false, reason: '名稱不能包含 / \\ 或 ..' };
  if (/[<>:"|?*]/.test(name)) return { safe: false, reason: '名稱包含非法字元' };
  return { safe: true };
}

async function handleRoadmap(action: Record<string, string>): Promise<ActionResult> {
  const mode = (action.mode || '').toLowerCase();
  if (!['create', 'status', 'update', 'list'].includes(mode)) {
    return { ok: false, output: 'roadmap 需要 mode 參數: create / status / update / list' };
  }

  fs.mkdirSync(ROADMAPS_DIR, { recursive: true });

  if (mode === 'list') return handleRoadmapList();

  const name = (action.name || '').trim();
  const nameCheck = isRoadmapNameSafe(name);
  if (!nameCheck.safe) return { ok: false, output: `路線圖名稱無效: ${nameCheck.reason}` };

  switch (mode) {
    case 'create': return handleRoadmapCreate(name, action);
    case 'status': return handleRoadmapStatus(name);
    case 'update': return handleRoadmapUpdate(name, action);
    default: return { ok: false, output: `未知 roadmap mode: ${mode}` };
  }
}

function handleRoadmapCreate(name: string, action: Record<string, string>): ActionResult {
  const filePath = path.join(ROADMAPS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    return { ok: false, output: `路線圖「${name}」已存在。用 mode=status 查看，或用 mode=update 更新。` };
  }
  const totalWeeks = Math.min(Math.max(parseInt(action.weeks || '4', 10) || 4, 1), 12);
  let milestones: string[] = [];
  try {
    const raw = action.milestones;
    if (raw) {
      if (typeof raw === 'string') milestones = JSON.parse(raw);
      else if (Array.isArray(raw)) milestones = (raw as string[]).map(String);
    }
  } catch { milestones = []; }
  if (milestones.length === 0) milestones = ['MVP', '上線'];

  const milestoneSchedule: Array<{ name: string; week: number; done: boolean }> = [];
  for (let i = 0; i < milestones.length; i++) {
    const week = Math.max(1, Math.round(((i + 1) / milestones.length) * totalWeeks));
    milestoneSchedule.push({ name: milestones[i], week, done: false });
  }
  const weeklyGoals: Record<string, { goal: string; tasks: string[] }> = {};
  for (let w = 1; w <= totalWeeks; w++) weeklyGoals[`W${w}`] = { goal: '', tasks: [] };

  const rmObj = { name, createdAt: new Date().toISOString(), totalWeeks, currentWeek: 1, milestones: milestoneSchedule, weeklyGoals };
  fs.writeFileSync(filePath, JSON.stringify(rmObj, null, 2), 'utf8');
  const msSummary = milestoneSchedule.map(m => `W${m.week}: ${m.name}`).join(' → ');
  log.info(`[Roadmap] created "${name}" ${totalWeeks}w milestones=${milestones.length}`);
  return { ok: true, output: `路線圖「${name}」已建立\n總共 ${totalWeeks} 週\n里程碑: ${msSummary}\n檔案: ${filePath}\n下一步: 用 mode=update 設定每週目標，或 plan_project 拆子任務。` };
}

async function handleRoadmapStatus(name: string): Promise<ActionResult> {
  const filePath = path.join(ROADMAPS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, output: `路線圖「${name}」不存在。用 mode=list 看有哪些。` };

  let rm: { name: string; createdAt: string; totalWeeks: number; currentWeek: number; milestones: Array<{ name: string; week: number; done: boolean }>; weeklyGoals: Record<string, { goal: string; tasks: string[] }> };
  try { rm = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return { ok: false, output: `路線圖 JSON 解析失敗: ${filePath}` }; }

  let taskDoneCount = 0; let taskTotalCount = 0;
  const allTaskIds: string[] = [];
  for (const wg of Object.values(rm.weeklyGoals)) { if (wg.tasks) allTaskIds.push(...wg.tasks); }
  if (allTaskIds.length > 0) {
    try {
      const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?limit=100`, { headers: { Authorization: `Bearer ${OPENCLAW_API_KEY}` }, signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const allTasks = (await r.json()) as Array<Record<string, unknown>>;
        for (const tid of allTaskIds) { const task = allTasks.find(t => String(t.id || '').startsWith(tid)); if (task) { taskTotalCount++; if (task.status === 'done') taskDoneCount++; } }
      }
    } catch { /* ignore */ }
  }

  const totalMs = rm.milestones.length;
  const doneMs = rm.milestones.filter(m => m.done).length;
  const nextMs = rm.milestones.find(m => !m.done);
  const rate = taskTotalCount > 0 ? Math.round((taskDoneCount / taskTotalCount) * 100) : 0;
  const riskItems = rm.milestones.filter(m => !m.done && m.week <= rm.currentWeek);
  const cwg = rm.weeklyGoals[`W${rm.currentWeek}`];

  const lines = [
    `路線圖「${rm.name}」狀態`, `建立: ${rm.createdAt.split('T')[0]}`, `進度: W${rm.currentWeek}/${rm.totalWeeks}`,
    `里程碑: ${doneMs}/${totalMs} 完成`, `任務完成率: ${taskDoneCount}/${taskTotalCount} (${rate}%)`,
    '', '--- 里程碑 ---', ...rm.milestones.map(m => `${m.done ? '[v]' : '[ ]'} W${m.week}: ${m.name}`),
    '', `本週目標 (W${rm.currentWeek}): ${cwg?.goal || '（未設定）'}`, `本週任務: ${cwg?.tasks?.length || 0} 個`,
    ...(nextMs ? [`下一里程碑: W${nextMs.week} ${nextMs.name}`] : []),
    ...(riskItems.length > 0 ? ['', '--- 風險 ---', ...riskItems.map(ri => `已逾期: W${ri.week} ${ri.name}`)] : []),
  ];
  return { ok: true, output: lines.join('\n') };
}

function handleRoadmapUpdate(name: string, action: Record<string, string>): ActionResult {
  const filePath = path.join(ROADMAPS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) return { ok: false, output: `路線圖「${name}」不存在。` };

  let rm: { name: string; createdAt: string; totalWeeks: number; currentWeek: number; milestones: Array<{ name: string; week: number; done: boolean }>; weeklyGoals: Record<string, { goal: string; tasks: string[] }> };
  try { rm = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return { ok: false, output: `路線圖 JSON 解析失敗: ${filePath}` }; }

  const week = parseInt(action.week || String(rm.currentWeek), 10);
  if (week < 1 || week > rm.totalWeeks) return { ok: false, output: `week 超出範圍 (1-${rm.totalWeeks})` };
  const key = `W${week}`;
  if (!rm.weeklyGoals[key]) rm.weeklyGoals[key] = { goal: '', tasks: [] };

  const changes: string[] = [];
  if (action.goal) { rm.weeklyGoals[key].goal = action.goal.slice(0, 200); changes.push(`目標: ${action.goal.slice(0, 50)}`); }
  if (action.tasks) {
    let newTasks: string[] = [];
    try { const raw = action.tasks; if (typeof raw === 'string') newTasks = JSON.parse(raw); else if (Array.isArray(raw)) newTasks = (raw as string[]).map(String); } catch { /* ignore */ }
    const existingCount = Object.values(rm.weeklyGoals).reduce((s: number, wg: { goal: string; tasks: string[] }) => s + (wg.tasks?.length || 0), 0);
    if (existingCount + newTasks.length > 50) return { ok: false, output: `路線圖任務總數超過 50 個上限（目前 ${existingCount}，要新增 ${newTasks.length}）` };
    rm.weeklyGoals[key].tasks = [...(rm.weeklyGoals[key].tasks || []), ...newTasks];
    changes.push(`新增 ${newTasks.length} 個任務`);
  }
  if (action.current_week) { const nc = parseInt(action.current_week, 10); if (nc >= 1 && nc <= rm.totalWeeks) { rm.currentWeek = nc; changes.push(`當前週次 → W${nc}`); } }
  if (action.milestone_done) { const ms = rm.milestones.find(m => m.name === action.milestone_done); if (ms) { ms.done = true; changes.push(`里程碑完成: ${ms.name}`); } }
  if (changes.length === 0) return { ok: false, output: '沒有可更新的內容。可用參數: goal, tasks, current_week, milestone_done' };

  fs.writeFileSync(filePath, JSON.stringify(rm, null, 2), 'utf8');
  log.info(`[Roadmap] updated "${name}" W${week}: ${changes.join(', ')}`);
  return { ok: true, output: `路線圖「${name}」W${week} 已更新:\n${changes.join('\n')}` };
}

function handleRoadmapList(): ActionResult {
  if (!fs.existsSync(ROADMAPS_DIR)) return { ok: true, output: '目前沒有任何路線圖。用 mode=create 建立。' };
  const files = fs.readdirSync(ROADMAPS_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) return { ok: true, output: '目前沒有任何路線圖。用 mode=create 建立。' };
  const summaries: string[] = [];
  for (const file of files) {
    try {
      const fd = JSON.parse(fs.readFileSync(path.join(ROADMAPS_DIR, file), 'utf8'));
      const dm = (fd.milestones || []).filter((m: { done: boolean }) => m.done).length;
      const tm = (fd.milestones || []).length;
      const tc = Object.values(fd.weeklyGoals || {}).reduce((s: number, wg: unknown) => s + ((wg as { tasks?: string[] }).tasks?.length || 0), 0);
      summaries.push(`${fd.name} | W${fd.currentWeek}/${fd.totalWeeks} | 里程碑 ${dm}/${tm} | 任務 ${tc} 個 | ${fd.createdAt?.split('T')[0] || '?'}`);
    } catch { summaries.push(`${file}: （JSON 解析失敗）`); }
  }
  return { ok: true, output: `路線圖列表 (${files.length} 個):\n\n${summaries.join('\n')}` };
}

// ── 統一 action 調度器 ──

/** 展開路徑中的 ~ 為 HOME 目錄 */
function expandTilde(p: string): string {
  if (!p) return p;
  if (p.startsWith('~/')) return path.join(process.env.HOME || '/tmp', p.slice(2));
  if (p === '~') return process.env.HOME || '/tmp';
  return p;
}

/** 統一 action 調度器 */
export async function executeNEUXAAction(action: Record<string, string>): Promise<ActionResult> {
  const type = action.action;
  log.info(`[NEUXA-Action] type=${type} path=${action.path || ''}${type === 'ask_ai' ? ` model=${action.model || '(none)'} promptLen=${(action.prompt || '').length} contextLen=${(action.context || '').length}` : ''}`);

  let result: ActionResult;

  switch (type) {
    case 'create_task':
      result = { ok: true, output: await createTask(action.name || '未命名', action.description, action.owner) };
      break;
    case 'update_task':
      if (!action.id) return { ok: false, output: 'update_task 需要 id 參數' };
      result = { ok: true, output: await updateTask(action.id, action) };
      break;
    case 'read_file':
      result = await handleReadFile(expandTilde(action.path || ''));
      break;
    case 'write_file':
      result = await handleWriteFile(expandTilde(action.path || ''), action.content || '');
      break;
    case 'mkdir':
      result = await handleMkdir(expandTilde(action.path || ''));
      break;
    case 'move_file':
      result = await handleMoveFile(expandTilde(action.from || ''), expandTilde(action.to || ''));
      break;
    case 'list_dir':
      result = await handleListDir(expandTilde(action.path || NEUXA_WORKSPACE));
      break;
    case 'run_script':
      result = await handleSafeRunScript(action.command || action.cmd || '');
      break;
    case 'run_script_bg':
      result = { ok: false, output: '🛑 背景腳本不開放。用 run_script 跑輕量工具，或 create_task 派工。' };
      break;
    case 'ask_ai':
      result = await handleAskAI((action.model || 'flash').toLowerCase(), action.prompt || '', action.context);
      break;
    case 'proxy_fetch':
      result = await handleProxyFetch(action.url || '', action.method || 'POST', action.body || '');
      break;
    case 'query_supabase':
      result = await handleQuerySupabase(action);
      break;
    case 'semantic_search':
      result = await handleSemanticSearch(action.query || action.prompt || '', parseInt(action.limit || '5', 10), action.mode || 'task');
      break;
    case 'index_file':
      result = await handleIndexFile(expandTilde(action.path || ''), action.category);
      break;
    case 'reindex_knowledge':
      result = await handleReindexKnowledge(action.mode || 'append');
      break;
    case 'web_search':
      result = await handleWebSearch(action.query || action.prompt || '', parseInt(action.limit || '5', 10));
      break;
    case 'web_browse':
      result = await handleWebBrowse(action.url || '');
      break;
    case 'web_fetch':
      result = await handleWebFetch(action.url || '');
      break;
    case 'code_eval':
      result = await handleCodeEval(action.code || action.content || '');
      break;
    case 'analyze_code':
      result = await handleAnalyzeCode(expandTilde(action.path || ''), action.question || action.content || '');
      break;
    case 'grep_project': {
      const grepOpts: { ignore_case?: boolean; max_results?: number; file_pattern?: string } = {};
      if (action.options) {
        try {
          const parsed = typeof action.options === 'string' ? JSON.parse(action.options) : action.options;
          if (parsed.ignore_case) grepOpts.ignore_case = Boolean(parsed.ignore_case);
          if (parsed.max_results) grepOpts.max_results = Number(parsed.max_results);
          if (parsed.file_pattern) grepOpts.file_pattern = String(parsed.file_pattern);
        } catch { /* ignore parse errors */ }
      }
      result = await handleGrepProject(action.pattern || '', expandTilde(action.path || ''), grepOpts);
      break;
    }
    case 'find_symbol':
      result = await handleFindSymbol(action.symbol || '', action.type);
      break;
    case 'analyze_symbol':
      result = await handleAnalyzeSymbol(action.symbol || '', expandTilde(action.path || ''));
      break;
    case 'pty_exec': {
      const answers: string[] = (() => {
        try {
          const raw = action.answers;
          if (!raw) return [];
          if (Array.isArray(raw)) return (raw as string[]).map(String);
          const parsed: unknown = JSON.parse(raw);
          return Array.isArray(parsed) ? (parsed as string[]).map(String) : [];
        } catch { return []; }
      })();
      const timeout = Math.max(5, Math.min(120, parseInt(action.timeout || '30', 10)));
      result = await handlePtyExec(action.command || action.cmd || '', answers, timeout);
      break;
    }
    case 'patch_file':
      result = await handlePatchFile(action);
      break;
    case 'plan_project':
      result = await handlePlanProject(action);
      break;
    case 'roadmap':
      result = await handleRoadmap(action);
      break;
    case 'delegate_agents': {
      const agentsRaw = action.agents;
      let agentList: AgentSpec[] = [];
      try {
        agentList = typeof agentsRaw === 'string' ? JSON.parse(agentsRaw) : (Array.isArray(agentsRaw) ? agentsRaw : []);
      } catch { agentList = []; }
      result = await handleDelegateAgents(agentList, action.context);
      break;
    }
    case 'send_group': {
      // 小蔡去群組發訊息（指揮 crew bots / 發布公告）
      const groupMsg = action.message || action.text || action.content || '';
      if (!groupMsg) { result = { ok: false, output: 'send_group 需要 message 參數' }; break; }
      const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID?.trim() || process.env.TELEGRAM_CREW_GROUP_CHAT_ID?.trim();
      const xiaocaiToken = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim();
      if (!groupChatId || !xiaocaiToken) { result = { ok: false, output: 'send_group: 缺少 GROUP_CHAT_ID 或 XIAOCAI_BOT_TOKEN' }; break; }
      try {
        const { sendTelegramMessageToChat } = await import('../utils/telegram.js');
        await sendTelegramMessageToChat(Number(groupChatId), groupMsg, { token: xiaocaiToken });
        log.info(`[NEUXA-Action] send_group: len=${groupMsg.length} to=${groupChatId}`);

        // 內部調度 crew bots（Forum 群組 bot→bot 訊息不走 getUpdates）
        const { dispatchToCrewBots } = await import('./crew-bots/crew-poller.js');
        const dispatch = await dispatchToCrewBots(groupMsg, '小蔡');
        let dispatchNote = '';
        if (dispatch.totalReplied > 0) {
          const summary = dispatch.replies.map(r => `[${r.botName}]: ${r.reply.slice(0, 200)}`).join('\n');
          dispatchNote = `\n\n--- crew bots 回覆（${dispatch.totalReplied} 個）---\n${summary}`;
        }
        result = { ok: true, output: `已發送到群組: ${groupMsg.slice(0, 100)}${dispatchNote}` };
      } catch (e) {
        result = { ok: false, output: `send_group 失敗: ${e instanceof Error ? e.message : String(e)}` };
      }
      break;
    }
    case 'crew_dispatch': {
      // 小蔡主動派任務給星群 — 直接 dispatch 或寫 inbox
      const crewMsg = action.message || action.text || '';
      if (!crewMsg) { result = { ok: false, output: 'crew_dispatch 需要 message 參數' }; break; }
      const targetBot = action.target || ''; // 可選：指定 bot ID
      try {
        if (targetBot) {
          // 寫到指定 bot 的 inbox
          const inboxDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew', targetBot, 'inbox');
          fs.mkdirSync(inboxDir, { recursive: true });
          const ts = Date.now();
          const fileName = `task-${ts}-xiaocai.md`;
          const filePath = path.join(inboxDir, fileName);
          fs.writeFileSync(filePath, crewMsg, 'utf-8');
          result = { ok: true, output: `已寫入 inbox: ${targetBot}/inbox/${fileName}，bot 會在 30 秒內處理` };
        } else {
          // 廣播：dispatch 給所有星群（走群組討論模式）
          const { dispatchToCrewBots } = await import('./crew-bots/crew-poller.js');
          const dispatch = await dispatchToCrewBots(crewMsg, '小蔡');
          if (dispatch.totalReplied > 0) {
            const summary = dispatch.replies.map(r => `[${r.botName}]: ${r.reply.slice(0, 150)}`).join('\n');
            result = { ok: true, output: `星群 ${dispatch.totalReplied} 個 bot 回覆了：\n${summary}` };
          } else {
            result = { ok: true, output: '已發送給星群，等待回覆中...' };
          }
        }
      } catch (e) {
        result = { ok: false, output: `crew_dispatch 失敗: ${e instanceof Error ? e.message : String(e)}` };
      }
      break;
    }
    case 'generate_site':
      result = await handleGenerateSite(action);
      break;
    default:
      result = { ok: false, output: `未知 action: ${type}` };
  }

  // Record model usage for AI-related actions (fire and forget)
  if (result.ok && (type === 'ask_ai' || type === 'delegate_agents')) {
    const model = action.model || (type === 'delegate_agents' ? 'delegate' : 'unknown');
    const tokensEstimate = (action.prompt || '').length + (action.context || '').length + (result.output || '').length;
    recordModelUsage(model, tokensEstimate, 0, type).catch(() => {});
  }

  // 成功时追加 chain hint，引导小蔡连续行动
  if (result.ok && CHAIN_HINTS[type]) {
    result.output += '\n' + CHAIN_HINTS[type];
  }

  return result;
}

// ── 網站生成 ──

export async function handleGenerateSite(action: Record<string, string>): Promise<ActionResult> {
  const description = action.description || action.prompt || action.name || '';
  if (!description) return { ok: false, output: 'generate_site 需要 description 參數（描述你要什麼網站）' };

  const slug = action.slug || `site-${Date.now()}`;
  const sitesDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'sites', slug);
  fs.mkdirSync(sitesDir, { recursive: true });

  const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!googleKey) return { ok: false, output: 'generate_site: 沒有 GOOGLE_API_KEY' };

  const sitePrompt = `你是專業的前端開發者。請根據以下需求，生成一個完整的單頁 HTML 網站。

需求：${description}

要求：
1. 輸出完整的 HTML 檔案（包含 <!DOCTYPE html>），CSS 寫在 <style> 裡，JS 寫在 <script> 裡
2. 使用現代美觀的設計，漸層背景、圓角、陰影、動畫
3. 手機優先的響應式設計（RWD）
4. 使用繁體中文
5. 如果是商業網站，加入：hero 區塊、服務介紹、作品集/案例、預約/聯絡表單、頁尾
6. 可以使用 CDN 資源（如 Google Fonts、Font Awesome）
7. 只輸出 HTML 代碼，不要解釋文字，不要 markdown 代碼框

直接輸出 HTML：`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: sitePrompt }] }],
          generationConfig: { maxOutputTokens: 30000, temperature: 0.8 },
        }),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!resp.ok) return { ok: false, output: `Gemini API 錯誤: HTTP ${resp.status}` };

    const data = await resp.json() as Record<string, unknown>;
    const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
    const contentObj = ((candidates[0] || {}) as Record<string, unknown>).content as Record<string, unknown> || {};
    const parts = (contentObj.parts || []) as Array<Record<string, unknown>>;
    let html = parts.map(p => (p.text as string) || '').join('').trim();

    if (!html) return { ok: false, output: 'Gemini 回傳空內容' };

    // 清理 markdown 代碼框（如果有）
    html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    // 寫入 index.html
    const filePath = path.join(sitesDir, 'index.html');
    fs.writeFileSync(filePath, html, 'utf8');

    const port = process.env.PORT || '3011';
    const localUrl = `http://localhost:${port}/sites/${slug}/index.html`;
    const publicBase = process.env.TUNNEL_URL || process.env.PUBLIC_URL || '';
    const publicUrl = publicBase ? `${publicBase}/sites/${slug}/index.html` : '';
    const previewUrl = publicUrl || localUrl;

    log.info(`[GenerateSite] slug=${slug} size=${html.length} url=${previewUrl}`);

    return {
      ok: true,
      output: `✅ 網站已生成！\n\n🔗 預覽：${previewUrl}${publicUrl ? `\n📱 手機可開：${publicUrl}` : ''}\n📁 路徑：${filePath}\n📏 大小：${html.length} 字元\n\n老蔡可以直接點連結預覽（手機也行）。如果要修改，告訴我哪裡要改。`
    };
  } catch (e) {
    return { ok: false, output: `generate_site 失敗: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── 自動記憶 ──

/** 自動記憶：append 一輪互動摘要到每日日誌 */
export function appendInteractionLog(
  userInput: string,
  actions: string[],
  reply: string
): void {
  try {
    const now = new Date();
    // 用台灣時間 (UTC+8) 作為日期分割點
    const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const dateStr = twNow.toISOString().split('T')[0];
    const timeStr = twNow.toISOString().split('T')[1].split('.')[0];
    const dailyDir = path.join(NEUXA_WORKSPACE, 'memory', 'daily');
    fs.mkdirSync(dailyDir, { recursive: true });
    const logPath = path.join(dailyDir, `${dateStr}.md`);

    const userSnippet = userInput.replace(/\[系統回饋\][\s\S]*/, '').trim().slice(0, 100);
    const actionSummary = actions.length > 0
      ? actions.map(a => {
          const m = a.match(/^(✅|🚫)\s*(\w+):\s*(.*)/s);
          if (!m) return a.slice(0, 60);
          const ok = m[1] === '✅';
          const act = m[2];
          const detail = m[3].slice(0, 50).replace(/\n/g, ' ');
          return `${ok ? '✓' : '✗'} ${act}: ${detail}`;
        }).join('\n  ')
      : '（純對話）';
    const replySnippet = reply.slice(0, 200).replace(/\n/g, ' ');

    const entry =
      `\n### ${timeStr}\n` +
      `老蔡：${userSnippet || '（系統觸發）'}\n` +
      `動作：\n  ${actionSummary}\n` +
      `回覆：${replySnippet}\n`;

    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, `# 小蔡互動日誌 — ${dateStr}\n`, 'utf8');
    }
    fs.appendFileSync(logPath, entry, 'utf8');
  } catch (e) {
    log.warn({ err: e }, '[NEUXA-Memory] 寫入互動日誌失敗');
  }
}
