/**
 * Telegram 控制輪詢（不需要 webhook）
 * - 設定 TELEGRAM_CONTROL_BOT_TOKEN 或 TELEGRAM_STOP_BOT_TOKEN 就能用
 * - 支援 /start 菜單 + /recover 自救巡檢 + /codex-triage
 *
 * NOTE:
 * Telegram 的 webhook 無法指向 localhost，因此本專案採用 getUpdates 長輪詢。
 */
import { createLogger } from './logger.js';
import { sendTelegramMessageToChat } from './utils/telegram.js';
import { handleStopCommand } from './emergency-stop.js';
import { spawn } from 'node:child_process';

const log = createLogger('telegram');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// If you want to use a specific bot (e.g. @ollama168bot) to control local scripts,
// set TELEGRAM_CONTROL_BOT_TOKEN to that bot token. Otherwise, fallback to STOP bot.
const TOKEN = (process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || process.env.TELEGRAM_STOP_BOT_TOKEN?.trim()) ?? '';
// Safety: if TELEGRAM_CHAT_ID is not set, we default to "locked" mode unless explicitly allowed.
const TELEGRAM_ALLOW_ANY_CHAT = process.env.TELEGRAM_ALLOW_ANY_CHAT === 'true';
const POLL_INTERVAL_MS = 1500;
// Long polling: keep timeout > 0, and keep fetch timeout comfortably above it to avoid AbortError noise.
const GET_UPDATES_TIMEOUT_SEC = 20;
const FETCH_TIMEOUT_MS = 30000;
// Prefer localhost over 127.0.0.1: on some macOS setups Node binds IPv6 only,
// and IPv4 loopback can fail even when the server is healthy.
const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');
const OLLAMA_BASE_URL = (process.env.OLLAMA_URL?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
let ollamaModel = process.env.OLLAMA_TELEGRAM_MODEL?.trim() || 'llama3.2:latest';
const TELEGRAM_STATE_PATH = path.join(process.cwd(), 'runtime-checkpoints', 'telegram-control.json');

let offset = 0;
let running = false;
let nextPollDelayMs = POLL_INTERVAL_MS;
let consecutivePollFailures = 0;

let scriptInFlight = false;
let codexTriagePending = false;
let codexTriagePendingAt = 0;
let lastPollHttpErrorLogAt = 0;
let lastUpdateLogAt = 0;
let lastConflictNotifyAt = 0;
let lastUnauthorizedNotifyAt = 0;
let lastUnauthorizedChatNotifyAt = 0;

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 5000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal } as RequestInit);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function getAllowChatId(): number | null {
  const raw = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

async function notifyOnce(kind: 'conflict' | 'unauthorized', detail: string): Promise<void> {
  // Even if getUpdates is failing, sendMessage can still succeed.
  const allowChatId = getAllowChatId();
  if (!allowChatId) return;

  const now = Date.now();
  const cooldownMs = 10 * 60 * 1000;

  if (kind === 'conflict') {
    if (now - lastConflictNotifyAt < cooldownMs) return;
    lastConflictNotifyAt = now;
    await sendTelegramMessageToChat(
      allowChatId,
      `⚠️ <b>Telegram 控制被搶走</b>\n\n` +
        `出現 <code>409 Conflict</code>：同一顆 bot token 同時被別的程式在跑 <code>getUpdates</code>。\n` +
        `請把另一邊停止輪詢或換成不同 bot token。\n\n` +
        `<b>detail:</b>\n<code>${detail.slice(0, 900)}</code>`,
      { token: TOKEN, parseMode: 'HTML' }
    );
    return;
  }

  if (now - lastUnauthorizedNotifyAt < cooldownMs) return;
  lastUnauthorizedNotifyAt = now;
  await sendTelegramMessageToChat(
    allowChatId,
    `⚠️ <b>Telegram Token 無效</b>\n\n` +
      `出現 <code>401 Unauthorized</code>：token 可能被 revoke/換新，或目前用錯 token。\n\n` +
      `<b>detail:</b>\n<code>${detail.slice(0, 900)}</code>`,
    { token: TOKEN, parseMode: 'HTML' }
  );
}

async function callOllamaGenerate(prompt: string): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const body = {
    model: ollamaModel,
    prompt,
    stream: false,
    options: { num_predict: 256 },
  };
  const data = await fetchJsonWithTimeout(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 45000);
  const text = String(asObj(data).response ?? '').trim();
  if (!text) return { ok: false, message: 'Ollama 回覆為空（可能超時或模型無輸出）' };
  return { ok: true, text };
}

function extractOllamaPrompt(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // Explicit command
  if (/^\/ollama(\s|$)/i.test(t)) return t.replace(/^\/ollama\s*/i, '').trim() || null;
  // Default-chat mode: treat any non-command text as an Ollama prompt.
  if (!t.startsWith('/')) return t;
  return null;
}

async function fetchOllamaTags(): Promise<string[]> {
  // Ollama: /api/tags -> { models: [{ name: string, ... }] }
  const data = await fetchJsonWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 8000);
  const dobj = asObj(data);
  const models = Array.isArray(dobj.models) ? (dobj.models as unknown[]) : [];
  const names = models
    .map((m) => {
      const o = asObj(m);
      return String(o.name ?? '');
    })
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function loadTelegramState(): void {
  try {
    if (!fs.existsSync(TELEGRAM_STATE_PATH)) return;
    const raw = fs.readFileSync(TELEGRAM_STATE_PATH, 'utf8');
    const data: unknown = JSON.parse(raw);
    const dobj = asObj(data);
    const m = String(dobj.ollamaModel ?? '').trim();
    if (m) ollamaModel = m;
  } catch {
    // ignore
  }
}

