/**
 * Telegram 控制輪詢（不需要 webhook）
 * - 設定 TELEGRAM_CONTROL_BOT_TOKEN 或 TELEGRAM_STOP_BOT_TOKEN 就能用
 * - 支援 /start 菜單 + /recover 自救巡檢 + /codex-triage
 *
 * NOTE:
 * Telegram 的 webhook 無法指向 localhost，因此本專案採用 getUpdates 長輪詢。
 */
import { createLogger } from '../logger.js';
import { sendTelegramMessageToChat } from '../utils/telegram.js';
import { handleStopCommand } from '../emergency-stop.js';
import { sanitize } from '../utils/key-vault.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── 模組匯入 ──
import { getModelConfig, getAvailableModels, getModelsGrouped, getCommanderModels, getModelProvider, getProviderKey, callOpenAICompatible } from './model-registry.js';
import { NEUXA_WORKSPACE } from './security.js';
import { executeNEUXAAction, appendInteractionLog, type ActionResult } from './action-handlers.js';
import { xiaocaiThink, loadSoulCoreOnce, loadAwakeningContext, getTaskSnapshot, getSystemStatus } from './xiaocai-think.js';

const log = createLogger('telegram');

// ── 環境變數 ──
const TOKEN = (process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() || process.env.TELEGRAM_STOP_BOT_TOKEN?.trim()) ?? '';
const GROUP_TOKEN = process.env.TELEGRAM_GROUP_BOT_TOKEN?.trim() ?? '';
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID?.trim() ?? '';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';
const TELEGRAM_ALLOW_ANY_CHAT = process.env.TELEGRAM_ALLOW_ANY_CHAT === 'true';
const POLL_INTERVAL_MS = 1500;
const GET_UPDATES_TIMEOUT_SEC = 20;
const FETCH_TIMEOUT_MS = 30000;
const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');
const OLLAMA_BASE_URL = (process.env.OLLAMA_URL?.trim() || 'http://localhost:11434').replace(/\/+$/, '');
let ollamaModel = process.env.OLLAMA_TELEGRAM_MODEL?.trim() || 'llama3.2:latest';
let xiaocaiMainModel = 'gemini-2.5-flash';
const TELEGRAM_STATE_PATH = path.join(process.cwd(), 'runtime-checkpoints', 'telegram-control.json');
const XIAOCAI_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() ?? '';

// ── 輪詢狀態 ──
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

// 小蔡 bot 狀態
let xiaocaiOffset = 0;
let xiaocaiRunning = false;
const xiaocaiHistory = new Map<number, Array<{ role: string; text: string }>>();

// 心跳狀態
let lastUserActivityAt = 0; // 老蔡最後一次發訊息的時間
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000; // 15 分鐘
const HEARTBEAT_IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 老蔡 5 分鐘沒說話才觸發
const HEARTBEAT_CHAT_ID = -1; // 虛擬 chatId，不會發 Telegram

// 群組 bot 狀態
let groupOffset = 0;
let groupRunning = false;

// ── 工具函數 ──

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

// ── Ollama ──

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
  if (/^\/ollama(\s|$)/i.test(t)) return t.replace(/^\/ollama\s*/i, '').trim() || null;
  if (!t.startsWith('/')) return t;
  return null;
}

async function fetchOllamaTags(): Promise<string[]> {
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

// ── 狀態持久化 ──

function loadTelegramState(): void {
  try {
    if (!fs.existsSync(TELEGRAM_STATE_PATH)) return;
    const raw = fs.readFileSync(TELEGRAM_STATE_PATH, 'utf8');
    const data: unknown = JSON.parse(raw);
    const dobj = asObj(data);
    const m = String(dobj.ollamaModel ?? '').trim();
    if (m) ollamaModel = m;
    const mm = String(dobj.xiaocaiMainModel ?? '').trim();
    if (mm) xiaocaiMainModel = mm;
  } catch {
    // ignore
  }
}

function saveTelegramState(): void {
  try {
    const dir = path.dirname(TELEGRAM_STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TELEGRAM_STATE_PATH, JSON.stringify({ ollamaModel, xiaocaiMainModel, savedAt: new Date().toISOString() }, null, 2) + '\n', 'utf8');
  } catch {
    // ignore
  }
}

// ── Bot 初始化 ──

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

// ── 選單 / UI ──

const MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📊 系統狀態', callback_data: '/status' },
      { text: '🚀 任務板', callback_data: '/tasks' },
    ],
    [
      { text: '🧠 切換模型', callback_data: '/models' },
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

const MENU_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: '📊 系統狀態' }, { text: '🚀 任務板' }],
    [{ text: '🧠 切換模型' }, { text: '🧹 清理任務' }],
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

// ── 指令處理 ──

