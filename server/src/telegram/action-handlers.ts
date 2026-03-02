/**
 * NEUXA 執行能力 — 安全沙盒化的檔案 & 腳本操作 + AI 諮詢
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createLogger } from '../logger.js';
import { sanitize } from '../utils/key-vault.js';
import { sendTelegramMessageToChat } from '../utils/telegram.js';
import { isPathSafe, isScriptSafe, NEUXA_WORKSPACE, SOUL_FILES } from './security.js';

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

/** NEUXA 諮詢 AI 代理 — 路由到 Claude CLI 或 Gemini API，失敗自動升級 */
export async function handleAskAI(model: string, prompt: string, context?: string): Promise<ActionResult> {
  const m = (model || 'flash').toLowerCase();

  // 第一次嘗試：用指定的模型
  let result: ActionResult;
  if (m.includes('claude') || m.includes('sonnet') || m.includes('opus') || m.includes('haiku')) {
    result = await handleAskClaude(model, prompt, context);
  } else {
    result = await handleAskGemini(model, prompt, context);
  }

  // 成功 → 直接回
  if (result.ok) return result;

  // 失敗 → 自動升級到 Anthropic API (Sonnet 4.6)
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!anthropicKey) {
    log.warn(`[AskAI-Escalate] 原模型失敗且無 ANTHROPIC_API_KEY，無法升級`);
    return result;
  }

  const escalateModel = 'claude-sonnet-4-6';
  log.info(`[AskAI-Escalate] ${model} 失敗，自動升級到 ${escalateModel}`);

  try {
    const { callAnthropic } = await import('./model-registry.js');
    const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;
    const startTime = Date.now();
    const reply = await callAnthropic(anthropicKey, escalateModel, '', [{ role: 'user', content: fullPrompt }], 4096, 90000);
    const durationMs = Date.now() - startTime;

    if (reply) {
      log.info(`[AskAI-Escalate] ${escalateModel} 成功 replyLen=${reply.length} duration=${durationMs}ms`);
      return { ok: true, output: `[${escalateModel} ⬆️ 自動升級 | ${durationMs}ms]\n${reply}` };
    }
  } catch (e) {
    log.warn({ err: e }, `[AskAI-Escalate] ${escalateModel} 也失敗了`);
  }

  // 升級也失敗 → 回傳原始錯誤
  return result;
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

// ── 安全腳本執行（白名單模式）──

/**
 * 小蔡可以直接跑的輕量工具白名單。
 * 規則：唯讀/診斷性質，30 秒 timeout，沙盒環境（無 API key）。
 * 重型任務（改代碼、部署、npm install）仍然要建任務。
 */