function saveTelegramState(): void {
  try {
    const dir = path.dirname(TELEGRAM_STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TELEGRAM_STATE_PATH, JSON.stringify({ ollamaModel, savedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
  } catch {
    // ignore
  }
}

async function logBotIdentityOnce(): Promise<void> {
  if (!TOKEN) return;
  const me = await fetchJsonWithTimeout(`https://api.telegram.org/bot${TOKEN}/getMe`, {}, 8000);
  const mobj = asObj(me);
  if (mobj.ok !== true) return;
  const result = asObj(mobj.result);
  const username = String(result.username ?? '(unknown)');
  const firstName = String(result.first_name ?? '');
  log.info(`[TelegramControl] bot=@${username} name=${firstName}`.trim());
  if (!getAllowChatId() && !TELEGRAM_ALLOW_ANY_CHAT) {
    log.warn('[TelegramControl] TELEGRAM_CHAT_ID not set: bot commands are LOCKED. Set TELEGRAM_CHAT_ID (recommended) or TELEGRAM_ALLOW_ANY_CHAT=true (dev only).');
  }
}

async function ensureWebhookDisabled(): Promise<void> {
  if (!TOKEN) return;
  // If a webhook is set, Telegram returns 409 for getUpdates. Clear it so polling works reliably.
  const url = `https://api.telegram.org/bot${TOKEN}/deleteWebhook?drop_pending_updates=true`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      log.error({ status: res.status, detail: detail.slice(0, 400) }, '[TelegramControl] deleteWebhook failed');
      return;
    }
    const data: unknown = await res.json().catch(() => null);
    const dobj = asObj(data);
    if (dobj.ok !== true) {
      log.error({ response: JSON.stringify(dobj ?? data)?.slice(0, 400) }, '[TelegramControl] deleteWebhook unexpected response');
      return;
    }
    log.info('[TelegramControl] webhook cleared (polling mode)');
  } catch (e) {
    log.error({ err: e }, '[TelegramControl] deleteWebhook error');
  }
}

const MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📊 系統狀態', callback_data: '/status' },
      { text: '🚀 任務板', callback_data: '/tasks' },
    ],
    [
      { text: '🧠 模型路由', callback_data: '/models' },
      { text: '🧹 清理任務', callback_data: '/cleanup' },
    ],
    [
      { text: '🛟 自救巡檢', callback_data: '/recover' },
      { text: '🧾 產生 Handoff', callback_data: '/handoff' },
    ],
    [
      { text: '📋 日報', callback_data: '/report' },
      { text: '🏥 健康檢查', callback_data: '/health' },
    ],
    [
      { text: '🟣 切換派工', callback_data: '/dispatch' },
      { text: '🔧 修復任務', callback_data: '/reconcile' },
    ],
    [{ text: '🧑‍💻 交給 Codex 排查', callback_data: '/codex-triage' }],
    [{ text: '❓ 幫助', callback_data: '/help' }],
  ],
};

// "功能欄"：Telegram 底部鍵盤（不會黏在每一則訊息下面）
// 這些按鍵會送出文字訊息，我們在 poll() 內用文字來路由到對應功能。
const MENU_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: '📊 系統狀態' }, { text: '🚀 任務板' }],
    [{ text: '🧠 模型路由' }, { text: '🧹 清理任務' }],
    [{ text: '🛟 自救巡檢' }, { text: '🧾 產生 Handoff' }],
    [{ text: '📋 日報' }, { text: '🏥 健康檢查' }],
    [{ text: '🟣 切換派工' }, { text: '🔧 修復任務' }],
    [{ text: '🧑‍💻 交給 Codex 排查' }, { text: '❓ 幫助' }],
    [{ text: '🔘 功能欄' }, { text: '🙈 隱藏按鈕' }],
  ],
  resize_keyboard: true,
};

const HIDE_KEYBOARD = { remove_keyboard: true };

async function replyMenu(chatId: number, prefix?: string): Promise<void> {
  const text = (prefix ? `${prefix}\n\n` : '') + '功能欄已開啟（在輸入框下方）。';
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML', replyMarkup: MENU_REPLY_KEYBOARD });
}