async function replyStatus(chatId: number): Promise<void> {
  const tasks = (await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/tasks`, {}, 4000)) as unknown;
  const runs = (await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/runs`, {}, 4000)) as unknown;
  const auto = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/auto-executor/status`, {}, 4000);

  const taskList = Array.isArray(tasks) ? tasks : [];
  const runList = Array.isArray(runs) ? runs : [];

  const total = taskList.length;
  const ready = taskList.filter((t) => String(asObj(t).status ?? '') === 'ready').length;
  const runningTasks = taskList.filter((t) => String(asObj(t).status ?? '') === 'running').length;
  const done = taskList.filter((t) => String(asObj(t).status ?? '') === 'done').length;

  const activeRuns = runList.filter((r) =>
    ['queued', 'running', 'retrying'].includes(String(asObj(r).status ?? ''))
  ).length;

  const modelLabel = getAvailableModels().find(m => m.id === xiaocaiMainModel)?.label || xiaocaiMainModel;
  const text =
    `📊 <b>系統狀態</b>\n\n` +
    `<b>小蔡主模型：</b>${modelLabel} (<code>${xiaocaiMainModel}</code>)\n` +
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
  const ready = tasks.filter((t) => String(asObj(t).status ?? '') === 'ready').slice(0, 10);
  const lines = ready.map((t, i) => `${i + 1}. ${String(asObj(t).name ?? '(no name)')} (<code>${String(asObj(t).id ?? '')}</code>)`);
  const text =
    `🚀 <b>任務板</b>\n\n` +
    `<b>Ready:</b> ${ready.length}/${tasks.filter((t) => String(asObj(t).status ?? '') === 'ready').length}\n\n` +
    (lines.length ? lines.join('\n') : '目前沒有 ready 任務') +
    `\n\n面板：<code>${TASKBOARD_BASE_URL}</code>`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML' });
}

const providerIcons: Record<string, string> = { Google: '🔵', DeepSeek: '🐋', Kimi: '🌙', xAI: '🤖', OpenRouter: '🆓', Ollama: '🖥️' };

async function replyModels(chatId: number): Promise<void> {
  const commanders = getCommanderModels();
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (const group of commanders) {
    rows.push([{ text: `── ${providerIcons[group.provider] || '▪️'} ${group.provider} ──`, callback_data: 'noop' }]);
    for (let i = 0; i < group.models.length; i += 2) {
      const row: Array<{ text: string; callback_data: string }> = [];
      for (const m of group.models.slice(i, i + 2)) {
        const isCurrent = m.id === xiaocaiMainModel;
        row.push({ text: isCurrent ? `✅ ${m.label}` : m.label, callback_data: `set:mainmodel:${m.id}` });
      }
      rows.push(row);
    }
  }
  rows.push([{ text: '🔄 重新整理', callback_data: 'models:refresh' }]);

  const currentLabel = getAvailableModels().find(m => m.id === xiaocaiMainModel)?.label || xiaocaiMainModel;
  const currentProvider = getModelProvider(xiaocaiMainModel);
  const text =
    `🧠 <b>小蔡主模型切換</b>（指揮官級）\n\n` +
    `<b>目前：</b>${currentLabel}\n` +
    `<b>Provider：</b>${currentProvider}\n` +
    `<b>模型 ID：</b><code>${xiaocaiMainModel}</code>\n\n` +
    `只顯示能當指揮官的模型\n子代理級（Ollama/Flash Lite）由 ask_ai 自動調用`;
  await sendTelegramMessageToChat(chatId, text, { token: TOKEN, parseMode: 'HTML', replyMarkup: { inline_keyboard: rows } });
}

async function replyModelsXiaocai(chatId: number): Promise<void> {
  const commanders = getCommanderModels();
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (const group of commanders) {
    rows.push([{ text: `── ${providerIcons[group.provider] || '▪️'} ${group.provider} ──`, callback_data: 'noop' }]);
    for (let i = 0; i < group.models.length; i += 2) {
      const row: Array<{ text: string; callback_data: string }> = [];
      for (const m of group.models.slice(i, i + 2)) {
        const isCurrent = m.id === xiaocaiMainModel;
        row.push({ text: isCurrent ? `✅ ${m.label}` : m.label, callback_data: `set:mainmodel:${m.id}` });
      }
      rows.push(row);
    }
  }
  rows.push([{ text: '🔄 重新整理', callback_data: 'models:refresh' }]);

  const currentLabel = getAvailableModels().find(m => m.id === xiaocaiMainModel)?.label || xiaocaiMainModel;
  const currentProvider = getModelProvider(xiaocaiMainModel);
  const text =
    `🧠 <b>小蔡主模型切換</b>（指揮官級）\n\n` +
    `<b>目前：</b>${currentLabel}\n` +
    `<b>Provider：</b>${currentProvider}\n` +
    `<b>模型 ID：</b><code>${xiaocaiMainModel}</code>\n\n` +
    `只顯示能當指揮官的模型\n子代理級（Ollama/Flash Lite）由 ask_ai 自動調用`;
  await sendTelegramMessageToChat(chatId, text, { token: XIAOCAI_TOKEN, parseMode: 'HTML', replyMarkup: { inline_keyboard: rows } });
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
      // ignore
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

// ── 小蔡任務派發 ──

async function sendXiaojiTaskAssignment(
  chatId: number,
  taskName: string,
  taskDesc: string,
  taskId: string,
  priority: string
): Promise<void> {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ 接收任務', callback_data: `xiaoji:accept:${taskId}` },
        { text: '❌ 無法執行', callback_data: `xiaoji:reject:${taskId}` },
      ],
      [
        { text: '📋 回報完成', callback_data: `xiaoji:done:${taskId}` },
      ],
    ],
  };
  await sendTelegramMessageToChat(chatId,
    `📋 <b>【小蔡任務指派】</b>\n\n` +
    `<b>任務：</b>${taskName}\n` +
    `<b>優先級：</b>${priority}\n` +
    `<b>ID：</b><code>${taskId}</code>\n\n` +
    `<b>說明：</b>\n${(taskDesc || '無').slice(0, 500)}\n\n` +
    `<i>暫代模式中，Claude 已分配此任務。\n請接收後執行，完成後點「回報完成」。</i>`,
    { token: GROUP_TOKEN || TOKEN, parseMode: 'HTML', replyMarkup: keyboard }
  );
}

async function handleXiaojiCallback(chatId: number, action: string, taskId: string): Promise<void> {
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(OPENCLAW_API_KEY ? { 'x-api-key': OPENCLAW_API_KEY } : {}),
  };
  if (action === 'accept') {
    await fetchJsonWithTimeout(
      `${TASKBOARD_BASE_URL}/api/openclaw/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'in_progress', assignee: 'xiaoji' }),
      },
      5000
    );
    await sendTelegramMessageToChat(chatId,
      `✅ <b>小蔡已接收任務</b>\n\n任務 <code>${taskId}</code> 已開始執行。`,
      { token: GROUP_TOKEN || TOKEN, parseMode: 'HTML' }
    );
  } else if (action === 'reject') {
    await sendTelegramMessageToChat(chatId,
      `⚠️ <b>小蔡無法執行</b>\n\n任務 <code>${taskId}</code> 保持佇列中，等老蔡回來處理。`,
      { token: GROUP_TOKEN || TOKEN, parseMode: 'HTML' }
    );
  } else if (action === 'done') {
    await fetchJsonWithTimeout(
      `${TASKBOARD_BASE_URL}/api/openclaw/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'done', progress: 100 }),
      },
      5000
    );
    await sendTelegramMessageToChat(chatId,
      `🎉 <b>任務完成</b>\n\n小蔡已完成任務 <code>${taskId}</code>`,
      { token: GROUP_TOKEN || TOKEN, parseMode: 'HTML' }
    );
  }
}

async function replyDelegate(chatId: number): Promise<void> {
  const deputyState = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/deputy/status`, {}, 5000);
  const dobj = asObj(deputyState);
  const on = dobj.enabled === true;

  if (!on) {
    await sendTelegramMessageToChat(chatId,
      `⚠️ 暫代模式未開啟，無法派發任務。\n\n開啟：/deputy on`,
      { token: GROUP_TOKEN || TOKEN, parseMode: 'HTML' }
    );
    return;
  }

  const tasks = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/list-tasks`, {}, 5000);
  if (!tasks || !Array.isArray(tasks)) {
    await sendTelegramMessageToChat(chatId, '⚠️ 無法取得任務列表', { token: GROUP_TOKEN || TOKEN });
    return;
  }
  const queued = (tasks as Array<Record<string, unknown>>).filter(
    (t) => t.status === 'queued' || t.status === 'ready'
  ).slice(0, 5);

  if (queued.length === 0) {
    await sendTelegramMessageToChat(chatId, '✅ 目前沒有待執行的任務', { token: GROUP_TOKEN || TOKEN });
    return;
  }

  for (const t of queued) {
    await sendXiaojiTaskAssignment(
      chatId,
      String(t.name || '未命名'),
      String(t.description || ''),
      String(t.id || ''),
      `P${t.priority || 3}`
    );
  }
}

async function replyDeputy(chatId: number, arg?: string): Promise<void> {
  if (arg === 'on' || arg === 'off') {
    const enabled = arg === 'on';
    const result = await fetchJsonWithTimeout(
      `${TASKBOARD_BASE_URL}/api/openclaw/deputy/toggle`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(OPENCLAW_API_KEY ? { 'x-api-key': OPENCLAW_API_KEY } : {}),
        },
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

  const status = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/deputy/status`, {}, 5000);
  const sobj = asObj(status);
  const on = sobj.enabled === true;
  const keyboard = {
    inline_keyboard: [
      [
        { text: on ? '⏸ 關閉暫代' : '🤖 開啟暫代', callback_data: on ? 'deputy:off' : 'deputy:on' },
        { text: '🚀 立即執行', callback_data: 'deputy:run' },
      ],
      ...(on ? [[{ text: '📋 派工給小蔡', callback_data: 'deputy:delegate' }]] : []),
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

// ══════════════════════════════════════════════════════════════
// 控制 Bot polling loop
// ══════════════════════════════════════════════════════════════

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
        const step = Math.min(consecutivePollFailures, 5);
        nextPollDelayMs = Math.min(60000, 5000 * Math.pow(2, step));
      } else if (res.status === 401) {
        await notifyOnce('unauthorized', detail);
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

      // Callback 路由
      if (text === 'noop') continue; // provider 分類標題，不做事
      if (text === 'deputy:on') { await replyDeputy(chatId, 'on'); continue; }
      if (text === 'deputy:off') { await replyDeputy(chatId, 'off'); continue; }
      if (text === 'deputy:run') { await replyDeputy(chatId, 'run'); continue; }
      if (text === 'deputy:delegate') { await replyDelegate(chatId); continue; }
      if (text.startsWith('xiaoji:')) {
        const parts = text.split(':');
        const action = parts[1] ?? '';
        const taskId = parts[2] ?? '';
        if (taskId && ['accept', 'reject', 'done'].includes(action)) {
          await handleXiaojiCallback(chatId, action, taskId);
        }
        continue;
      }
      if (text === 'run:recover:check') { await runRecoveryScript(chatId, 'check'); continue; }
      if (text === 'run:recover:cleanup') { await runRecoveryScript(chatId, 'cleanup'); continue; }
      if (text === 'models:refresh') { await replyModels(chatId); continue; }
      if (text.startsWith('set:model:')) {
        const next = text.slice('set:model:'.length).trim();
        if (!next) { await replyModels(chatId); continue; }
        ollamaModel = next;
        saveTelegramState();
        await sendTelegramMessageToChat(chatId, `✅ 已切換 Ollama 模型為：<code>${ollamaModel}</code>`, { token: TOKEN, parseMode: 'HTML' });
        continue;
      }
      if (text.startsWith('set:mainmodel:')) {
        const next = text.slice('set:mainmodel:'.length).trim();
        if (!next) { await replyModels(chatId); continue; }
        const prev = xiaocaiMainModel;
        xiaocaiMainModel = next;
        saveTelegramState();
        const models = getAvailableModels();
        const label = models.find(m => m.id === next)?.label || next;
        log.info(`[TelegramControl] 主模型切換：${prev} → ${next}`);
        await sendTelegramMessageToChat(chatId, `✅ 小蔡主模型已切換\n\n<b>${label}</b>\n<code>${next}</code>\n\n即時生效，不需重啟`, { token: TOKEN, parseMode: 'HTML' });
        continue;
      }
      if (text.startsWith('alert:resolve:')) {
        const parts = text.split(':');
        const reviewId = parts[2] ?? '';
        const taskId = parts[3] ?? '';
        if (reviewId && taskId) {
          const result = await fetchJsonWithTimeout(
            `${TASKBOARD_BASE_URL}/api/openclaw/red-alert/${reviewId}/resolve`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) },
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
      if (text.startsWith('proposal:')) {
        const parts = text.split(':');
        const action = parts[1] ?? '';
        const reviewId = parts[2] ?? '';
        if (reviewId && ['approve', 'reject', 'task'].includes(action)) {
          const decision = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'task';
          const result = await fetchJsonWithTimeout(
            `${TASKBOARD_BASE_URL}/api/openclaw/proposal/${reviewId}/decide`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) },
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
      if (text === '/codex-triage') { await promptCodexTriage(chatId); continue; }

      // 功能欄
      if (text === '🔘 功能欄' || text.toLowerCase() === 'menu' || text === '選單' || text === '按鈕' || text === '功能欄') {
        await replyMenu(chatId, '📊 系統菜單'); continue;
      }
      if (text === '🙈 隱藏按鈕' || text.toLowerCase() === '/hide' || text.toLowerCase() === 'hide' || text === '隱藏按鈕') {
        await sendTelegramMessageToChat(chatId, '已隱藏功能欄。需要再叫出請輸入 <code>menu</code> 或 /start', { token: TOKEN, parseMode: 'HTML', replyMarkup: HIDE_KEYBOARD });
        continue;
      }

      // Codex triage pending
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

      // ReplyKeyboard 文字路由
      if (text === '📊 系統狀態') { await replyStatus(chatId); continue; }
      if (text === '🚀 任務板') { await replyTasks(chatId); continue; }
      if (text === '🧠 切換模型' || text === '🧠 模型路由') { await replyModels(chatId); continue; }
      if (text === '🧹 清理任務') { await replyCleanup(chatId); continue; }
      if (text === '🛟 自救巡檢') { await replyRecover(chatId); continue; }
      if (text === '🧾 產生 Handoff') { await replyHandoff(chatId); continue; }
      if (text === '📋 日報') { await replyReport(chatId); continue; }
      if (text === '🏥 健康檢查') { await replyHealth(chatId); continue; }
      if (text === '🟣 切換派工') { await replyDispatchToggle(chatId); continue; }
      if (text === '🔧 修復任務') { await replyReconcile(chatId); continue; }
      if (text === '🧑‍💻 交給 Codex 排查') { await promptCodexTriage(chatId); continue; }
      if (text === '❓ 幫助') { await replyMenu(chatId, '📊 系統菜單'); continue; }

      // 指令路由
      const cmdToken = text.split(/\s+/)[0] ?? '';
      const cmd = cmdToken.split('@')[0].toLowerCase();
      if (!cmd || cmd === '/start' || cmd === '/help' || cmd === 'help' || cmd === 'menu' || cmd === '/menu') { await replyMenu(chatId, '📊 系統菜單'); continue; }
      if (cmd === '/models') { await replyModels(chatId); continue; }
      if (cmd === '/model') {
        const next = text.replace(/^\/model\s*/i, '').trim();
        if (!next) { await replyModels(chatId); continue; }
        ollamaModel = next;
        saveTelegramState();
        await sendTelegramMessageToChat(chatId, `✅ 已切換 Ollama 模型為：<code>${ollamaModel}</code>`, { token: TOKEN, parseMode: 'HTML' });
        continue;
      }
      if (cmd === '/status') { await replyStatus(chatId); continue; }
      if (cmd === '/tasks') { await replyTasks(chatId); continue; }
      if (cmd === '/cleanup') { await replyCleanup(chatId); continue; }
      if (cmd === '/recover') { await replyRecover(chatId); continue; }
      if (cmd === '/health') { await replyHealth(chatId); continue; }
      if (cmd === '/dispatch') { await replyDispatchToggle(chatId); continue; }
      if (cmd === '/report') { await replyReport(chatId); continue; }
      if (cmd === '/reconcile') { await replyReconcile(chatId); continue; }
      if (cmd === '/wake') { await replyWake(chatId); continue; }
      if (cmd === '/cmd') { await replyCmdMenu(chatId); continue; }
      if (cmd === '/delegate') { await replyDelegate(chatId); continue; }
      if (cmd === '/deputy') {
        const arg = text.replace(/^\/deputy\s*/i, '').trim().toLowerCase();
        await replyDeputy(chatId, arg || undefined);
        continue;
      }
      // Ollama 聊天
      const ollamaPrompt = extractOllamaPrompt(text);
      if (ollamaPrompt) {
        const prompt = (ollamaPrompt ?? '').trim();
        if (!prompt) { await replyMenu(chatId, '📊 系統菜單'); continue; }
        const clipped = prompt.length > 1200 ? prompt.slice(0, 1200) : prompt;
        await sendTelegramMessageToChat(chatId, `🧠 <b>Ollama</b>（${ollamaModel}）思考中...`, { token: TOKEN, parseMode: 'HTML' });
        const result = await callOllamaGenerate(clipped);
        const reply = result.ok ? result.text : `⚠️ ${result.message}`;
        await sendTelegramMessageToChat(chatId, reply.slice(0, 3500), { token: TOKEN });
        continue;
      }
      if (cmd === '/codex' || cmd === '/codex-triage') {
        const issueText = text.replace(/^\/codex(-triage)?\s*/i, '').trim();
        if (!issueText) { await promptCodexTriage(chatId); } else { await startCodexTriage(chatId, issueText); }
        continue;
      }
      if (cmd === '/handoff' || cmd === '/new') { await replyHandoff(chatId); continue; }

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

// ══════════════════════════════════════════════════════════════
// 群組 Bot polling loop
// ══════════════════════════════════════════════════════════════

async function groupPoll(): Promise<void> {
  if (!GROUP_TOKEN || !GROUP_CHAT_ID) return;
  try {
    const url = `https://api.telegram.org/bot${GROUP_TOKEN}/getUpdates?timeout=${GET_UPDATES_TIMEOUT_SEC}&offset=${groupOffset}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (res.status === 409) {
        log.warn('[GroupBot] 409 Conflict — 另一個 polling 在跑，等待重試');
      } else {
        log.error({ status: res.status, detail: detail.slice(0, 200) }, '[GroupBot] getUpdates failed');
      }
      return;
    }
    const json = await res.json() as { ok?: boolean; result?: Array<Record<string, unknown>> };
    if (!json.ok || !Array.isArray(json.result)) return;

    for (const u of json.result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uu = u as any;
      const uid = uu.update_id as number;
      if (uid >= groupOffset) groupOffset = uid + 1;

      log.info(`[GroupBot] update keys=${Object.keys(uu).join(',')} update_id=${uid}`);

      const msg = (uu.message ?? uu.callback_query?.message) as Record<string, unknown> | undefined;
      if (!msg) { log.info(`[GroupBot] skip: no msg`); continue; }
      const chat = msg.chat as Record<string, unknown> | undefined;
      const chatId = chat?.id as number | undefined;
      if (!chatId) { log.info(`[GroupBot] skip: no chatId`); continue; }

      const cbData = uu.callback_query?.data as string | undefined;
      const text = cbData || (msg.text as string | undefined) || '';

      log.info(`[GroupBot] recv chatId=${chatId} text="${text.slice(0, 80)}" has_text=${!!msg.text} cbData=${cbData ?? 'none'}`);

      if (text.startsWith('xiaoji:')) {
        const parts = text.split(':');
        const action = parts[1] ?? '';
        const taskId = parts[2] ?? '';
        if (taskId && ['accept', 'reject', 'done'].includes(action)) {
          await handleXiaojiCallback(chatId, action, taskId);
        }
        continue;
      }

      if (text === '/delegate' || text === 'deputy:delegate') { await replyDelegate(chatId); continue; }

      const normalText = text.replace(/@\w+$/, '').trim();
      if (normalText === '/start' || normalText === '/menu' || normalText === 'menu' || normalText === '/help' || normalText === 'group:menu') {
        const keyboard = {
          inline_keyboard: [
            [
              { text: '📊 系統狀態', callback_data: 'group:status' },
              { text: '🎯 任務板', callback_data: 'group:tasks' },
            ],
            [
              { text: '🤖 小蔡暫代 ON', callback_data: 'group:deputy_on' },
              { text: '🛑 小蔡暫代 OFF', callback_data: 'group:deputy_off' },
            ],
            [
              { text: '📋 派工給小蔡', callback_data: 'deputy:delegate' },
              { text: '🔄 甦醒報告', callback_data: 'group:wake' },
            ],
          ],
        };
        await sendTelegramMessageToChat(
          chatId,
          `🚀 <b>超級救援家 指揮中心</b>\n\n請選擇操作：`,
          { token: GROUP_TOKEN, parseMode: 'HTML', replyMarkup: keyboard }
        );
        continue;
      }

      if (text === 'group:status' || text === '/status') { await replyStatus(chatId); continue; }
      if (text === 'group:tasks' || text === '/tasks') { await replyTasks(chatId); continue; }
      if (text === 'group:wake' || text === '/wake') { await replyWake(chatId); continue; }

      if (text === 'group:deputy_on' || text === '/deputy on') {
        const enabled = true;
        const result = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/deputy/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(OPENCLAW_API_KEY ? { 'x-api-key': OPENCLAW_API_KEY } : {}) }, body: JSON.stringify({ enabled, source: 'telegram-group' }) }, 8000);
        const robj = asObj(result);
        await sendTelegramMessageToChat(chatId, robj.ok ? '🤖 <b>暫代模式已開啟</b>\n\nClaude Code 將自動執行可處理的任務。\n關閉：/deputy off' : `⚠️ 操作失敗：${String(robj.message ?? 'unknown')}`, { token: GROUP_TOKEN, parseMode: 'HTML' });
        continue;
      }

      if (text === 'group:deputy_off' || text === '/deputy off') {
        const enabled = false;
        const result = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/deputy/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(OPENCLAW_API_KEY ? { 'x-api-key': OPENCLAW_API_KEY } : {}) }, body: JSON.stringify({ enabled, source: 'telegram-group' }) }, 8000);
        const robj = asObj(result);
        await sendTelegramMessageToChat(chatId, robj.ok ? '⏸ <b>暫代模式已關閉</b>' : `⚠️ 操作失敗：${String(robj.message ?? 'unknown')}`, { token: GROUP_TOKEN, parseMode: 'HTML' });
        continue;
      }

      // 老蔡回來自動停止暫代
      const isCallback = !!cbData;
      const isDeputyCmd = text.startsWith('/deputy') || text.startsWith('deputy:');
      const isBotMsg = !!(msg.from as Record<string, unknown> | undefined)?.is_bot;
      if (!isCallback && !isDeputyCmd && !isBotMsg && text.length > 0) {
        try {
          const deputyState = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/deputy/status`, {}, 3000);
          const dobj = asObj(deputyState);
          if (dobj.enabled === true) {
            const toggleRes = await fetchJsonWithTimeout(
              `${TASKBOARD_BASE_URL}/api/openclaw/deputy/toggle`,
              { method: 'POST', headers: { 'Content-Type': 'application/json', ...(OPENCLAW_API_KEY ? { 'x-api-key': OPENCLAW_API_KEY } : {}) }, body: JSON.stringify({ enabled: false, source: 'boss-return' }) },
              5000
            );
            const toggleObj = asObj(toggleRes);
            if (toggleObj.ok) {
              await sendTelegramMessageToChat(chatId,
                `👑 <b>老蔡已接手</b>\n\n` +
                `偵測到老蔡活動，暫代模式已自動關閉。\n` +
                `小蔡：老蔡回來了，指揮權交還。\n\n` +
                `如需重新開啟：/deputy on`,
                { token: GROUP_TOKEN, parseMode: 'HTML' }
              );
              log.info('[Deputy] 老蔡回來 → 暫代模式自動關閉（群組偵測）');
            } else {
              log.warn(`[Deputy] toggle API 失敗: ${String(toggleObj.message ?? 'unknown')}`);
            }
          }
        } catch { /* ignore */ }
      }
    }
  } catch (e: unknown) {
    log.error({ err: e }, '[GroupBot] poll error');
  }
}

