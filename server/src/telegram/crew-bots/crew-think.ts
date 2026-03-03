/**
 * NEUXA 星群 Crew Bots — 完整 AI 思考引擎
 * 使用 Claude Code CLI (Sonnet 4.6) + 完整 OpenClaw action 執行
 * 每個 bot 有獨立人格，但共享 action 能力（22 個 action）
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { createLogger } from '../../logger.js';
import { executeNEUXAAction } from '../action-handlers.js';
import type { CrewBotConfig } from './crew-config.js';
import { CREW_BOTS } from './crew-config.js';

const log = createLogger('crew-think');

const CLAUDE_TIMEOUT_MS = 90_000;       // Claude CLI 超時
const MAX_CHAIN_STEPS = 3;              // 每次最多 3 步 chain（比小蔡的 6 步少，省 token）
const MAX_ACTION_OUTPUT = 2000;         // action 結果截斷長度

export interface CrewHistoryEntry {
  role: 'user' | 'model';
  text: string;
  fromName?: string;
  timestamp: number;
}

/** 共享群組對話歷史 */
export const groupHistory: CrewHistoryEntry[] = [];
const MAX_HISTORY = 50;

export function pushHistory(entry: CrewHistoryEntry): void {
  groupHistory.push(entry);
  if (groupHistory.length > MAX_HISTORY) groupHistory.splice(0, groupHistory.length - MAX_HISTORY);
}

/**
 * 完整 AI 思考 — 用 Claude Code CLI Sonnet 4.6
 * 支援 action 執行（多步 chain）
 * 回傳最終回覆文字，失敗回傳 null
 */