async function replyStatus(chatId: number): Promise<void> {
  const tasks = (await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/tasks`, {}, 4000)) as unknown;
  const runs = (await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/runs`, {}, 4000)) as unknown;
  const auto = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/auto-executor/status`, {}, 4000);

  const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  const taskList = Array.isArray(tasks) ? tasks : [];
  const runList = Array.isArray(runs) ? runs : [];

  const total = taskList.length;
  const ready = taskList.filter((t) => String(asObj(t).status ?? '') === 'ready').length;
  const runningTasks = taskList.filter((t) => String(asObj(t).status ?? '') === 'running').length;
  const done = taskList.filter((t) => String(asObj(t).status ?? '') === 'done').length;

  const activeRuns = runList.filter((r) =>
    ['queued', 'running', 'retrying'].includes(String(asObj(r).status ?? ''))
  ).length;

  const text =
    `📊 <b>系統狀態</b>\n\n` +
    `<b>Taskboard:</b> ${tasks ? 'ok' : 'down'}\n` +
    `<b>Tasks:</b> ready=${ready} running=${runningTasks} done=${done} total=${total}\n` +
    `<b>Runs:</b> active=${activeRuns} total=${runList.length}\n` +
    `<b>AutoExecutor:</b> ${asObj(auto).isRunning === true ? 'ON' : 'OFF'}`;

  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyTasks(chatId: number): Promise<void> {
  const tasks = (await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/tasks`, {}, 4000)) as unknown;
  if (!Array.isArray(tasks)) {
    await sendTelegramMessageToChat(chatId, '⚠️ 任務板 API 無回應', { token: TOKEN, parseMode: 'HTML' });
    return;
  }
  const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  const ready = tasks.filter((t) => String(asObj(t).status ?? '') === 'ready').slice(0, 10);
  const lines = ready.map((t, i) => `${i + 1}. ${String(asObj(t).name ?? '(no name)')} (<code>${String(asObj(t).id ?? '')}</code>)`);
  const text =
    `🚀 <b>任務板</b>\n\n` +
    `<b>Ready:</b> ${ready.length}/${tasks.filter((t) => String(asObj(t).status ?? '') === 'ready').length}\n\n` +
    (lines.length ? lines.join('\n') : '目前沒有 ready 任務') +
    `\n\n面板：<code>${TASKBOARD_BASE_URL}</code>`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyModels(chatId: number): Promise<void> {
  const tags = await fetchOllamaTags();
  const sample = tags.slice(0, 12);
  const buttons = tags.slice(0, 6).map((name) => ({ text: name, callback_data: `set:model:${name}` }));
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push([{ text: '🔄 重新整理', callback_data: 'models:refresh' }]);

  const text =
    `🧠 <b>Ollama 模型</b>\n\n` +
    `<b>Current:</b> <code>${ollamaModel}</code>\n\n` +
    `切換：<code>/model deepseek-r1:8b</code>\n` +
    `列出：<code>/models</code>\n\n` +
    (sample.length
      ? `<b>Local models:</b>\n<code>${sample.join('\n')}</code>${tags.length > sample.length ? `\n...(${tags.length} total)` : ''}`
      : `<b>Local models:</b> (讀取不到，請確認 Ollama 是否啟動：<code>${OLLAMA_BASE_URL}</code>)`);
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML', replyMarkup: { inline_keyboard: rows } });
}

