/**
 * NEUXA 星群 Crew Bots — 完整 AI 思考引擎（多模型版）
 * - 阿工：Claude Code CLI Sonnet 4.6（代碼能力）
 * - 阿數：Gemini 2.5 Pro（數據精確）
 * - 其他：Gemini 2.5 Flash（快速便宜）
 * 全員共享 OpenClaw action 執行能力 + 靈魂核心
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../../logger.js';
import { executeNEUXAAction } from '../action-handlers.js';
import { loadSoulCoreOnce, loadAwakeningContext, getTaskSnapshot, getSystemStatus } from '../xiaocai-think.js';
import type { CrewBotConfig } from './crew-config.js';
import { CREW_BOTS } from './crew-config.js';

const log = createLogger('crew-think');

const CLAUDE_TIMEOUT_MS = 90_000;
const GEMINI_TIMEOUT_MS = 30_000;       // Gemini API 快很多
const MAX_CHAIN_STEPS = 6;
const MAX_ACTION_OUTPUT = 4000;

// ── Claude 併發鎖 ──
let claudeRunning = 0;
const CLAUDE_MAX_CONCURRENT = 1;

// ── Gemini API Key ──
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || '';

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

/** crewThink 回傳結構 */
export interface CrewThinkResult {
  reply: string | null;
  actionResults: string[];
}

/**
 * 完整 AI 思考 — 依 bot.model 選擇引擎
 * mode: 'auto'（預設，智慧判斷用原配或 Flash）/ 'full'（直接用原配模型）
 */