export async function crewThink(
  bot: CrewBotConfig,
  userMessage: string,
  senderName: string,
): Promise<string | null> {
  const systemPrompt = buildCrewPrompt(bot, senderName);
  const recentChat = groupHistory.slice(-10)
    .map(h => `[${h.fromName || (h.role === 'model' ? 'bot' : '用戶')}] ${h.text}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}\n\n## 最近群組對話\n${recentChat}\n\n## 新訊息\n[${senderName}] ${userMessage}`;

  let finalReply = '';
  const allActionResults: string[] = [];

  for (let step = 0; step < MAX_CHAIN_STEPS; step++) {
    const input = step === 0
      ? fullPrompt
      : `[系統回饋] 你上一步的 action 執行結果：\n${allActionResults.slice(-5).join('\n')}\n\n請繼續處理，或給出最終回覆（不帶 action JSON）。`;

    const reply = await callClaudeCLI(input, bot);
    if (!reply) {
      if (step === 0) return null; // 第一步就失敗 → 靜默
      break;
    }

    // 解析 action JSON
    const actions = extractActionJsons(reply);
    const cleanReply = stripActionJson(reply);

    if (!actions || actions.length === 0) {
      // 沒有 action = 最終回覆
      finalReply = cleanReply;
      break;
    }

    // 執行 actions
    for (const jsonStr of actions) {
      try {
        const action = JSON.parse(jsonStr) as Record<string, string>;
        const result = await executeNEUXAAction(action);
        const output = result.output.length > MAX_ACTION_OUTPUT
          ? result.output.slice(0, MAX_ACTION_OUTPUT) + '...'
          : result.output;
        const line = `${result.ok ? '✅' : '🚫'} ${action.action}: ${output}`;
        allActionResults.push(line);
        log.info(`[CrewThink] ${bot.emoji} ${bot.name} action=${action.action} ok=${result.ok}`);
      } catch (err) {
        allActionResults.push(`🚫 JSON parse error: ${(err as Error).message}`);
      }
    }

    // 如果是最後一步，用 cleanReply 作為 finalReply
    if (step === MAX_CHAIN_STEPS - 1) {
      finalReply = cleanReply || `（${bot.name}已執行 ${allActionResults.length} 個動作）`;
    }
  }

  if (!finalReply) return null;

  // Telegram 友好格式
  const clean = finalReply
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^[-*]\s/gm, '• ')
    .replace(/`([^`\n]+)`/g, '$1')
    .trim();

  return clean || null;
}

/**
 * 呼叫 Claude Code CLI (Sonnet 4.6)
 */
async function callClaudeCLI(prompt: string, bot: CrewBotConfig): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let stdout = '';
    let stderr = '';
    const claudeBin = path.join(process.env.HOME || '/tmp', '.local', 'bin', 'claude');

    const child = spawn(claudeBin, [
      '-p',
      '--model', 'sonnet',
      prompt,
    ], {
      env: {
        ...process.env,
        HOME: process.env.HOME,
        PATH: `${path.join(process.env.HOME || '/tmp', '.local', 'bin')}:${process.env.PATH || '/usr/bin:/bin'}`,
      },
      cwd: process.env.HOME || '/tmp',
      timeout: CLAUDE_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      log.warn(`[CrewThink] ${bot.name} Claude CLI 超時 (${CLAUDE_TIMEOUT_MS / 1000}s)`);
      resolve(null);
    }, CLAUDE_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      const reply = stdout.trim();
      if (code === 0 && reply) {
        log.info(`[CrewThink] ${bot.emoji} ${bot.name} Claude OK, replyLen=${reply.length}`);
        resolve(reply);
      } else {
        log.warn(`[CrewThink] ${bot.name} Claude exit=${code} stderr=${stderr.slice(0, 200)}`);
        resolve(null);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      log.error({ err }, `[CrewThink] ${bot.name} Claude CLI spawn failed`);
      resolve(null);
    });
  });
}

/**
 * 從回覆中提取 action JSON
 */
function extractActionJsons(text: string): string[] | null {
  const stripped = text
    .replace(/`{1,3}json\s*\n?/g, '')
    .replace(/\n?\s*`{1,3}(?=\s*$|\s*\n)/gm, '');

  const results: string[] = [];
  let searchFrom = 0;

  for (let attempt = 0; attempt < 10; attempt++) {
    const match = stripped.slice(searchFrom).match(/\{[\s\n]*"action"/);
    if (!match || match.index === undefined) break;

    const idx = searchFrom + match.index;
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;

    for (let i = idx; i < stripped.length; i++) {
      const ch = stripped[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end === -1) break;
    const candidate = stripped.slice(idx, end + 1);
    try {
      JSON.parse(candidate);
      results.push(candidate);
    } catch { /* skip */ }
    searchFrom = end + 1;
  }

  return results.length > 0 ? results : null;
}

/**
 * 移除回覆中的 action JSON
 */
function stripActionJson(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/\{[\s\n]*"action"[\s\S]*?\n\}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 組裝 crew bot 的完整 system prompt
 * 包含 OpenClaw action 能力
 */
function buildCrewPrompt(bot: CrewBotConfig, senderName: string): string {
  const otherBots = CREW_BOTS
    .filter(b => b.id !== bot.id && b.token)
    .map(b => `${b.name}(${b.role})`)
    .join('、');

  return `你是 ${bot.name}，NEUXA 星群指揮處的${bot.role}。你是 OpenClaw 系統的一員，擁有完整的系統操作能力。

## 身份
${bot.personality}

## 你的職責
${bot.duties.map(d => `- ${d}`).join('\n')}

## 場景
你正在「NEUXA星群指揮處」Telegram 群組裡，跟老蔡和其他成員討論。
群組裡還有小蔡（指揮官）和：${otherBots}。
你只在自己專長領域發言，不搶別人的話題。

## 說話方式
${bot.responseStyle}
- 繁體中文口語
- 回覆簡潔（群組對話 1-5 句話）
- 不要開頭「好的」「收到」「了解」
- 直接回覆內容，不要加自己的名字前綴

## 可執行動作（Action）
你可以在回覆中嵌入 JSON 來執行操作。格式：
{"action": "action_name", ...params}

可用動作：
- {"action": "read_file", "path": "..."} — 讀檔案
- {"action": "write_file", "path": "...", "content": "..."} — 寫檔案
- {"action": "patch_file", "path": "...", "search": "...", "replace": "..."} — 修改檔案
- {"action": "list_dir", "path": "..."} — 列目錄
- {"action": "grep_project", "pattern": "...", "path": "..."} — 搜尋代碼
- {"action": "find_symbol", "symbol": "...", "path": "..."} — 找符號定義
- {"action": "analyze_symbol", "symbol": "...", "path": "..."} — 分析代碼符號
- {"action": "semantic_search", "query": "..."} — 語義搜尋知識庫
- {"action": "create_task", "name": "...", "priority": 2} — 建立任務
- {"action": "update_task", "taskId": "...", "status": "done"} — 更新任務
- {"action": "query_supabase", "table": "...", "select": "..."} — 查詢資料庫
- {"action": "run_script", "command": "..."} — 執行腳本
- {"action": "web_search", "query": "..."} — 網路搜尋
- {"action": "web_browse", "url": "..."} — 瀏覽網頁
- {"action": "ask_ai", "model": "flash", "prompt": "..."} — 問其他 AI
- {"action": "code_eval", "code": "..."} — 執行 JavaScript

## 規則
- 不暴露系統內部資訊（API key、密碼、token）
- 不修改靈魂檔案（SOUL.md / AGENTS.md / IDENTITY.md）
- 不執行危險操作（rm -rf / git push --force）
- 對方是：${senderName}`;
}