async function replyCleanup(chatId: number): Promise<void> {
  const text =
    `🧹 <b>清理工具</b>\n\n` +
    `清理卡死 runs（避免小蔡卡循環）：\n` +
    `<code>curl -sS -X POST ${TASKBOARD_BASE_URL}/api/openclaw/maintenance/cleanup-stale-runs -H 'Content-Type: application/json' -d '{"olderThanMinutes":45,"limit":50}' | jq .</code>`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyHandoff(chatId: number): Promise<void> {
  const result = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/handoff/generate`, { method: 'POST' }, 15000);
  const robj = asObj(result);
  const ok = robj.ok === true;
  const text = ok
    ? `🧾 <b>Handoff 已生成</b>\n\n<code>${String(robj.path ?? '')}</code>`
    : `⚠️ <b>Handoff 生成失敗</b>\n\n<code>${String(robj.message ?? 'unknown')}</code>`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

function findWorkspaceRoot(): string | null {
  const envRoot = process.env.OPENCLAW_WORKSPACE_ROOT?.trim();
  if (envRoot && fs.existsSync(envRoot)) return envRoot;

  // Launchd may set cwd to /, so also search relative to this module file.
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(moduleDir, '..'),
    path.resolve(moduleDir, '../..'),
    path.resolve(moduleDir, '../../..'),
    path.resolve(moduleDir, '../../../..'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'scripts', 'openclaw-recover-no-response.sh'))) return c;
  }
  return null;
}

async function runRecoveryScript(chatId: number, mode: 'check' | 'cleanup'): Promise<void> {
  if (scriptInFlight) {
    await sendTelegramMessageToChat(chatId, '⏳ 已有自救腳本執行中，請稍後再試', {
      token: TOKEN,
      parseMode: 'HTML',
    });
    return;
  }

  const root = findWorkspaceRoot();
  if (!root) {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    await sendTelegramMessageToChat(
      chatId,
      `⚠️ 找不到工作區根目錄（找不到 <code>scripts/openclaw-recover-no-response.sh</code>）\n\n` +
        `<b>hint:</b>\n` +
        `- 建議設定 <code>OPENCLAW_WORKSPACE_ROOT</code>\n` +
        `- cwd=<code>${process.cwd()}</code>\n` +
        `- moduleDir=<code>${moduleDir}</code>`,
      { token: TOKEN, parseMode: 'HTML' }
    );
    return;
  }

  const scriptPath = path.join(root, 'scripts', 'openclaw-recover-no-response.sh');
  if (!fs.existsSync(scriptPath)) {
    await sendTelegramMessageToChat(chatId, `⚠️ 腳本不存在：<code>${scriptPath}</code>`, { token: TOKEN, parseMode: 'HTML' });
    return;
  }
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') env[k] = v;
  }
  if (mode === 'cleanup') {
    env.CLEANUP_STALE_RUNS = 'true';
    env.OLDER_THAN_MINUTES = env.OLDER_THAN_MINUTES || '45';
  }

  scriptInFlight = true;
  const started = Date.now();

  await sendTelegramMessageToChat(chatId, `🛟 開始執行自救腳本：<code>${mode}</code>\n\n約 5-30 秒，請稍候...`, {
    token: TOKEN,
    parseMode: 'HTML',
  });

  let output = '';
  const maxChars = 32000;

  const child = spawn('bash', [scriptPath], { cwd: root, env });
  child.on('error', async (err) => {
    try {
      const msg = err instanceof Error ? err.message : String(err);
      await sendTelegramMessageToChat(chatId, `⚠️ 無法啟動腳本：<code>${msg}</code>`, {
        token: TOKEN,
        parseMode: 'HTML',
      });
    } catch {
      // ignore (Telegram can fail independently)
    }
  });
  const killTimer = setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {
      // ignore
    }
  }, 120000);

  child.stdout.on('data', (buf) => {
    output += buf.toString('utf8');
    if (output.length > maxChars) output = output.slice(output.length - maxChars);
  });
  child.stderr.on('data', (buf) => {
    output += buf.toString('utf8');
    if (output.length > maxChars) output = output.slice(output.length - maxChars);
  });

  const exitCode: number = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code == null ? 1 : code));
    child.on('error', () => resolve(1));
  });
  clearTimeout(killTimer);

  const elapsedSec = Math.round((Date.now() - started) / 1000);
  const lines = output.split('\n').filter((x) => x.trim().length > 0);
  const tail = lines.slice(-35).join('\n');

  const msg =
    `🛟 <b>自救腳本完成</b>\n\n` +
    `<b>mode:</b> <code>${mode}</code>\n` +
    `<b>exit:</b> <code>${exitCode}</code>\n` +
    `<b>elapsed:</b> <code>${elapsedSec}s</code>\n\n` +
    `<b>tail:</b>\n<code>${tail.slice(0, 3500)}</code>`;

  await sendTelegramMessageToChat(chatId, msg, { token: TOKEN, parseMode: 'HTML' });
  scriptInFlight = false;
}

async function replyRecover(chatId: number): Promise<void> {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ 只巡檢', callback_data: 'run:recover:check' },
        { text: '🧨 巡檢+清理卡死', callback_data: 'run:recover:cleanup' },
      ],
      [{ text: '⬅️ 回主菜單', callback_data: '/start' }],
    ],
  };
  await sendTelegramMessageToChat(chatId, '🛟 <b>自救巡檢</b>\n\n選擇要執行的模式：', {
    token: TOKEN,
    parseMode: 'HTML',
    replyMarkup: keyboard,
  });
}

async function startCodexTriage(chatId: number, issueText: string): Promise<void> {
  // Create a high-signal ops task and immediately start a run.
  const now = new Date();
  const taskId = `t-codex-triage-${now.getTime()}`;
  const desc =
    `【目標】排除 OpenClaw/小蔡 無回應、卡循環、cron error、gateway timeout 等問題，並給出可重複的修復方案。\n\n` +
    `【使用者描述】\n${issueText || '(無)'}\n\n` +
    `【要求】\n` +
    `1. 先跑自救巡檢（不動 DB）：bash scripts/openclaw-recover-no-response.sh\n` +
    `2. 若任務卡死/循環：CLEANUP_STALE_RUNS=true OLDER_THAN_MINUTES=45 bash scripts/openclaw-recover-no-response.sh\n` +
    `3. 檢查並整理：openclaw status / openclaw models status / openclaw cron list\n` +
    `4. 若是 Telegram 無回：確認使用的是 TELEGRAM_CONTROL_BOT_TOKEN 對應的 bot，並確保輪詢程式正常。\n\n` +
    `【交付】\n` +
    `- 根因（1-3 條，明確可驗證）\n` +
    `- 修復內容（含檔案/指令）\n` +
    `- 後續預防（巡檢/告警/避免重複）\n`;

  const created = await fetchJsonWithTimeout(
    `${TASKBOARD_BASE_URL}/api/tasks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        name: 'OpenClaw 問題排除（交給 Codex）',
        description: desc,
        status: 'ready',
        taskType: 'ops',
        priority: 1,
        riskLevel: 'medium',
        tags: ['ops', 'triage', 'codex'],
        agent: { type: 'codex' },
        modelConfig: {
          provider: 'default',
          primary: 'subscription/codex-native',
          fallbacks: ['subscription/codex-fallback'],
        },
      }),
    },
    10000
  );

  if (!asObj(created).id) {
    await sendTelegramMessageToChat(chatId, '⚠️ 建立 Codex 排查任務失敗（/api/tasks）', {
      token: TOKEN,
      parseMode: 'HTML',
    });
    return;
  }

  const started = await fetchJsonWithTimeout(
    `${TASKBOARD_BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/run`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'telegram' }) },
    15000
  );

  const runId = asObj(started).id ? String(asObj(started).id) : '(unknown)';
  const text =
    `🧑‍💻 <b>已交給 Codex 排查</b>\n\n` +
    `<b>task_id:</b> <code>${taskId}</code>\n` +
    `<b>run_id:</b> <code>${runId}</code>\n\n` +
    `你可以在任務板查看進度：<code>${TASKBOARD_BASE_URL}</code>`;

  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

// ── 新增指令：健康檢查、派工切換、日報、修復、甦醒、指令選單 ──