const SAFE_SCRIPT_PATTERNS: Array<{ pattern: RegExp; desc: string }> = [
  // 系統診斷
  { pattern: /^curl\s+-s\s+http:\/\/localhost:3011\/api\//, desc: '本地 API 呼叫' },
  { pattern: /^curl\s+-s\s+https?:\/\/[a-z0-9.-]+\.supabase\.co\//, desc: 'Supabase 查詢' },
  { pattern: /^lsof\s+-i\s+:/, desc: '查 port 占用' },
  { pattern: /^ps\s+(aux|ef)/, desc: '查進程' },
  { pattern: /^docker\s+(ps|logs|inspect)/, desc: 'Docker 狀態' },
  { pattern: /^cat\s+\/tmp\/openclaw/, desc: '讀 server log' },
  { pattern: /^tail\s+(-n\s+\d+\s+)?\//, desc: '讀日誌尾部' },
  { pattern: /^head\s+(-n\s+\d+\s+)?\//, desc: '讀檔案頭部' },
  { pattern: /^wc\s+-[lcw]\s+/, desc: '統計行數' },
  { pattern: /^du\s+-s/, desc: '檢查磁碟用量' },
  { pattern: /^df\s+-h/, desc: '檢查磁碟空間' },
  { pattern: /^uptime/, desc: '系統運行時間' },
  { pattern: /^date/, desc: '系統時間' },
  { pattern: /^which\s+/, desc: '查找命令路徑' },
  // 搜尋和查詢
  { pattern: /^grep\s+-[rilnc]+\s+/, desc: 'grep 搜尋' },
  { pattern: /^find\s+.*-name\s+/, desc: '找檔案' },
  { pattern: /^python3\s+-c\s+/, desc: 'Python 單行腳本' },
  // workspace 工具（唯讀類）
  { pattern: /^bash\s+.*health-check\.sh/, desc: '健康檢查' },
  { pattern: /^bash\s+.*agent-status\.sh/, desc: 'Agent 狀態' },
  { pattern: /^bash\s+.*security-check\.sh/, desc: '安全掃描' },
  { pattern: /^python3\s+.*health-check\.py/, desc: '健康檢查 (py)' },
  { pattern: /^python3\s+.*hybrid-search\.py/, desc: '混合搜尋' },
  { pattern: /^python3\s+.*smart-recall\.py/, desc: '智能回憶' },
  { pattern: /^bash\s+.*vector-index-manager\.sh\s+stats/, desc: '向量索引統計' },
];

/** 危險指令黑名單（即使匹配白名單也拒絕） */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i, /mkfs/i, /dd\s+if=/i, />\s*\/dev\//i,
  /chmod\s+777/i, /eval\s*\(/i, /\$\(/i, /`[^`]+`/,
  /npm\s+(install|uninstall|publish)/i, /pip\s+install/i,
  /git\s+(push|reset|checkout|clean)/i,
  /kill\s+-9/i, /pkill/i, /killall/i,
  /launchctl\s+(stop|start|remove)/i,
  /curl\s+.*-X\s*(POST|PUT|DELETE|PATCH)/i,
];

async function handleSafeRunScript(command: string): Promise<ActionResult> {
  if (!command.trim()) {
    return { ok: false, output: 'run_script 需要 command 參數' };
  }

  const cmd = command.trim();

  // 1. 先檢查黑名單
  const dangerous = DANGEROUS_PATTERNS.find(p => p.test(cmd));
  if (dangerous) {
    return { ok: false, output: `🛑 危險指令被攔截。這類操作請建任務（create_task）派給 auto-executor。` };
  }

  // 2. 檢查白名單
  const allowed = SAFE_SCRIPT_PATTERNS.find(p => p.pattern.test(cmd));
  if (!allowed) {
    return { ok: false, output: `🛑 這個指令不在輕量工具白名單裡。\n指揮官可以直接跑的：系統診斷（curl localhost、lsof、ps）、搜尋（grep、find）、Python 單行、健康檢查腳本。\n重型任務請用 create_task 派工。` };
  }

  log.info(`[SafeRunScript] 允許: ${allowed.desc} → ${cmd.slice(0, 80)}`);
  return handleRunScript(cmd);
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

async function handleSemanticSearch(query: string, limit: number = 5): Promise<ActionResult> {
  if (!query || query.trim().length < 2) {
    return { ok: false, output: 'semantic_search 需要 query 參數（至少 2 個字）' };
  }

  const safeLimit = Math.min(Math.max(1, limit), 10);

  try {
    // 1. Google Embedding
    const queryVector = await googleEmbed(query);
    if (!queryVector) {
      return { ok: false, output: 'Embedding 失敗: 確認 GOOGLE_API_KEY 已設定' };
    }

    // 2. Supabase pgvector RPC 搜尋
    const { hasSupabase: hasSb, supabase: sb } = await import('../supabase.js');
    if (!hasSb() || !sb) {
      return { ok: false, output: 'Supabase 未連線，無法搜尋向量庫' };
    }

    const { data: results, error } = await sb.rpc('match_embeddings', {
      query_embedding: JSON.stringify(queryVector),
      match_threshold: 0.3,
      match_count: safeLimit,
    });

    if (error) {
      return { ok: false, output: `向量搜尋失敗: ${error.message}` };
    }

    if (!results || results.length === 0) {
      return { ok: true, output: `沒有找到「${query}」的相關知識。試試換個關鍵詞。` };
    }

    // 3. 格式化結果
    const lines = results.map((r: any, i: number) => {
      const score = ((r.similarity || 0) * 100).toFixed(0);
      const title = r.doc_title || r.file_name || '未知';
      const section = r.section_title || '';
      const category = r.category || '';
      const content = String(r.content || '').slice(0, 400);
      const filePath = r.file_path || '';
      return `[${i + 1}] 📄 ${title}${section ? ` > ${section}` : ''} (${category}, ${score}%相關)\n📁 ${filePath}\n${content}`;
    });

    log.info(`[SemanticSearch] query="${query}" → ${results.length} results (top: ${((results[0].similarity || 0) * 100).toFixed(0)}%)`);
    return { ok: true, output: `🔍 「${query}」相關知識（${results.length} 筆）：\n\n${lines.join('\n\n')}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, output: sanitize(`semantic_search 失敗: ${msg}`) };
  }
}

// ── 向量索引（Google Embedding + Supabase pgvector）──

/** 單檔快速索引：把一個 .md 檔案切 chunk → embed → 寫入 Supabase */
async function handleIndexFile(filePath: string, category?: string): Promise<ActionResult> {
  if (!filePath || !filePath.endsWith('.md')) {
    return { ok: false, output: 'index_file 需要 .md 檔案路徑' };
  }
  let resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) && !path.isAbsolute(filePath)) {
    resolved = path.join(NEUXA_WORKSPACE, filePath);
  }
  if (!fs.existsSync(resolved)) {
    return { ok: false, output: `檔案不存在: ${filePath}（也嘗試了 ${resolved}）` };
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

    const titleMatch = content.match(/^# (.+)/m);
    const docTitle = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');

    let indexed = 0;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      const secTitleMatch = section.match(/^## (.+)/m);
      const secTitle = secTitleMatch ? secTitleMatch[1].replace(/#/g, '').trim() : `chunk-${i}`;

      const embedText = `[${docTitle} | ${secTitle}] ${section.slice(0, 500)}`;
      const vector = await googleEmbed(embedText);
      if (!vector) continue;

      const hash = crypto.createHash('md5').update(`${relPath}:${i}`).digest('hex');
      const pointId = parseInt(hash.slice(0, 15), 16);

      const { error } = await sb.from('openclaw_embeddings').upsert({
        id: pointId,
        doc_title: docTitle,
        section_title: secTitle,
        content: section,
        content_preview: section.slice(0, 200),
        file_path: relPath,
        file_name: fileName,
        category: cat,
        chunk_index: i,
        chunk_total: sections.length,
        size: section.length,
        date: new Date().toISOString().split('T')[0],
        embedding: JSON.stringify(vector),
      }, { onConflict: 'id' });

      if (!error) indexed++;
    }

    return { ok: true, output: `已索引 ${fileName} → ${indexed}/${sections.length} chunks (category: ${cat})` };
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
          const embedText = `[${docTitle} | ${secTitle}] ${section.slice(0, 500)}`;

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
    return { ok: true, output: output || '沒有搜尋結果' };
  } catch (e) {
    return { ok: false, output: `web_search 失敗: ${(e as Error).message}` };
  }
}

/** 抓取網頁內容 — 封鎖內網，純文字截斷 4000 字 */
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
      return handleSafeRunScript(action.command || action.cmd || '');
    case 'run_script_bg':
      return { ok: false, output: '🛑 背景腳本不開放。用 run_script 跑輕量工具，或 create_task 派工。' };
    case 'ask_ai':
      return handleAskAI((action.model || 'flash').toLowerCase(), action.prompt || '', action.context);
    case 'proxy_fetch':
      return handleProxyFetch(action.url || '', action.method || 'POST', action.body || '');
    case 'query_supabase':
      return handleQuerySupabase(action);
    case 'semantic_search':
      return handleSemanticSearch(action.query || action.prompt || '', parseInt(action.limit || '5', 10));
    case 'index_file':
      return handleIndexFile(action.path || '', action.category);
    case 'reindex_knowledge':
      return handleReindexKnowledge(action.mode || 'append');
    case 'web_search':
      return handleWebSearch(action.query || action.prompt || '', parseInt(action.limit || '5', 10));
    case 'web_fetch':
      return handleWebFetch(action.url || '');
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
