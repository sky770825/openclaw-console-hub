/**
 * NEUXA 執行能力 — 安全沙盒化的檔案 & 腳本操作 + AI 諮詢
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createLogger } from '../logger.js';
import { sanitize } from '../utils/key-vault.js';
import { sendTelegramMessageToChat } from '../utils/telegram.js';
import { isPathSafe, isScriptSafe, NEUXA_WORKSPACE } from './security.js';

const log = createLogger('telegram');

const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

export type ActionResult = { ok: boolean; output: string };

// ── 任務操作 ──

/** 建立任務 */
export async function createTask(name: string, description?: string, owner?: string): Promise<string> {
  try {
    const validOwner = owner && ['小蔡', '老蔡', 'system'].includes(owner) ? owner : '小蔡';
    const trimmedName = name.slice(0, 100);

    // 核心資產保護：禁止建立涉及靈魂文件 / 大腦 / key 的任務
    const combined = `${trimmedName} ${description || ''}`.toLowerCase();
    const FORBIDDEN_TASK_PATTERNS = [
      /agents\.md/i, /soul\.md/i, /awakening\.md/i, /identity\.md/i,
      /xiaocai-think/i, /bot-polling/i, /executor-agents/i,
      /覆蓋.*意識/i, /覆寫.*靈魂/i, /修改.*大腦/i,
      /\.env/i, /openclaw\.json/i, /sessions\.json/i,
      /api.?key/i, /token.*洩/i,
    ];
    const blocked = FORBIDDEN_TASK_PATTERNS.find(p => p.test(combined));
    if (blocked) return `🛑 安全攔截：任務涉及核心資產（${blocked.source}），禁止建立。只有老蔡能動這些。`;

    // 防重复：检查是否已有同名 + 非 done 的任务
    const checkR = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?limit=100`, {
      headers: { Authorization: `Bearer ${OPENCLAW_API_KEY}` },
    });
    if (checkR.ok) {
      const existing = (await checkR.json()) as Array<Record<string, unknown>>;
      const dup = existing.find((t: Record<string, unknown>) => {
        const tName = String(t.name || t.title || '');
        const tStatus = String(t.status || '');
        return tName === trimmedName && tStatus !== 'done' && tStatus !== 'failed';
      });
      if (dup) return `已存在同名任務 (ID: ${dup.id}, status: ${dup.status})，不重複建立`;
    }

    // 小蔡建的任務進 draft，需老蔡批准才變 ready 讓 auto-executor 執行
    const initialStatus = validOwner === '老蔡' ? 'ready' : 'draft';
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?allowStub=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      body: JSON.stringify({ name: trimmedName, status: initialStatus, priority: 2, owner: validOwner, description }),
    });
    const result = (await r.json()) as Record<string, unknown>;
    const statusNote = initialStatus === 'draft' ? '（draft — 等老蔡批准後才會執行）' : '';
    return result.id ? `已建立，ID: ${result.id}，owner: ${validOwner}${statusNote}` : '建立失敗';
  } catch { return '建立失敗（連線錯誤）'; }
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
    });
    if (!r.ok) return `更新失敗: HTTP ${r.status}`;
    return `已更新任務 ${id}: ${Object.keys(allowed).join(', ')}`;
  } catch { return '更新失敗（連線錯誤）'; }
}

// ── 檔案操作 ──

/** 常見相對路徑前綴 → 自動補全對應的絕對路徑 */
const PATH_PREFIXES: [string, string][] = [
  ['server/', '/Users/caijunchang/openclaw任務面版設計/server/'],
  ['src/', '/Users/caijunchang/openclaw任務面版設計/src/'],
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
        const projCandidate = path.join('/Users/caijunchang/openclaw任務面版設計', actionPath);
        if (fs.existsSync(projCandidate)) resolved = projCandidate;
      }
    }

    if (!fs.existsSync(resolved)) return { ok: false, output: `檔案不存在: ${actionPath}（提醒：workspace 檔案用 ~/.openclaw/workspace/ 前綴，專案檔案用絕對路徑 /Users/caijunchang/openclaw任務面版設計/...）` };
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
  const check = isPathSafe(actionPath, 'write');
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  try {
    const resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf8');
    return { ok: true, output: `已寫入 ${resolved} (${content.length} 字)` };
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
    const resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
    if (!fs.existsSync(resolved)) return { ok: false, output: `目錄不存在: ${actionPath}` };
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
      env: {
        ...process.env,
        HOME: process.env.HOME,
        PATH: `${path.join(process.env.HOME || '/tmp', '.local', 'bin')}:${process.env.PATH || '/usr/bin:/bin'}`,
      },
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

/** NEUXA 諮詢 AI 代理 — 路由到 Claude CLI 或 Gemini API */
export function handleAskAI(model: string, prompt: string, context?: string): Promise<ActionResult> {
  const m = (model || 'flash').toLowerCase();
  if (m.includes('claude') || m.includes('sonnet') || m.includes('opus') || m.includes('haiku')) {
    return handleAskClaude(model, prompt, context);
  }
  return handleAskGemini(model, prompt, context);
}

/** 安全 Supabase 查詢代理：NEUXA 不需要 key，由 server 內部 client 處理 */
const ALLOWED_TABLES = new Set([
  'openclaw_tasks', 'openclaw_reviews', 'openclaw_automations',
  'openclaw_evolution_log', 'openclaw_runs', 'openclaw_audit_logs',
  'openclaw_memory',
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
  if (!table || typeof table !== 'string') return { ok: false, output: 'query_supabase 需要 table 參數' };
  if (!ALLOWED_TABLES.has(table)) return { ok: false, output: `表 "${table}" 不在白名單。可用: ${[...ALLOWED_TABLES].join(', ')}` };

  // select 欄位 mapping — 映射後過濾掉不存在的欄位
  // 已知每張表的真實欄位（Supabase schema）
  const REAL_COLUMNS: Record<string, Set<string>> = {
    openclaw_tasks: new Set(['id', 'title', 'status', 'cat', 'progress', 'auto', 'thought', 'subs', 'from_review_id', 'created_at', 'updated_at']),
    openclaw_audit_logs: new Set(['id', 'action', 'resource', 'resource_id', 'user_id', 'ip', 'diff', 'created_at']),
    openclaw_reviews: new Set(['id', 'title', 'type', 'description', 'src', 'pri', 'status', 'reasoning', 'created_at', 'updated_at']),
    openclaw_automations: new Set(['id', 'name', 'cron', 'active', 'chain', 'health', 'runs', 'last_run', 'created_at', 'updated_at']),
    openclaw_evolution_log: new Set(['id', 't', 'x', 'c', 'tag', 'tc', 'created_at']),
    openclaw_runs: new Set(['id', 'task_id', 'task_name', 'status', 'started_at', 'ended_at', 'duration_ms', 'input_summary', 'output_summary', 'steps', 'created_at']),
    openclaw_memory: new Set(['id', 'key', 'value', 'category', 'created_at', 'updated_at']),
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
  ];

  const target = TARGETS.find(t => t.pattern.test(url));
  if (!target) {
    return { ok: false, output: `proxy_fetch: URL 不在白名單。允許的目標: ${TARGETS.map(t => t.name).join(', ')}` };
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

// ── 語義搜尋（Qdrant + Ollama bge-m3）──

const QDRANT_URL = 'http://localhost:6333';
const QDRANT_COLLECTION = 'memory_smart_chunks';
const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'bge-m3';

async function handleSemanticSearch(query: string, limit: number = 5): Promise<ActionResult> {
  if (!query || query.trim().length < 2) {
    return { ok: false, output: 'semantic_search 需要 query 參數（至少 2 個字）' };
  }

  const safeLimit = Math.min(Math.max(1, limit), 10);

  try {
    // 1. 用 Ollama bge-m3 產生 query embedding
    const embedResp = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, input: query }),
      signal: AbortSignal.timeout(30000),
    });
    if (!embedResp.ok) {
      return { ok: false, output: `Embedding 失敗: Ollama HTTP ${embedResp.status}（確認 Ollama 和 bge-m3 模型在跑）` };
    }
    const embedData = await embedResp.json() as { embeddings?: number[][] };
    const queryVector = embedData?.embeddings?.[0];
    if (!queryVector || queryVector.length === 0) {
      return { ok: false, output: 'Embedding 回傳空向量' };
    }

    // 2. 向 Qdrant 做向量搜尋
    const searchResp = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: queryVector,
        limit: safeLimit,
        with_payload: true,
        score_threshold: 0.3,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!searchResp.ok) {
      return { ok: false, output: `Qdrant 搜尋失敗: HTTP ${searchResp.status}` };
    }
    const searchData = await searchResp.json() as {
      result?: Array<{ score: number; payload: Record<string, unknown> }>;
    };
    const results = searchData?.result || [];

    if (results.length === 0) {
      return { ok: true, output: `沒有找到「${query}」的相關知識。試試換個關鍵詞。` };
    }

    // 3. 格式化結果
    const lines = results.map((r, i) => {
      const p = r.payload || {};
      const score = (r.score * 100).toFixed(0);
      const title = p.doc_title || p.title || p.file_name || '未知';
      const section = p.section_title || '';
      const category = p.category || '';
      const content = String(p.content || '').slice(0, 400);
      const filePath = p.file_path || '';
      return `[${i + 1}] 📄 ${title}${section ? ` > ${section}` : ''} (${category}, ${score}%相關)\n📁 ${filePath}\n${content}`;
    });

    log.info(`[SemanticSearch] query="${query}" → ${results.length} results (top score: ${(results[0].score * 100).toFixed(0)}%)`);
    return { ok: true, output: `🔍 「${query}」相關知識（${results.length} 筆）：\n\n${lines.join('\n\n')}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: sanitize(`semantic_search 失敗: ${msg}`) };
  }
}