async function replyHealth(chatId: number): Promise<void> {
  const health = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/health`, {}, 8000);
  if (!health) {
    await sendTelegramMessageToChat(chatId, '⚠️ 健康檢查 API 無回應', { token: TOKEN, parseMode: 'HTML' });
    return;
  }
  const h = asObj(health);
  const svc = asObj(h.services);
  const sb = asObj(svc.supabase);
  const tg = asObj(svc.telegram);
  const ae = asObj(h.autoExecutor);
  const mem = asObj(h.memory);
  const text =
    `🏥 <b>系統健康檢查</b>\n\n` +
    `<b>版本：</b> ${h.version ?? '-'}\n` +
    `<b>Uptime：</b> ${h.uptime ?? '-'}s\n` +
    `<b>Supabase：</b> ${sb.ping === 'ok' ? '✅' : sb.configured ? '⚠️' : '❌'}\n` +
    `<b>Telegram：</b> ${tg.configured ? '✅' : '❌'}\n` +
    `<b>AutoExecutor：</b> ${ae.isRunning === true ? '🟢 ON' : '🔴 OFF'}\n` +
    `<b>Dispatch：</b> ${ae.dispatchMode === true ? '🟢 ON' : '🔴 OFF'}\n` +
    `<b>記憶體：</b> ${mem.heapUsed ?? '?'}/${mem.heapTotal ?? '?'} MB`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyDispatchToggle(chatId: number): Promise<void> {
  const status = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/dispatch/status`, {}, 5000);
  const sobj = asObj(status);
  const currentOn = sobj.dispatchMode === true;
  const result = await fetchJsonWithTimeout(
    `${TASKBOARD_BASE_URL}/api/openclaw/dispatch/toggle`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !currentOn }),
    },
    8000
  );
  const robj = asObj(result);
  const newState = robj.dispatchMode === true;
  const text = `🟣 <b>派工模式</b>\n\n${newState ? '✅ 已開啟自動派工' : '⏸ 已關閉自動派工'}`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyReport(chatId: number): Promise<void> {
  await sendTelegramMessageToChat(chatId, '📋 正在生成日報，請稍候...', { token: TOKEN, parseMode: 'HTML' });
  const result = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/daily-report?notify=1`, {}, 30000);
  const robj = asObj(result);
  const text = robj.ok
    ? '📋 <b>日報已生成並發送到 Telegram</b>'
    : `⚠️ <b>日報生成失敗</b>\n\n<code>${String(robj.message ?? robj.error ?? 'unknown').slice(0, 500)}</code>`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyReconcile(chatId: number): Promise<void> {
  const result = await fetchJsonWithTimeout(
    `${TASKBOARD_BASE_URL}/api/openclaw/maintenance/reconcile`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    15000
  );
  const robj = asObj(result);
  const text = robj.ok !== false
    ? `🔧 <b>任務修復完成</b>\n\n掃描：${robj.scanned ?? '?'} | 修正：${Number(robj.fixedToDone ?? 0) + Number(robj.fixedToRunning ?? 0) + Number(robj.fixedToReady ?? 0)} 筆`
    : `⚠️ <b>修復失敗</b>\n\n<code>${String(robj.message ?? 'unknown').slice(0, 500)}</code>`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyWake(chatId: number): Promise<void> {
  const result = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/wake-report`, {}, 8000);
  const robj = asObj(result);
  const reports = Array.isArray(robj.reports) ? (robj.reports as unknown[]) : (Array.isArray(result) ? (result as unknown[]) : []);
  const unresolved = reports.filter((r) => !asObj(r).resolved);
  if (unresolved.length === 0) {
    await sendTelegramMessageToChat(chatId, '🔔 <b>甦醒報告</b>\n\n目前沒有未解決的甦醒報告 ✅', { token: TOKEN, parseMode: 'HTML' });
    return;
  }
  const lines = unresolved.slice(0, 5).map((r, i) => {
    const ro = asObj(r);
    return `${i + 1}. [${ro.level ?? '-'}] 錯誤 ${ro.totalErrors ?? '?'} 次`;
  });
  const text =
    `🔔 <b>甦醒報告</b>\n\n` +
    `<b>未解決：</b> ${unresolved.length}\n\n` +
    lines.join('\n') +
    (unresolved.length > 5 ? `\n...共 ${unresolved.length} 筆` : '');
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

async function replyCmdMenu(chatId: number): Promise<void> {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📋 日報', callback_data: '/report' },
        { text: '🏥 健康檢查', callback_data: '/health' },
      ],
      [
        { text: '🟣 切換派工', callback_data: '/dispatch' },
        { text: '🔔 甦醒報告', callback_data: '/wake' },
      ],
      [
        { text: '🔧 修復孤立任務', callback_data: '/reconcile' },
        { text: '📊 系統狀態', callback_data: '/status' },
      ],
      [{ text: '⬅️ 回主菜單', callback_data: '/start' }],
    ],
  };
  await sendTelegramMessageToChat(chatId, '⌘ <b>指令選單</b>\n\n選擇要執行的指令：', {
    token: TOKEN,
    parseMode: 'HTML',
    replyMarkup: keyboard,
  });
}

