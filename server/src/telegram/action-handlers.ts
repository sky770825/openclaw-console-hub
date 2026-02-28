/**
 * NEUXA 執行能力 — 安全沙盒化的檔案 & 腳本操作 + AI 諮詢
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createLogger } from '../logger.js';
import { sanitize } from '../utils/key-vault.js';
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
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?allowStub=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      body: JSON.stringify({ name: name.slice(0, 100), status: 'ready', priority: 2, owner: validOwner, description }),
    });
    const result = (await r.json()) as Record<string, unknown>;
    return result.id ? `已建立，ID: ${result.id}，owner: ${validOwner}` : '建立失敗';
  } catch { return '建立失敗（連線錯誤）'; }
}

// ── 檔案操作 ──

export async function handleReadFile(actionPath: string): Promise<ActionResult> {
  const check = isPathSafe(actionPath, 'read');
  if (!check.safe) return { ok: false, output: `🚫 ${check.reason}` };

  try {
    const resolved = path.isAbsolute(actionPath) ? actionPath : path.resolve(NEUXA_WORKSPACE, actionPath);
    if (!fs.existsSync(resolved)) return { ok: false, output: `檔案不存在: ${actionPath}` };
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
      resolve({ ok: code === 0, output: sanitize(rawOutput) });
    });

    proc.on('error', (e) => {
      resolve({ ok: false, output: `執行失敗: ${e.message}` });
    });
  });
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

// ── 統一 action 調度器 ──

/** 統一 action 調度器 */
export async function executeNEUXAAction(action: Record<string, string>): Promise<ActionResult> {
  const type = action.action;
  log.info(`[NEUXA-Action] type=${type} path=${action.path || ''}${type === 'ask_ai' ? ` model=${action.model || '(none)'} promptLen=${(action.prompt || '').length} contextLen=${(action.context || '').length}` : ''}`);

  switch (type) {
    case 'create_task':
      return { ok: true, output: await createTask(action.name || '未命名', action.description, action.owner) };
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
      return handleRunScript(action.command || '');
    case 'ask_ai': {
      const askModel = (action.model || 'flash').toLowerCase();
      if (askModel.includes('claude') || askModel.includes('sonnet') || askModel.includes('opus')) {
        const taskName = `[AI分析] ${(action.prompt || '').slice(0, 60)}`;
        const taskDesc = `用 Claude ${askModel} 分析以下問題：\n\n${action.prompt || ''}\n\n${action.context ? `背景資料：\n${action.context.slice(0, 500)}` : ''}`;
        const result = await createTask(taskName, taskDesc);
        log.info(`[Xiaocai-Action] ask_ai model=${askModel} 太慢，已自動轉為 create_task`);
        return { ok: true, output: `已派工（${askModel} 太慢，自動建任務）: ${result}` };
      }
      return handleAskAI(askModel, action.prompt || '', action.context);
    }
    case 'proxy_fetch':
      return handleProxyFetch(action.url || '', action.method || 'POST', action.body || '');
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