function groupLoop(): void {
  if (!groupRunning) return;
  groupPoll().finally(() => {
    if (groupRunning) setTimeout(groupLoop, POLL_INTERVAL_MS);
  });
}

// ══════════════════════════════════════════════════════════════
// 小蔡 Bot (@xiaoji_cai_bot) polling loop
// ══════════════════════════════════════════════════════════════

/** 清除殘留的 JSON action blocks — 發送到 Telegram 前必經 */
function stripActionJson(text: string): string {
  if (!text) return text;
  // 1. 用 extractActionJsons 找到完整 JSON 並移除
  const found = extractActionJsons(text);
  if (found) {
    for (const j of found) text = text.replace(j, '');
  }
  // 2. 移除包裹 JSON 的 markdown code blocks
  text = text.replace(/```json\s*```/g, '').replace(/```\s*```/g, '');
  text = text.replace(/^\s*```(?:json)?\s*$/gm, '');
  // 3. 移除殘留的 {"action"...} 片段（不完整 JSON）
  text = text.replace(/\{"action"[^}]*\}/g, '');
  // 4. 移除孤立的 ``` 標記
  text = text.replace(/^\s*```\s*$/gm, '');
  return text.trim();
}

/** JSON action 解析器（支援 content 內含花括號）*/
function extractActionJsons(text: string): string[] | null {
  const results: string[] = [];
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf('{"action"', searchFrom);
    if (idx === -1) break;
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;
    for (let i = idx; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"' && !escape) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end > idx) {
      const candidate = text.slice(idx, end + 1);
      try {
        JSON.parse(candidate);
        results.push(candidate);
      } catch { /* skip */ }
      searchFrom = end + 1;
    } else {
      searchFrom = idx + 1;
    }
  }
  return results.length > 0 ? results : null;
}

async function xiaocaiPoll(): Promise<void> {
  if (!XIAOCAI_TOKEN) return;
  try {
    const url = `https://api.telegram.org/bot${XIAOCAI_TOKEN}/getUpdates?offset=${xiaocaiOffset}&timeout=${GET_UPDATES_TIMEOUT_SEC}&allowed_updates=["message","callback_query"]`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) { log.warn(`[XiaocaiBot] poll HTTP ${res.status}`); return; }
    const data = (await res.json()) as { ok: boolean; result?: Array<Record<string, unknown>> };
    if (!data.ok || !data.result?.length) return;

    for (const update of data.result) {
      xiaocaiOffset = Math.max(xiaocaiOffset, (update.update_id as number) + 1);

      // callback_query（模型切換按鈕）
      const cbQuery = update.callback_query as Record<string, unknown> | undefined;
      if (cbQuery) {
        const cbData = String(cbQuery.data ?? '').trim();
        const cbMsg = cbQuery.message as Record<string, unknown> | undefined;
        const cbChat = cbMsg?.chat as Record<string, unknown> | undefined;
        const cbChatId = cbChat?.id as number;
        if (cbChatId && cbData) {
          if (cbData.startsWith('set:mainmodel:')) {
            const next = cbData.slice('set:mainmodel:'.length).trim();
            if (next) {
              const prev = xiaocaiMainModel;
              xiaocaiMainModel = next;
              saveTelegramState();
              const models = getAvailableModels();
              const label = models.find(m => m.id === next)?.label || next;
              log.info(`[XiaocaiBot] 主模型切換：${prev} → ${next}`);
              await sendTelegramMessageToChat(cbChatId, `✅ 小蔡主模型已切換\n\n${label}\n${next}\n\n即時生效，不需重啟`, { token: XIAOCAI_TOKEN });
            }
          } else if (cbData === 'models:refresh' || cbData === '/models') {
            await replyModelsXiaocai(cbChatId);
          }
        }
        continue;
      }

      const msg = update.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const chat = msg.chat as Record<string, unknown>;
      const chatId = chat?.id as number;

      // ── 圖片處理：取得 photo + caption ──
      const photoArr = msg.photo as Array<Record<string, unknown>> | undefined;
      const caption = ((msg.caption as string) ?? '').trim();
      let imageBase64: string | undefined;
      let imageMime: string | undefined;

      if (photoArr && photoArr.length > 0) {
        // Telegram photo 陣列由小到大排列，取最大的（最後一個）
        const largest = photoArr[photoArr.length - 1];
        const fileId = largest.file_id as string;
        try {
          // 1. getFile 取得 file_path
          const fileResp = await fetch(`https://api.telegram.org/bot${XIAOCAI_TOKEN}/getFile?file_id=${fileId}`, { signal: AbortSignal.timeout(10000) });
          const fileData = await fileResp.json() as Record<string, unknown>;
          const result = fileData.result as Record<string, unknown> | undefined;
          const filePath = result?.file_path as string | undefined;
          if (filePath) {
            // 2. 下載圖片
            const dlResp = await fetch(`https://api.telegram.org/file/bot${XIAOCAI_TOKEN}/${filePath}`, { signal: AbortSignal.timeout(15000) });
            const buf = Buffer.from(await dlResp.arrayBuffer());
            imageBase64 = buf.toString('base64');
            // 判斷 mime type
            imageMime = filePath.endsWith('.png') ? 'image/png' : filePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
            log.info(`[XiaocaiBot] 收到圖片 fileId=${fileId.slice(0, 20)}... size=${buf.length} mime=${imageMime}`);
          }
        } catch (e) {
          log.warn({ err: e }, '[XiaocaiBot] 圖片下載失敗');
        }
      }

      const text = ((msg.text as string) ?? caption).trim();
      if (!text && !imageBase64) continue;

      log.info(`[XiaocaiBot] recv chatId=${chatId} text=${text.slice(0, 60)}${imageBase64 ? ' +image' : ''}`);
      lastUserActivityAt = Date.now(); // 追蹤老蔡最後活動時間（心跳用）

      const allowedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
      if (allowedChatId && String(chatId) !== allowedChatId) {
        await sendTelegramMessageToChat(chatId, '⚠️ 未授權的使用者', { token: XIAOCAI_TOKEN });
        continue;
      }

      // 指令路由
      const xcCmd = text.split(/\s+/)[0]?.split('@')[0]?.toLowerCase() ?? '';
      if (xcCmd === '/models' || text === '🧠 切換模型') { await replyModelsXiaocai(chatId); continue; }
      if (xcCmd === '/status') {
        const models = getAvailableModels();
        const label = models.find(m => m.id === xiaocaiMainModel)?.label || xiaocaiMainModel;
        await sendTelegramMessageToChat(chatId, `📊 小蔡狀態\n\n主模型：${label} (${xiaocaiMainModel})\n\n切換模型：/models`, { token: XIAOCAI_TOKEN });
        continue;
      }
      if (xcCmd === '/start' || xcCmd === '/help') {
        await sendTelegramMessageToChat(chatId, `我是小蔡 🚀\n\n直接跟我聊天就好。\n\n/models — 切換模型\n/status — 目前狀態`, { token: XIAOCAI_TOKEN });
        continue;
      }

      // ── 多步執行迴路（最多 3 輪連續行動）──
      const MAX_CHAIN_STEPS = 5;
      let currentInput = text;
      let finalReply = '';
      const allActionResults: string[] = [];

      for (let step = 0; step < MAX_CHAIN_STEPS; step++) {
        const isFollowUp = step > 0;
        const thinkInput = isFollowUp
          ? `[系統回饋] 你上一步的執行結果：\n${allActionResults.slice(-3).join('\n')}\n\n根據結果，決定下一步。你可以繼續操作（放 action），也可以覺得夠了就直接用自然語言回覆老蔡。記得：查檔案先看索引，不要 list_dir 慢慢翻。`
          : currentInput;

        // 第一輪帶圖片，後續 follow-up 不帶
        const thinkImage = (!isFollowUp && imageBase64) ? { base64: imageBase64, mimeType: imageMime || 'image/jpeg' } : undefined;
        let reply = await xiaocaiThink(chatId, thinkInput, xiaocaiMainModel, xiaocaiHistory, thinkImage);

        const actionMatches = extractActionJsons(reply);
        if (!actionMatches || actionMatches.length === 0) {
          finalReply = stripActionJson(reply);
          break;
        }

        // 並行執行所有 action
        const actionPromises = actionMatches.map(async (jsonStr) => {
          try {
            const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;
            const result = await executeNEUXAAction(action);
            const icon = result.ok ? '✅' : '🚫';
            const label = action.action === 'create_task' ? `任務「${action.name}」` : action.action;
            const maxOutput = (action.action === 'read_file' || action.action === 'ask_ai') ? 2000 : 800;
            log.info(`[Xiaocai-Chain] step=${step} ${action.action} → ok=${result.ok}${!result.ok ? ` reason=${result.output.slice(0, 120)}` : ''}`);
            return `${icon} ${label}: ${sanitize(result.output.slice(0, maxOutput))}`;
          } catch {
            log.warn(`[Xiaocai-Chain] JSON parse failed at step ${step}`);
            return null;
          }
        });
        const settled = await Promise.all(actionPromises);
        const stepResults = settled.filter((r): r is string => r !== null);
        for (const jsonStr of actionMatches) {
          reply = reply.replace(jsonStr, '').trim();
        }
        reply = reply.replace(/```json\s*```/g, '').replace(/```\s*```/g, '').trim();
        reply = reply.replace(/^\s*```(?:json)?\s*$/gm, '').trim();

        allActionResults.push(...stepResults);

        if (step === 0 && MAX_CHAIN_STEPS > 1) {
          const progressMsg = `⏳ 處理中... 已完成 ${stepResults.length} 個動作，繼續分析中`;
          await sendTelegramMessageToChat(chatId, progressMsg, { token: XIAOCAI_TOKEN });
        }

        const history = xiaocaiHistory.get(chatId) || [];
        if (isFollowUp) {
          history.push({ role: 'user', text: thinkInput });
        }
        history.push({ role: 'model', text: reply || '（執行中）' });
        history.push({ role: 'user', text: sanitize(`[執行結果]\n${stepResults.join('\n')}`) });
        if (history.length > 30) history.splice(0, history.length - 30);
        xiaocaiHistory.set(chatId, history);

        if (reply) finalReply = stripActionJson(reply);

        log.info(`[NEUXA-Chain] step=${step} done, ${stepResults.length} actions, hasReply=${!!reply}`);
      }

      // 組合最終回覆
      if (!finalReply && allActionResults.length > 0) {
        finalReply = allActionResults.map(r => {
          const short = r.length > 80 ? r.slice(0, 80) + '...' : r;
          return short;
        }).join('\n');
      }

      // 自動記憶
      if (allActionResults.length > 0 || (finalReply && finalReply !== '🤔')) {
        appendInteractionLog(text, allActionResults, finalReply || '');
      }

      // 自驅動
      const SELF_DRIVE_ENABLED = true;

      if (SELF_DRIVE_ENABLED && allActionResults.length > 0 && finalReply) {
        const TG_LIMIT_PRE = 4000;
        if (finalReply.length <= TG_LIMIT_PRE) {
          await sendTelegramMessageToChat(chatId, finalReply, { token: XIAOCAI_TOKEN });
        } else {
          let rem = finalReply;
          while (rem.length > 0) {
            const cut = rem.length <= TG_LIMIT_PRE ? rem.length : Math.max(rem.lastIndexOf('\n', TG_LIMIT_PRE), TG_LIMIT_PRE * 0.5);
            await sendTelegramMessageToChat(chatId, rem.slice(0, cut), { token: XIAOCAI_TOKEN });
            rem = rem.slice(cut);
          }
        }

        for (let selfDrive = 0; selfDrive < 1; selfDrive++) {
          const driveReply = await xiaocaiThink(chatId,
            '[系統] 你剛才做了一些事。還有沒有說了「要做」但沒做的？有就用 action 做掉。沒有就回「done」一個字就好。注意：不要重複你剛才已經說過的話。',
            xiaocaiMainModel, xiaocaiHistory
          );
          const driveActions = extractActionJsons(driveReply);
          if (!driveActions || driveActions.length === 0) {
            const cleanDrive = driveReply
              .replace(/\{"action"[^}]*\}/g, '')
              .replace(/```json\s*```/g, '').replace(/```\s*```/g, '')
              .replace(/^\s*```(?:json)?\s*$/gm, '')
              .trim();
            // 跳過 "done" 或跟 finalReply 高度重複的回覆
            const isDone = /^done$/i.test(cleanDrive);
            const isDuplicate = cleanDrive.length > 5 && finalReply && cleanDrive.slice(0, 60) === finalReply.slice(0, 60);
            if (cleanDrive && cleanDrive.length > 5 && !isDone && !isDuplicate) {
              await sendTelegramMessageToChat(chatId, cleanDrive, { token: XIAOCAI_TOKEN });
            }
            log.info(`[XiaocaiSelfDrive] round=${selfDrive} 沒有更多 action，停止`);
            break;
          }
          const driveResults: string[] = [];
          let driveText = driveReply;
          for (const jsonStr of driveActions) {
            try {
              const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;
              const result = await executeNEUXAAction(action);
              const icon = result.ok ? '✅' : '🚫';
              const driveMax = (action.action === 'read_file' || action.action === 'ask_ai') ? 2000 : 800;
              driveResults.push(`${icon} ${action.action}: ${sanitize(result.output.slice(0, driveMax))}`);
              log.info(`[XiaocaiSelfDrive] round=${selfDrive} ${action.action} → ok=${result.ok}${!result.ok ? ` reason=${result.output.slice(0, 120)}` : ''}`);
            } catch { /* skip */ }
            driveText = driveText.replace(jsonStr, '').trim();
          }
          driveText = stripActionJson(driveText);
          const driveMsg = driveText
            ? driveText
            : driveResults.map(r => r.length > 80 ? r.slice(0, 80) + '...' : r).join('\n');
          const driveMsgDup = driveMsg && finalReply && driveMsg.slice(0, 60) === finalReply.slice(0, 60);
          if (driveMsg && !driveMsgDup) {
            await sendTelegramMessageToChat(chatId, driveMsg.slice(0, 4000), { token: XIAOCAI_TOKEN });
          }
          const hist = xiaocaiHistory.get(chatId) || [];
          hist.push({ role: 'user', text: '[系統] 你剛完成了事情，還有要做的嗎？' });
          hist.push({ role: 'model', text: driveText || '繼續做' });
          hist.push({ role: 'user', text: `[執行結果]\n${driveResults.join('\n')}` });
          if (hist.length > 30) hist.splice(0, hist.length - 30);
          xiaocaiHistory.set(chatId, hist);
        }
        continue;
      }

      // 發送回覆 — 最終保險：清除所有殘留 JSON
      finalReply = stripActionJson(finalReply || '') || '🤔';
      const TG_LIMIT = 4000;
      if (finalReply.length <= TG_LIMIT) {
        await sendTelegramMessageToChat(chatId, finalReply, { token: XIAOCAI_TOKEN });
      } else {
        let remaining = finalReply;
        while (remaining.length > 0) {
          let chunk: string;
          if (remaining.length <= TG_LIMIT) {
            chunk = remaining;
            remaining = '';
          } else {
            let cut = remaining.lastIndexOf('\n', TG_LIMIT);
            if (cut < TG_LIMIT * 0.5) cut = remaining.lastIndexOf('。', TG_LIMIT);
            if (cut < TG_LIMIT * 0.5) cut = remaining.lastIndexOf('，', TG_LIMIT);
            if (cut < TG_LIMIT * 0.5) cut = TG_LIMIT;
            chunk = remaining.slice(0, cut + 1);
            remaining = remaining.slice(cut + 1);
          }
          await sendTelegramMessageToChat(chatId, chunk, { token: XIAOCAI_TOKEN });
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    log.error({ err: e }, '[XiaocaiBot] poll error');
  }
}

function xiaocaiLoop(): void {
  if (!xiaocaiRunning) return;
  xiaocaiPoll().finally(() => {
    if (xiaocaiRunning) setTimeout(xiaocaiLoop, POLL_INTERVAL_MS);
  });
}

// ══════════════════════════════════════════════════════════════
// NEUXA 心跳 — 老蔡不在時自主思考
// ══════════════════════════════════════════════════════════════

async function heartbeatTick(): Promise<void> {
  if (!XIAOCAI_TOKEN) return;

  // 老蔡最近 5 分鐘有活動 → 不打擾，跳過
  if (lastUserActivityAt > 0 && (Date.now() - lastUserActivityAt) < HEARTBEAT_IDLE_THRESHOLD_MS) {
    log.info('[Heartbeat] 老蔡活躍中，跳過心跳');
    return;
  }

  // 讀 HEARTBEAT.md
  const heartbeatPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'HEARTBEAT.md');
  let heartbeatContent = '';
  try {
    heartbeatContent = fs.readFileSync(heartbeatPath, 'utf8').trim();
  } catch { /* ignore */ }
  if (!heartbeatContent) {
    log.warn('[Heartbeat] HEARTBEAT.md 空白或不存在，跳過');
    return;
  }

  log.info('[Heartbeat] 🫀 心跳觸發 — 開始自主思考');

  const heartbeatInput = `[心跳醒來] 老蔡目前不在線。你自己醒來了。\n讀完以下指南後，按照裡面的步驟自主行動：\n\n${heartbeatContent}`;

  try {
    // 第一輪思考
    const MAX_HEARTBEAT_STEPS = 3;
    let currentInput = heartbeatInput;
    const allResults: string[] = [];

    for (let step = 0; step < MAX_HEARTBEAT_STEPS; step++) {
      const isFollowUp = step > 0;
      const thinkInput = isFollowUp
        ? `[系統回饋] 你上一步的執行結果：\n${allResults.slice(-3).join('\n')}\n\n根據結果，決定下一步。繼續操作或停下來。`
        : currentInput;

      const reply = await xiaocaiThink(HEARTBEAT_CHAT_ID, thinkInput, xiaocaiMainModel, xiaocaiHistory);

      const actionMatches = extractActionJsons(reply);
      if (!actionMatches || actionMatches.length === 0) {
        log.info(`[Heartbeat] step=${step} 無 action，結束。reply=${reply.slice(0, 200)}`);
        break;
      }

      // 執行 actions
      for (const jsonStr of actionMatches) {
        try {
          const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;
          const result = await executeNEUXAAction(action);
          const icon = result.ok ? '✅' : '🚫';
          const maxOutput = (action.action === 'read_file' || action.action === 'ask_ai') ? 2000 : 800;
          allResults.push(`${icon} ${action.action}: ${sanitize(result.output.slice(0, maxOutput))}`);
          log.info(`[Heartbeat] step=${step} ${action.action} → ok=${result.ok}`);
        } catch {
          log.warn(`[Heartbeat] step=${step} JSON parse failed`);
        }
      }

      // 更新心跳對話歷史
      const history = xiaocaiHistory.get(HEARTBEAT_CHAT_ID) || [];
      if (isFollowUp) history.push({ role: 'user', text: thinkInput });
      history.push({ role: 'model', text: reply || '（執行中）' });
      history.push({ role: 'user', text: sanitize(`[執行結果]\n${allResults.slice(-5).join('\n')}`) });
      if (history.length > 20) history.splice(0, history.length - 20);
      xiaocaiHistory.set(HEARTBEAT_CHAT_ID, history);
    }

    // 心跳完成通知（發到老蔡的 chat，讓他回來看得到）
    if (allResults.length > 0) {
      const ownerChatId = getAllowChatId();
      if (ownerChatId) {
        const summary = `🫀 自主心跳\n${allResults.map(r => r.replace(/<[^>]*>/g, '').slice(0, 100)).join('\n')}`;
        await sendTelegramMessageToChat(ownerChatId, summary, { token: XIAOCAI_TOKEN });
      }
      appendInteractionLog('[心跳]', allResults, '自主巡邏完成');
    }

    log.info(`[Heartbeat] 🫀 心跳完成，執行 ${allResults.length} 個動作`);
  } catch (e) {
    log.error({ err: e }, '[Heartbeat] 心跳異常');
  }
}

// ══════════════════════════════════════════════════════════════
// 公開 API：啟動 / 停止
// ══════════════════════════════════════════════════════════════

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

  if (XIAOCAI_TOKEN) {
    xiaocaiRunning = true;
    const xcBotId = XIAOCAI_TOKEN.split(':')[0] || '(unknown)';
    log.info(`[XiaocaiBot] 啟動小蔡 bot polling bot_id=${xcBotId}`);
    fetch(`https://api.telegram.org/bot${XIAOCAI_TOKEN}/deleteWebhook?drop_pending_updates=true`)
      .catch(() => {})
      .finally(() => xiaocaiLoop());

    // 啟動心跳 — 每 15 分鐘自主思考
    heartbeatTimer = setInterval(() => {
      heartbeatTick().catch(e => log.error({ err: e }, '[Heartbeat] tick error'));
    }, HEARTBEAT_INTERVAL_MS);
    log.info(`[Heartbeat] 🫀 心跳已啟動，每 ${HEARTBEAT_INTERVAL_MS / 60000} 分鐘一次`);
  }

  if (GROUP_TOKEN && GROUP_CHAT_ID) {
    groupRunning = true;
    const gBotId = GROUP_TOKEN.split(':')[0] || '(unknown)';
    log.info(`[GroupBot] 啟動群組偵測 bot_id=${gBotId} chat=${GROUP_CHAT_ID}`);
    fetch(`https://api.telegram.org/bot${GROUP_TOKEN}/deleteWebhook?drop_pending_updates=false`)
      .catch(() => {})
      .finally(() => groupLoop());
  }
}

export function stopTelegramStopPoll(): void {
  running = false;
  groupRunning = false;
  xiaocaiRunning = false;
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

/** 手動觸發心跳（繞過活躍檢查） */
export async function triggerHeartbeat(): Promise<string> {
  if (!XIAOCAI_TOKEN) return '小蔡 bot 未設定';
  const saved = lastUserActivityAt;
  lastUserActivityAt = 0; // 暫時清除，讓心跳不被跳過
  try {
    await heartbeatTick();
    return '心跳已觸發，查看 log 確認結果';
  } finally {
    lastUserActivityAt = saved;
  }
}