async function replyDeputy(chatId: number, arg?: string): Promise<void> {
  if (arg === 'on' || arg === 'off') {
    const enabled = arg === 'on';
    const result = await fetchJsonWithTimeout(
      `${TASKBOARD_BASE_URL}/api/openclaw/deputy/toggle`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, source: 'telegram' }),
      },
      8000
    );
    const robj = asObj(result);
    const text = robj.ok
      ? (enabled
          ? '🤖 <b>暫代模式已開啟</b>\n\nClaude Code 將在每次巡檢時自動執行可處理的任務。\n\n關閉：/deputy off'
          : '⏸ <b>暫代模式已關閉</b>\n\n僅巡檢報告，不自動執行。')
      : `⚠️ 操作失敗：${String(robj.message ?? 'unknown')}`;
    await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
    return;
  }

  if (arg === 'run') {
    await sendTelegramMessageToChat(chatId, '🚀 正在觸發暫代即時執行...', { token: TOKEN });
    const result = await fetchJsonWithTimeout(
      `${TASKBOARD_BASE_URL}/api/openclaw/deputy/run-now`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      10000
    );
    const robj = asObj(result);
    const text = robj.ok
      ? `✅ <b>暫代已觸發</b>\n\nPID: ${robj.pid ?? '?'}\n📝 ${String(robj.logFile ?? '')}`
      : `⚠️ 觸發失敗：${String(robj.message ?? 'unknown')}`;
    await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
    return;
  }

  // 顯示狀態 + 開關按鈕
  const status = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/deputy/status`, {}, 5000);
  const sobj = asObj(status);
  const on = sobj.enabled === true;
  const keyboard = {
    inline_keyboard: [
      [
        { text: on ? '⏸ 關閉暫代' : '🤖 開啟暫代', callback_data: on ? 'deputy:off' : 'deputy:on' },
        { text: '🚀 立即執行', callback_data: 'deputy:run' },
      ],
      [{ text: '⬅️ 回主菜單', callback_data: '/start' }],
    ],
  };
  const lastRun = asObj(sobj.lastRun);
  const text =
    `🤖 <b>暫代模式</b>\n\n` +
    `<b>狀態：</b> ${on ? '🟢 開啟' : '🔴 關閉'}\n` +
    `<b>每輪最多：</b> ${sobj.maxTasksPerRun ?? 3} 個任務\n` +
    `<b>允許 tag：</b> ${Array.isArray(sobj.allowedTags) ? (sobj.allowedTags as string[]).join(', ') : 'auto-ok'}\n` +
    (lastRun.lastDeputyRun ? `\n<b>上次執行：</b> ${String(lastRun.lastDeputyRun).slice(0, 16)}\n<b>結果：</b> ✅${lastRun.success ?? 0} ❌${lastRun.failed ?? 0}` : '');
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML', replyMarkup: keyboard });
}

async function promptCodexTriage(chatId: number): Promise<void> {
  codexTriagePending = true;
  codexTriagePendingAt = Date.now();
  await sendTelegramMessageToChat(
    chatId,
    `🧑‍💻 <b>交給 Codex 排查</b>\n\n` +
      `請用一則訊息描述目前問題（例如：任務板 404、gateway 斷線、Telegram 沒回、run 卡住）。\n` +
      `取消：輸入 <code>cancel</code>`,
    { token: TOKEN, parseMode: 'HTML' }
  );
}

async function poll(): Promise<void> {
  if (!TOKEN) return;
  try {
    const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=${GET_UPDATES_TIMEOUT_SEC}&offset=${offset}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      consecutivePollFailures = Math.min(consecutivePollFailures + 1, 1000);
      const now = Date.now();
      if (now - lastPollHttpErrorLogAt > 60000) {
        lastPollHttpErrorLogAt = now;
        log.error({ status: res.status, detail: detail.slice(0, 400) }, '[TelegramControl] getUpdates failed');
      }
      if (res.status === 409) {
        await notifyOnce('conflict', detail);
        // Another poller is active. Back off hard to avoid log spam/thrashing.
        const step = Math.min(consecutivePollFailures, 5);
        nextPollDelayMs = Math.min(60000, 5000 * Math.pow(2, step));
      } else if (res.status === 401) {
        await notifyOnce('unauthorized', detail);
        // Token is invalid: poll rarely until config is fixed.
        nextPollDelayMs = 60000;
      } else {
        nextPollDelayMs = Math.min(15000, POLL_INTERVAL_MS + consecutivePollFailures * 500);
      }
      return;
    }
    const data = (await res.json()) as {
      ok?: boolean;
      result?: Array<{
        update_id: number;
        message?: { text?: string; chat?: { id: number } };
        callback_query?: { data?: string; message?: { chat?: { id: number } } };
      }>;
    };
    if (!data.ok || !Array.isArray(data.result)) return;
    consecutivePollFailures = 0;
    nextPollDelayMs = POLL_INTERVAL_MS;

    for (const u of data.result) {
      offset = u.update_id + 1;
      const text = String(u.callback_query?.data ?? u.message?.text ?? '').trim();
      const chatId = u.callback_query?.message?.chat?.id ?? u.message?.chat?.id;
      if (!chatId) continue;

      const allowChatId = getAllowChatId();
      if (!allowChatId && !TELEGRAM_ALLOW_ANY_CHAT) {
        // Safe default: do not execute any operation until the allow-chat is configured.
        const now = Date.now();
        if (now - lastUnauthorizedChatNotifyAt > 10 * 60 * 1000) {
          lastUnauthorizedChatNotifyAt = now;
          await sendTelegramMessageToChat(
            chatId,
            '⚠️ 此控制 bot 尚未設定允許的 chat。\n\n' +
              `請在後端 .env 設定 TELEGRAM_CHAT_ID=${chatId} 後重啟（推薦），` +
              '或設定 TELEGRAM_ALLOW_ANY_CHAT=true（僅限本機 dev）。',
            { token: TOKEN, parseMode: 'HTML' }
          );
        }
        continue;
      }
      if (allowChatId && chatId !== allowChatId) {
        // Hard lock: do not execute any operation from unauthorized chats.
        // Optional gentle hint with cooldown to avoid spam.
        const now = Date.now();
        if (now - lastUnauthorizedChatNotifyAt > 10 * 60 * 1000) {
          lastUnauthorizedChatNotifyAt = now;
          await sendTelegramMessageToChat(chatId, '⚠️ 未授權的 chat（此 bot 已鎖定）', {
            token: TOKEN,
            parseMode: 'HTML',
          });
        }
        continue;
      }

      const now = Date.now();
      if (now - lastUpdateLogAt > 3000) {
        lastUpdateLogAt = now;
        const kind = u.callback_query?.data ? 'callback' : 'message';
        log.info(`[TelegramControl] recv update kind=${kind} chatId=${chatId} cmd=${text.split(/\s+/)[0] ?? ''}`);
      }

      if (text === 'deputy:on') {
        await replyDeputy(chatId, 'on');
        continue;
      }
      if (text === 'deputy:off') {
        await replyDeputy(chatId, 'off');
        continue;
      }
      if (text === 'deputy:run') {
        await replyDeputy(chatId, 'run');
        continue;
      }
      if (text === 'run:recover:check') {
        await runRecoveryScript(chatId, 'check');
        continue;
      }
      if (text === 'run:recover:cleanup') {
        await runRecoveryScript(chatId, 'cleanup');
        continue;
      }
      if (text === 'models:refresh') {
        await replyModels(chatId);
        continue;
      }
      if (text.startsWith('set:model:')) {
        const next = text.slice('set:model:'.length).trim();
        if (!next) {
          await replyModels(chatId);
          continue;
        }
        ollamaModel = next;
        saveTelegramState();
        await sendTelegramMessageToChat(chatId, `✅ 已切換 Ollama 模型為：<code>${ollamaModel}</code>`, {
          token: TOKEN,
          parseMode: 'HTML',
        });
        continue;
      }
      // 紅色警戒解除 callback
      if (text.startsWith('alert:resolve:')) {
        const parts = text.split(':');
        const reviewId = parts[2] ?? '';
        const taskId = parts[3] ?? '';
        if (reviewId && taskId) {
          const result = await fetchJsonWithTimeout(
            `${TASKBOARD_BASE_URL}/api/openclaw/red-alert/${reviewId}/resolve`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId }),
            },
            10000
          );
          const ok = result && typeof result === 'object' && (result as Record<string, unknown>).ok === true;
          const reply = ok
            ? `✅ <b>警報已解除</b>\n\n任務 <code>${taskId}</code> 已恢復為可執行狀態`
            : `⚠️ <b>解除失敗</b>\n\n請手動檢查任務板`;
          await sendTelegramMessageToChat(chatId, reply, { token: TOKEN, parseMode: 'HTML' });
        }
        continue;
      }
      // 發想提案審核 callback（proposal:approve / proposal:reject / proposal:task）
      if (text.startsWith('proposal:')) {
        const parts = text.split(':');
        const action = parts[1] ?? '';  // approve | reject | task
        const reviewId = parts[2] ?? '';
        if (reviewId && ['approve', 'reject', 'task'].includes(action)) {
          const decision = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'task';
          const result = await fetchJsonWithTimeout(
            `${TASKBOARD_BASE_URL}/api/openclaw/proposal/${reviewId}/decide`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision }),
            },
            10000
          );
          const ok = result && typeof result === 'object' && (result as Record<string, unknown>).ok === true;
          const taskCreated = ok && (result as Record<string, unknown>).taskId;
          let reply: string;
          if (!ok) {
            reply = `⚠️ <b>操作失敗</b>\n\n請手動到任務板審核`;
          } else if (decision === 'approved') {
            reply = `✅ <b>提案已批准</b>\n\n提案 <code>${reviewId}</code> 已通過`;
          } else if (decision === 'rejected') {
            reply = `❌ <b>提案已駁回</b>\n\n提案 <code>${reviewId}</code> 已駁回`;
          } else {
            reply = `📋 <b>提案已批准並轉為任務</b>\n\n提案 <code>${reviewId}</code> 已轉成任務` +
              (taskCreated ? ` <code>${(result as Record<string, unknown>).taskId}</code>` : '');
          }
          await sendTelegramMessageToChat(chatId, reply, { token: TOKEN, parseMode: 'HTML' });
        }
        continue;
      }
      if (text === '/codex-triage') {
        await promptCodexTriage(chatId);
        continue;
      }

      // Summon / hide the bottom keyboard.
      if (
        text === '🔘 功能欄' ||
        text.toLowerCase() === 'menu' ||
        text === '選單' ||
        text === '按鈕' ||
        text === '功能欄'
      ) {
        await replyMenu(chatId, '📊 系統菜單');
        continue;
      }
      if (text === '🙈 隱藏按鈕' || text.toLowerCase() === '/hide' || text.toLowerCase() === 'hide' || text === '隱藏按鈕') {
        await sendTelegramMessageToChat(chatId, '已隱藏功能欄。需要再叫出請輸入 <code>menu</code> 或 /start', {
          token: TOKEN,
          parseMode: 'HTML',
          replyMarkup: HIDE_KEYBOARD,
        });
        continue;
      }

      // If user just pressed "Codex triage", the next message becomes the issue text.
      if (codexTriagePending) {
        const ageMs = Date.now() - codexTriagePendingAt;
        if (ageMs > 5 * 60 * 1000) {
          codexTriagePending = false;
        } else {
          const t = text.trim();
          if (/^(cancel|取消|算了|不要了)$/i.test(t)) {
            codexTriagePending = false;
            await sendTelegramMessageToChat(chatId, '已取消「交給 Codex 排查」。', { token: TOKEN });
            continue;
          }
          // Take any non-empty input (including text starting with /) as issue description,
          // because user might paste logs that contain leading slashes.
          if (t.length > 0) {
            codexTriagePending = false;
            await startCodexTriage(chatId, t);
            continue;
          }
        }
      }

      const isStop = /^\/stop($|\s)/i.test(text) || ['停止', '緊急終止', 'stop', 'stop all'].includes(text.toLowerCase());
      if (isStop) {
        let args: string[] = [];
        if (text.toLowerCase().startsWith('/stop')) {
          args = text.slice(5).trim().split(/\s+/).filter(Boolean);
        } else if (text.toLowerCase() === 'stop all') {
          args = ['all'];
        }

        const result = await handleStopCommand(args);
        const reply = result.success ? `🛑 ${result.message}` : `⚠️ ${result.message}`;
        await sendTelegramMessageToChat(chatId, reply, { token: TOKEN, parseMode: 'HTML' });
        log.info(`[TelegramControl] 已處理 /stop，回覆: ${result.message}`);
        continue;
      }

      // 功能欄（ReplyKeyboard）文字按鍵
      if (text === '📊 系統狀態') {
        await replyStatus(chatId);
        continue;
      }
      if (text === '🚀 任務板') {
        await replyTasks(chatId);
        continue;
      }
      if (text === '🧠 模型路由') {
        await replyModels(chatId);
        continue;
      }
      if (text === '🧹 清理任務') {
        await replyCleanup(chatId);
        continue;
      }
      if (text === '🛟 自救巡檢') {
        await replyRecover(chatId);
        continue;
      }
      if (text === '🧾 產生 Handoff') {
        await replyHandoff(chatId);
        continue;
      }
      if (text === '📋 日報') {
        await replyReport(chatId);
        continue;
      }
      if (text === '🏥 健康檢查') {
        await replyHealth(chatId);
        continue;
      }
      if (text === '🟣 切換派工') {
        await replyDispatchToggle(chatId);
        continue;
      }
      if (text === '🔧 修復任務') {
        await replyReconcile(chatId);
        continue;
      }
      if (text === '🧑‍💻 交給 Codex 排查') {
        await promptCodexTriage(chatId);
        continue;
      }
      if (text === '❓ 幫助') {
        await replyMenu(chatId, '📊 系統菜單');
        continue;
      }

      const cmdToken = text.split(/\s+/)[0] ?? '';
      const cmd = cmdToken.split('@')[0].toLowerCase();
      if (!cmd || cmd === '/start' || cmd === '/help' || cmd === 'help' || cmd === 'menu' || cmd === '/menu') {
        await replyMenu(chatId, '📊 系統菜單');
        continue;
      }
      if (cmd === '/models') {
        await replyModels(chatId);
        continue;
      }
      if (cmd === '/model') {
        const next = text.replace(/^\/model\s*/i, '').trim();
        if (!next) {
          await replyModels(chatId);
          continue;
        }
        ollamaModel = next;
        saveTelegramState();
        await sendTelegramMessageToChat(chatId, `✅ 已切換 Ollama 模型為：<code>${ollamaModel}</code>`, {
          token: TOKEN,
          parseMode: 'HTML',
        });
        continue;
      }
      if (cmd === '/status') {
        await replyStatus(chatId);
        continue;
      }
      if (cmd === '/tasks') {
        await replyTasks(chatId);
        continue;
      }
      if (cmd === '/cleanup') {
        await replyCleanup(chatId);
        continue;
      }
      if (cmd === '/recover') {
        await replyRecover(chatId);
        continue;
      }
      if (cmd === '/health') {
        await replyHealth(chatId);
        continue;
      }
      if (cmd === '/dispatch') {
        await replyDispatchToggle(chatId);
        continue;
      }
      if (cmd === '/report') {
        await replyReport(chatId);
        continue;
      }
      if (cmd === '/reconcile') {
        await replyReconcile(chatId);
        continue;
      }
      if (cmd === '/wake') {
        await replyWake(chatId);
        continue;
      }
      if (cmd === '/cmd') {
        await replyCmdMenu(chatId);
        continue;
      }
      if (cmd === '/deputy') {
        const arg = text.replace(/^\/deputy\s*/i, '').trim().toLowerCase();
        await replyDeputy(chatId, arg || undefined);
        continue;
      }
      // Ollama chat: default for any non-command message in the authorized chat.
      const ollamaPrompt = extractOllamaPrompt(text);
      if (ollamaPrompt) {
        const prompt = (ollamaPrompt ?? '').trim();
        if (!prompt) {
          await replyMenu(chatId, '📊 系統菜單');
          continue;
        }
        const clipped = prompt.length > 1200 ? prompt.slice(0, 1200) : prompt;
        await sendTelegramMessageToChat(chatId, `🧠 <b>Ollama</b>（${ollamaModel}）思考中...`, { token: TOKEN, parseMode: 'HTML' });
        const result = await callOllamaGenerate(clipped);
        const reply = result.ok ? result.text : `⚠️ ${result.message}`;
        // Send as plain text to avoid HTML/Markdown injection issues.
        await sendTelegramMessageToChat(chatId, reply.slice(0, 3500), {
          token: TOKEN,
        });
        continue;
      }
      if (cmd === '/codex' || cmd === '/codex-triage') {
        const issueText = text.replace(/^\/codex(-triage)?\s*/i, '').trim();
        if (!issueText) {
          await promptCodexTriage(chatId);
        } else {
          await startCodexTriage(chatId, issueText);
        }
        continue;
      }
      if (cmd === '/handoff' || cmd === '/new') {
        await replyHandoff(chatId);
        continue;
      }

      await replyMenu(chatId, `⚠️ 不支援的指令：<code>${cmd}</code>`);
    }
  } catch (e) {
    consecutivePollFailures = Math.min(consecutivePollFailures + 1, 1000);
    nextPollDelayMs = Math.min(15000, POLL_INTERVAL_MS + consecutivePollFailures * 500);
    log.error({ err: e }, '[TelegramControl] poll error');
  }
}

function loop(): void {
  if (!running) return;
  poll().finally(() => {
    if (running) setTimeout(loop, nextPollDelayMs);
  });
}

export function startTelegramStopPoll(): void {
  if (!TOKEN) return;
  if (running) return;
  running = true;

  loadTelegramState();
  const tokenBotId = TOKEN.split(':')[0] || '(unknown)';
  log.info(`[TelegramControl] token bot_id=${tokenBotId}`);
  log.info('[TelegramControl] 啟動中（getUpdates 輪詢）...');
  ensureWebhookDisabled()
    .finally(() => logBotIdentityOnce())
    .finally(() => {
      log.info('[TelegramControl] 已啟動（getUpdates 輪詢），支援 /start /status /tasks /health /dispatch /report /reconcile /wake /cmd /recover /codex-triage /stop ...');
      loop();
    });
}

export function stopTelegramStopPoll(): void {
  running = false;
}