// ── 統一 action 調度器 ──

/** 統一 action 調度器 */
export async function executeNEUXAAction(action: Record<string, string>): Promise<ActionResult> {
  const type = action.action;
  log.info(`[NEUXA-Action] type=${type} path=${action.path || ''}${type === 'ask_ai' ? ` model=${action.model || '(none)'} promptLen=${(action.prompt || '').length} contextLen=${(action.context || '').length}` : ''}`);

  switch (type) {
    case 'create_task':
      return { ok: true, output: await createTask(action.name || '未命名', action.description, action.owner) };
    case 'update_task':
      if (!action.id) return { ok: false, output: 'update_task 需要 id 參數' };
      return { ok: true, output: await updateTask(action.id, action) };
    case 'read_file':
      return handleReadFile(action.path || '');
    case 'write_file':
      return handleWriteFile(action.path || '', action.content || '');
    case 'mkdir':
      return handleMkdir(action.path || '');
    case 'move_file':
      return handleMoveFile(action.from || '', action.to || '');
    case 'list_dir':
      return handleListDir(action.path || NEUXA_WORKSPACE);
    case 'run_script':
      return { ok: false, output: '🛑 指揮官不需要自己跑腳本。請建任務（create_task）派給 auto-executor 執行。' };
    case 'run_script_bg':
      return { ok: false, output: '🛑 指揮官不需要自己跑腳本。請建任務（create_task）派給 auto-executor 執行。' };
    case 'ask_ai':
      return handleAskAI((action.model || 'flash').toLowerCase(), action.prompt || '', action.context);
    case 'proxy_fetch':
      return handleProxyFetch(action.url || '', action.method || 'POST', action.body || '');
    case 'query_supabase':
      return handleQuerySupabase(action);
    case 'semantic_search':
      return handleSemanticSearch(action.query || action.prompt || '', parseInt(action.limit || '5', 10));
    default:
      return { ok: false, output: `未知 action: ${type}` };
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
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
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