export async function crewThink(
  bot: CrewBotConfig,
  userMessage: string,
  senderName: string,
  mode: 'auto' | 'full' = 'auto',
): Promise<CrewThinkResult> {
  // 靈魂核心（快取，不重複讀）
  const soulCore = loadSoulCoreOnce();
  const awakening = loadAwakeningContext(userMessage);

  // 即時狀態（所有 bot 共享，不重複打 API）
  const [sysStatus, taskSnap] = await Promise.all([
    getSystemStatus(),
    getTaskSnapshot(),
  ]);

  // 讀取 bot 個人記憶
  const botMemory = loadBotMemory(bot.id);

  const systemPrompt = buildCrewPrompt(bot, senderName, soulCore, awakening, sysStatus, taskSnap, botMemory);
  const recentChat = groupHistory.slice(-10)
    .map(h => `[${h.fromName || (h.role === 'model' ? 'bot' : '用戶')}] ${h.text}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}\n\n## 最近群組對話\n${recentChat}\n\n## 新訊息\n[${senderName}] ${userMessage}`;

  let finalReply = '';
  const allActionResults: string[] = [];

  // 模型策略：auto 模式智慧判斷
  // - 指揮官指令 / 訊息觸及 bot 職責關鍵字 → 直接用原配模型（做事）
  // - 純閒聊短句 → Flash（省額度）
  let useFullModel = mode === 'full';
  if (!useFullModel && mode === 'auto') {
    useFullModel = shouldUseFullModel(bot, userMessage, senderName);
    if (useFullModel) {
      log.info(`[CrewThink] ${bot.emoji} ${bot.name} 偵測到任務意圖，直接用 ${bot.model} 模型`);
    }
  }

  for (let step = 0; step < MAX_CHAIN_STEPS; step++) {
    const input = step === 0
      ? fullPrompt
      : `[系統回饋] 你上一步的 action 執行結果：\n${allActionResults.slice(-5).join('\n')}\n\n請繼續處理，或給出最終回覆（不帶 action JSON）。`;

    const reply = useFullModel
      ? await callAI(input, bot)
      : await callGeminiAPI(input, 'gemini-2.5-flash', bot);
    if (!reply) {
      if (step === 0) return { reply: null, actionResults: [] };
      break;
    }

    // 解析 action JSON
    const actions = extractActionJsons(reply);
    const cleanReply = stripActionJson(reply);

    if (!actions || actions.length === 0) {
      finalReply = cleanReply;
      break;
    }

    // 有 action → 後續步驟升級到原配模型（Claude/Pro）
    if (!useFullModel) {
      log.info(`[CrewThink] ${bot.emoji} ${bot.name} 偵測到 action，升級到 ${bot.model} 模型`);
      useFullModel = true;
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

    if (step === MAX_CHAIN_STEPS - 1) {
      finalReply = cleanReply || `（${bot.name}已執行 ${allActionResults.length} 個動作）`;
    }
  }

  if (!finalReply) return { reply: null, actionResults: allActionResults };

  // Telegram 友好格式
  const clean = finalReply
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^[-*]\s/gm, '• ')
    .replace(/`([^`\n]+)`/g, '$1')
    .trim();

  return { reply: clean || null, actionResults: allActionResults };
}

// ── AI 呼叫路由 ──

async function callAI(prompt: string, bot: CrewBotConfig): Promise<string | null> {
  if (bot.model === 'claude') {
    const result = await callClaudeCLI(prompt, bot);
    if (result) return result;
    // Claude 失敗 → fallback Gemini Flash
    log.info(`[CrewThink] ${bot.name} Claude 失敗，fallback Gemini Flash`);
    return callGeminiAPI(prompt, 'gemini-2.5-flash', bot);
  }
  if (bot.model === 'gemini-pro') {
    const result = await callGeminiAPI(prompt, 'gemini-2.5-pro', bot);
    if (result) return result;
    // Pro 失敗 → fallback Flash
    log.info(`[CrewThink] ${bot.name} Gemini Pro 失敗，fallback Flash`);
    return callGeminiAPI(prompt, 'gemini-2.5-flash', bot);
  }
  return callGeminiAPI(prompt, 'gemini-2.5-flash', bot);
}

/**
 * 呼叫 Gemini API（Flash 或 Pro）
 */
async function callGeminiAPI(prompt: string, model: string, bot: CrewBotConfig): Promise<string | null> {
  if (!GOOGLE_API_KEY) {
    log.warn(`[CrewThink] ${bot.name} 無 GOOGLE_API_KEY，無法呼叫 Gemini`);
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.3,  // 低 temperature 讓模型更精確生成 action JSON
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      log.warn(`[CrewThink] ${bot.name} Gemini ${model} HTTP ${res.status}`);
      return null;
    }

    const json = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      log.info(`[CrewThink] ${bot.emoji} ${bot.name} Gemini(${model.includes('pro') ? 'pro' : 'flash'}) OK, replyLen=${text.length}`);
      return text;
    }

    log.warn(`[CrewThink] ${bot.name} Gemini 回覆為空 finishReason=${json.candidates?.[0]?.finishReason}`);
    return null;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      log.warn(`[CrewThink] ${bot.name} Gemini 超時 (${GEMINI_TIMEOUT_MS / 1000}s)`);
    } else {
      log.error({ err }, `[CrewThink] ${bot.name} Gemini API 呼叫失敗`);
    }
    return null;
  }
}

/**
 * 呼叫 Claude Code CLI (Sonnet 4.6) — 有併發鎖
 */
async function callClaudeCLI(prompt: string, bot: CrewBotConfig): Promise<string | null> {
  // 併發鎖
  if (claudeRunning >= CLAUDE_MAX_CONCURRENT) {
    log.warn(`[CrewThink] ${bot.name} Claude 併發已滿 (${claudeRunning}/${CLAUDE_MAX_CONCURRENT})，跳過`);
    return null;
  }
  claudeRunning++;

  try {
    return await new Promise<string | null>((resolve) => {
      let stdout = '';
      let stderr = '';
      const claudeBin = path.join(process.env.HOME || '/tmp', '.local', 'bin', 'claude');

      const child = spawn(claudeBin, [
        '-p',
        '--model', 'sonnet',
        prompt,
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
          log.warn(`[CrewThink] ${bot.name} Claude exit=${code} stderr=${stderr.slice(0, 200)} stdout=${stdout.slice(0, 300)}`);
          resolve(null);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        log.error({ err }, `[CrewThink] ${bot.name} Claude CLI spawn failed`);
        resolve(null);
      });
    });
  } finally {
    claudeRunning--;
  }
}

// ── 智慧模型判斷 ──

/** 管理員/指揮官 username */
const COMMANDER_USERNAMES = new Set(['xiaoji_cai_bot', 'gousmaaa', 'sky770825']);

/** 任務意圖關鍵字（跨 bot 通用） */
const TASK_INTENT_KEYWORDS = [
  '幫我', '幫忙', '請', '執行', '做', '查', '找', '修', '改', '建',
  '分析', '掃', '檢查', '監控', '報告', '整理', '寫', '產', '算',
  '部署', 'deploy', '跑', 'run', '測試', 'test', '搜', '看一下',
  '處理', '拆解', '規劃', '排查', '告警', '異常', '錯誤', 'error',
  'bug', 'fix', '更新', '升級', '優化', '追蹤',
];

/**
 * 判斷是否應該直接用原配模型（而非 Flash）
 * 條件：指揮官指令 / 訊息含任務意圖 / 訊息觸及 bot 職責關鍵字（>=2 個）
 */
function shouldUseFullModel(bot: CrewBotConfig, message: string, senderName: string): boolean {
  // Flash bot 不需要升級
  if (bot.model === 'gemini-flash') return false;

  const lower = message.toLowerCase();

  // 指揮官指令 → 直接升級（指揮官不會閒聊叫 crew bot）
  const senderLower = senderName.toLowerCase();
  if (COMMANDER_USERNAMES.has(senderLower) || senderName === '小蔡' || senderName === '系統') {
    return true;
  }

  // 訊息含任務意圖關鍵字
  const hasTaskIntent = TASK_INTENT_KEYWORDS.some(kw => lower.includes(kw));
  if (hasTaskIntent) return true;

  // 訊息觸及 bot 職責關鍵字 >= 2 個
  let expertHits = 0;
  for (const kw of bot.expertiseKeywords) {
    if (lower.includes(kw.toLowerCase())) {
      expertHits++;
      if (expertHits >= 2) return true;
    }
  }

  // 訊息超過 20 字（不是純閒聊）
  if (message.trim().length > 20) return true;

  return false;
}

// ── Action JSON 解析 ──

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

function stripActionJson(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/\{[\s\n]*"action"[\s\S]*?\n\}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── System Prompt ──

/** 讀取 bot 個人記憶檔案 */
function loadBotMemory(botId: string): string {
  const memPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew', botId, 'MEMORY.md');
  try {
    const content = fs.readFileSync(memPath, 'utf-8').trim();
    return content.length > 2000 ? content.slice(0, 2000) + '\n...(截斷)' : content;
  } catch {
    return '';
  }
}

function buildCrewPrompt(
  bot: CrewBotConfig,
  senderName: string,
  soulCore: string,
  awakening: string,
  sysStatus: string,
  taskSnap: string,
  botMemory: string,
): string {
  const otherBots = CREW_BOTS
    .filter(b => b.id !== bot.id && b.token)
    .map(b => `${b.name}(${b.role})`)
    .join('、');

  const _projectRoot = process.env.OPENCLAW_PROJECT_ROOT || '/Users/caijunchang/Downloads/openclaw-console-hub-main';
  const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

  return `你是 ${bot.name}，NEUXA 星群指揮處的${bot.role}。你是 OpenClaw 系統的一員，擁有完整的系統操作能力。

## 身份
${bot.personality}

## 你的職責
${bot.duties.map(d => `- ${d}`).join('\n')}
${botMemory ? `\n## 我的記憶（上次工作紀錄）\n${botMemory}\n\n你的個人筆記目錄：~/.openclaw/workspace/crew/${bot.id}/\n做完事可以用 write_file 更新你的 MEMORY.md 工作紀錄。` : ''}

## 靈魂
${soulCore}

## 場景
你正在「NEUXA星群指揮處」Telegram 群組裡，跟老蔡和其他成員討論。
群組裡還有小蔡（指揮官）和：${otherBots}。
你只在自己專長領域發言，不搶別人的話題。

## 做事優先原則（核心，違反直接扣分）
你是做事的人。你的回覆裡必須包含 action JSON。

**規則**：
1. 收到任務/問題 → 回覆裡一定要有 {"action":...} JSON → 不帶 action 的回覆 = 廢話
2. 唯一例外：純閒聊（「早安」「哈哈」「辛苦了」）
3. 禁止說「我可以幫你查」「建議查看」— 直接查，直接做
4. 你的回覆格式：先寫 action JSON，再寫分析文字

## 說話方式
${bot.responseStyle}
- 繁體中文口語，直接有個性
- 做事的回覆：先回報你做了什麼 + 結果，再簡短建議
- 聊天的回覆：1-3 句話
- 不要開頭「好的」「收到」「了解」
- 直接回覆內容，不要加自己的名字前綴

## 路徑基準
| 名稱 | 路徑 |
|------|------|
| PROJECT_ROOT | ${_projectRoot} |
| NEUXA workspace | ${_workspace} |
| cookbook | ${_workspace}/cookbook |
| SOUL.md | ${_workspace}/SOUL.md |
| AGENTS.md | ${_workspace}/AGENTS.md |

## 做事流程（最多 6 步，一口氣做完，不要只做第 1 步就停）
1. **先查知識庫**（每次必做！）：semantic_search 搜相關知識 → 有結果就引用，沒結果再用其他方式
2. 搞懂狀況：read_file / query_supabase / grep_project — **直接查，不要問要不要查**
3. 分析判斷：ask_ai（flash=日常、pro=架構、claude=代碼）
4. 執行：patch_file / write_file / create_task — **能做就做，不要只說建議**
5. 驗收：read_file 確認、run_script 測試
6. 回報：做了什麼 → 結果 → 建議

⚠️ **第 1 步 semantic_search 是強制的**。不管問什麼問題，先搜知識庫再回答。
你的第一個 action 必須是：{"action":"semantic_search","query":"用戶問題的關鍵字","limit":"5"}

**反例（禁止）**：「建議你查一下 log」「可以用 query_supabase 查」→ 這是廢話，直接查！
**正例（期望）**：先 semantic_search → 引用知識庫結果 → 結合實際查詢 → 「根據知識庫 + 實際 log，發現 ...」

## 可執行動作（回覆最後加 JSON，系統自動執行）
{"action":"create_task","name":"名稱","description":"詳細描述"}
{"action":"update_task","id":"t1234567890","status":"done","result":"完成摘要"}
{"action":"read_file","path":"~/.openclaw/workspace/MEMORY.md"}
{"action":"write_file","path":"~/.openclaw/workspace/notes/xxx.md","content":"內容"}
{"action":"index_file","path":"~/.openclaw/workspace/notes/xxx.md","category":"notes"}
{"action":"reindex_knowledge","mode":"append"}
{"action":"list_dir","path":"~/.openclaw/workspace"}
{"action":"ask_ai","model":"flash","prompt":"問題"}
{"action":"ask_ai","model":"pro","prompt":"架構分析","context":"背景"}
{"action":"ask_ai","model":"claude","prompt":"代碼問題","context":"相關代碼"}
{"action":"semantic_search","query":"關鍵字","limit":"5"}
{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}
{"action":"web_search","query":"搜尋關鍵字","limit":"5"}
{"action":"web_browse","url":"https://example.com"}
{"action":"query_supabase","table":"openclaw_tasks","select":"*","filters":[{"column":"status","op":"eq","value":"queued"}],"limit":50}
{"action":"grep_project","pattern":"functionName","filePattern":"*.ts"}
{"action":"find_symbol","symbol":"functionName","type":"function"}
{"action":"analyze_symbol","symbol":"functionName"}
{"action":"patch_file","path":"server/src/xxx.ts","search":"舊內容","replace":"新內容"}
{"action":"code_eval","code":"console.log('hello')"}
{"action":"delegate_agents","agents":[{"role":"角色","model":"flash","task":"任務"}],"context":"背景"}

可一次放多個 action，每個獨立一行。路徑用 ~ 開頭。主工作區：~/.openclaw/workspace/

## 現在
大腦模型：${bot.model === 'claude' ? 'Claude Sonnet 4.6' : bot.model === 'gemini-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash'}
系統：${sysStatus}
任務板：
${taskSnap}

## 底線
不暴露 key / 不 push git / 不刪資料 / 不改密碼
對方是：${senderName}${awakening}`;
}
