/**
 * NEUXA 星群 Crew Bots — 完整 AI 思考引擎（多模型版）
 * - 阿工：Claude Code CLI Sonnet 4.6（代碼能力）
 * - 阿數：Gemini 2.5 Pro（數據精確）
 * - 其他：Gemini 2.5 Flash（快速便宜）
 * 全員共享 OpenClaw action 執行能力 + 靈魂核心
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { createLogger } from '../../logger.js';
import { executeNEUXAAction } from '../action-handlers.js';
import { getTaskSnapshot, getSystemStatus, claudeCliCircuitOpen, claudeCliRecordFail, claudeCliRecordSuccess } from '../xiaocai-think.js';
import type { CrewBotConfig } from './crew-config.js';
import { ACTIVE_CREW_BOTS } from './crew-config.js';
import { wsManager } from '../../websocket.js';
import { recordSuccess, recordFailure, markThinkStart, markThinkEnd, isCoolingDown } from './crew-doctor.js';
import { getInboxContext } from './crew-inbox.js';

const log = createLogger('crew-think');

const CLAUDE_TIMEOUT_MS = 120_000;      // 2 分鐘（降低：避免 Opus 卡住整個星群）
const GEMINI_FLASH_TIMEOUT_MS = 30_000;  // Flash 30s 足夠
const GEMINI_PRO_TIMEOUT_MS = 60_000;   // Pro 較慢，給 60s
const MAX_CHAIN_STEPS = 10;             // 增加思考鏈深度，讓 bot 能做更複雜的多步任務
const MAX_ACTION_OUTPUT = 4000;

// ── 合法 action 白名單（防止幻覺 action）──
const VALID_ACTIONS = new Set([
  'create_task', 'update_task', 'read_file', 'write_file', 'list_dir',
  'run_script', 'ask_ai', 'semantic_search', 'query_supabase',
  'grep_project', 'find_symbol', 'analyze_symbol', 'patch_file',
  'code_eval', 'index_file', 'reindex_knowledge', 'web_search',
  'web_browse', 'proxy_fetch', 'delegate_agents', 'mkdir', 'move_file',
]);

// ── 動態模型選擇 ──
// 阿工/阿研：日常 Flash，complex 排隊升級 Claude CLI（和小蔡共用併發鎖）
const CLAUDE_UPGRADE_BOTS = new Set(['agong', 'ayan']);

function selectModel(bot: CrewBotConfig, taskComplexity: 'simple' | 'medium' | 'complex'): string {
  if (taskComplexity === 'simple') return 'gemini-flash';
  // 阿工/阿研 complex 任務：嘗試排隊用 Claude CLI
  if (taskComplexity === 'complex' && CLAUDE_UPGRADE_BOTS.has(bot.id)) {
    // 檢查併發鎖：沒人在用 Claude → 升級；有人在用 → 用 Gemini Pro
    if (claudeRunning < CLAUDE_MAX_CONCURRENT && !claudeCliCircuitOpen()) {
      const sinceLastCall = Date.now() - lastClaudeCallAt;
      if (sinceLastCall >= CLAUDE_GLOBAL_COOLDOWN_MS) {
        log.info(`[CrewThink] ${bot.emoji} ${bot.name} complex 任務，升級 Claude CLI（排隊通過）`);
        return bot.id === 'agong' ? 'claude-sonnet' : 'claude-sonnet';
      }
    }
    log.info(`[CrewThink] ${bot.emoji} ${bot.name} complex 但 Claude 忙/冷卻中，用 Gemini Pro`);
    return 'gemini-pro';
  }
  if (taskComplexity === 'medium') return 'gemini-pro';
  return bot.model; // fallback 原始模型
}

// ── 任務複雜度評估 ──
function assessComplexity(text: string): 'simple' | 'medium' | 'complex' {
  const len = text.length;
  const hasCode = /```|function|class|import/.test(text);
  const hasMultiStep = /步驟|phase|階段|然後|接著/.test(text);
  if (hasCode || hasMultiStep || len > 500) return 'complex';
  if (len > 200) return 'medium';
  return 'simple';
}

// ── 回覆品質驗證 ──
function validateReply(reply: string, actions: string[] | null): { ok: boolean; reason?: string } {
  if (!reply || reply.trim().length < 20) {
    return { ok: false, reason: 'reply_too_short' };
  }
  // 純 emoji 或純招呼語
  const stripped = reply.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, '');
  if (stripped.length < 10) {
    return { ok: false, reason: 'pure_emoji_or_greeting' };
  }
  const greetingOnly = /^(你好|哈囉|嗨|hi|hello|hey|早安|晚安)[!！。.~～]?\s*$/i.test(reply.trim());
  if (greetingOnly) {
    return { ok: false, reason: 'greeting_only' };
  }
  // 如果有 action，檢查是否在白名單內
  if (actions && actions.length > 0) {
    for (const jsonStr of actions) {
      try {
        const parsed = JSON.parse(jsonStr) as Record<string, string>;
        if (parsed.action && !VALID_ACTIONS.has(parsed.action)) {
          return { ok: false, reason: `invalid_action:${parsed.action}` };
        }
      } catch { /* ignore parse errors, handled elsewhere */ }
    }
  }
  return { ok: true };
}

// ── Claude 併發鎖 + 全局冷卻 ──
let claudeRunning = 0;
const CLAUDE_MAX_CONCURRENT = 1;
let lastClaudeCallAt = 0;
const CLAUDE_GLOBAL_COOLDOWN_MS = 15_000;  // crew bots 共用 15 秒冷卻

// ── Gemini API Keys（多 key 輪替）──
const GEMINI_KEYS: string[] = [
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
  process.env.GEMINI_API_KEY,
].map(k => k?.trim() ?? '').filter(Boolean);
let geminiKeyIndex = 0;
function getGeminiKey(): string {
  if (GEMINI_KEYS.length === 0) return '';
  const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
  geminiKeyIndex++;
  return key;
}

export interface CrewHistoryEntry {
  role: 'user' | 'model';
  text: string;
  fromName?: string;
  timestamp: number;
}

/** 共享群組對話歷史 */
export const groupHistory: CrewHistoryEntry[] = [];
const MAX_HISTORY = 200;                // 延長短期記憶，讓 bot 能回溯更多對話

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
  // 冷卻中 → 跳過
  if (isCoolingDown(bot.id)) {
    log.info(`[CrewThink] ${bot.emoji} ${bot.name} 冷卻中，跳過`);
    return { reply: null, actionResults: [] };
  }

  // Agent Flow 即時推播：開始思考
  wsManager.broadcastAgentUpdate({ agentId: bot.id, status: 'thinking', message: userMessage.slice(0, 80) });
  const thinkStartMs = Date.now();
  markThinkStart(bot.id);

  // 靈魂核心 — crew bot 不注入（soulCore + awakening 都含小蔡身份，會導致混淆）
  // loadSoulCoreOnce() 已移除：buildCrewPrompt 的 _soulCore 參數被忽略，無需浪費快取讀取

  // 即時狀態（所有 bot 共享，不重複打 API；截斷避免 system prompt 過肥）
  let [sysStatus, taskSnap] = await Promise.all([
    getSystemStatus(),
    getTaskSnapshot(),
  ]);
  if (sysStatus.length > 500) sysStatus = sysStatus.slice(0, 500) + '\n…（截斷）';
  if (taskSnap.length > 800) taskSnap = taskSnap.slice(0, 800) + '\n…（截斷）';

  // 讀取 bot 個人記憶（根據訊息內容只注入相關情境段落）
  const botMemory = loadBotMemory(bot.id, userMessage);

  const systemPrompt = buildCrewPrompt(bot, senderName, '', '', sysStatus, taskSnap, botMemory);
  const MAX_HISTORY_CHARS = 3000;
  const recentEntries = groupHistory.slice(-15).map(h => {
    const name = h.fromName || (h.role === 'user' ? '用戶' : 'bot');
    const text = h.text.length > 200 ? h.text.slice(0, 200) + '…' : h.text;
    return `[${name}] ${text}`;
  });
  // 從舊的開始刪到不超過限制
  let recentChat = recentEntries.join('\n');
  while (recentChat.length > MAX_HISTORY_CHARS && recentEntries.length > 1) {
    recentEntries.shift();
    recentChat = recentEntries.join('\n');
  }

  // 指揮官指令優先：新訊息放在歷史對話前面，避免被舊脈絡淹沒
  const isCommander = COMMANDER_USERNAMES.has(senderName.toLowerCase()) || senderName === '小蔡' || senderName === '系統';
  const cmdPrefix = isCommander
    ? `\n\n⚠️ **指揮官指令（最高優先級）** — 你必須直接回應以下指令，不要延續之前的話題：\n[${senderName}] ${userMessage}\n\n## 最近群組對話（僅供參考）\n${recentChat}`
    : `\n\n## 當前訊息（請優先回應）\n[${senderName}] ${userMessage}\n\n## 最近群組對話（僅供參考）\n${recentChat}`;
  const fullPrompt = `${systemPrompt}${cmdPrefix}`;

  let finalReply = '';
  const allActionResults: string[] = [];

  // 動態模型選擇：根據任務複雜度選擇模型
  const taskComplexity = assessComplexity(userMessage);
  const dynamicModel = selectModel(bot, taskComplexity);
  if (dynamicModel !== bot.model) {
    log.info(`[CrewThink] ${bot.emoji} ${bot.name} 複雜度=${taskComplexity}，模型 ${bot.model} → ${dynamicModel}`);
  }

  // 模型策略：auto 模式智慧判斷
  // - 指揮官指令 / 訊息觸及 bot 職責關鍵字 → 直接用原配模型（做事）
  // - 純閒聊短句 → Flash（省額度）
  let useFullModel = mode === 'full';
  if (!useFullModel && mode === 'auto') {
    useFullModel = shouldUseFullModel(bot, userMessage, senderName);
    if (useFullModel) {
      // 即使 shouldUseFullModel 為 true，仍受動態模型選擇影響（medium 降級）
      log.info(`[CrewThink] ${bot.emoji} ${bot.name} 偵測到任務意圖，使用 ${dynamicModel} 模型`);
    }
  }

  for (let step = 0; step < MAX_CHAIN_STEPS; step++) {
    const input = step === 0
      ? fullPrompt
      : `[系統回饋] 你上一步的 action 執行結果：\n${allActionResults.slice(-5).join('\n')}\n\n繼續下一步。如果所有步驟都完成了，給出最終回覆（不帶 action JSON）。`;

    // 使用動態模型選擇：useFullModel 時用 dynamicModel（可能被降級），否則用 flash
    const effectiveModel = useFullModel ? dynamicModel : 'gemini-2.5-flash';
    const reply = useFullModel
      ? await callAI(input, bot, dynamicModel)
      : await callGeminiAPI(input, effectiveModel, bot);
    if (!reply) {
      if (step === 0) {
        recordFailure(bot.id, 'empty_reply');
        markThinkEnd(bot.id);
        wsManager.broadcastAgentUpdate({ agentId: bot.id, status: 'idle' });
        return { reply: null, actionResults: [] };
      }
      break;
    }

    // 解析 action JSON
    const actions = extractActionJsons(reply);
    const cleanReply = stripActionJson(reply);

    if (!actions || actions.length === 0) {
      // 沒帶 action → 判斷是否需要重試
      if (step === 0 && cleanReply && !isChitChat(userMessage)) {
        // 有實質回覆內容（>20字）且不是空話 → 接受為最終回覆，不強迫帶 action
        const hasSubstance = cleanReply.length > 20
          && !cleanReply.includes('請重新說明')
          && !cleanReply.includes('請告訴我')
          && !cleanReply.includes('請提供')
          && !cleanReply.includes('可以請您');
        if (hasSubstance) {
          log.info(`[CrewThink] ${bot.emoji} ${bot.name} 第1步有實質回覆(${cleanReply.length}字)，接受為最終回覆`);
          finalReply = cleanReply;
          break;
        }
        // 回覆太短或是空話 → 溫和提醒重試
        log.info(`[CrewThink] ${bot.emoji} ${bot.name} 第1步回覆太短/空話，提醒重試`);
        allActionResults.push(`提示：請直接回答問題或用 action 做事。不要回覆「請重新說明」。`);
        continue;
      }
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
        const action = JSON.parse(jsonStr.replace(/~/g, process.env.HOME || '/tmp')) as Record<string, string>;
        // 常見幻覺 action 自動修正
        const ACTION_ALIASES: Record<string, string> = {
          list_files: 'list_dir', ls: 'list_dir', readfile: 'read_file',
          writefile: 'write_file', search: 'semantic_search', web_fetch: 'web_browse',
          fetch: 'web_browse', google: 'web_search', browse: 'web_browse',
        };
        if (ACTION_ALIASES[action.action]) {
          action.action = ACTION_ALIASES[action.action];
        }
        if (!VALID_ACTIONS.has(action.action)) {
          allActionResults.push(`🚫 未知 action: ${action.action}（可用：semantic_search, read_file, query_supabase 等）`);
          log.warn(`[CrewThink] ${bot.emoji} ${bot.name} 幻覺 action=${action.action}`);
          continue;
        }
        // crew bot 建任務：允許，但強制 owner=bot.name + status=pending（需老蔡審核）
        if (action.action === 'create_task') {
          action.owner = bot.name;
          action.status = 'pending';
          log.info(`[CrewThink] ${bot.emoji} ${bot.name} 建任務（pending，待審核）: ${(action.name || '').slice(0, 50)}`);
        }
        // crew bot 更新任務：允許（讓 bot 能回報任務結果）
        if (action.action === 'update_task') {
          log.info(`[CrewThink] ${bot.emoji} ${bot.name} 更新任務: ${action.id}`);
        }
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

  // ── 驗證迴圈：品質檢查 + 重試 ──
  if (finalReply) {
    const lastActions = extractActionJsons(finalReply);
    const validation = validateReply(finalReply, lastActions);
    if (!validation.ok) {
      log.warn(`[CrewThink] ${bot.emoji} ${bot.name} 回覆品質不通過: ${validation.reason}，用更強模型重試`);
      // 重試 1 次，用原始（更強）模型
      const retryInput = `${fullPrompt}\n\n⚠️ 你上次的回覆品質不足（${validation.reason}），請重新回答，給出有實質內容的回覆。`;
      const retryReply = await callAI(retryInput, bot);
      if (retryReply) {
        const retryClean = stripActionJson(retryReply);
        const retryValidation = validateReply(retryClean, extractActionJsons(retryReply));
        if (retryValidation.ok) {
          log.info(`[CrewThink] ${bot.emoji} ${bot.name} 重試成功，採用新回覆`);
          finalReply = retryClean;
        } else {
          log.warn(`[CrewThink] ${bot.emoji} ${bot.name} 重試仍不通過: ${retryValidation.reason}，返回 null`);
          finalReply = '';
        }
      } else {
        log.warn(`[CrewThink] ${bot.emoji} ${bot.name} 重試返回空，返回 null`);
        finalReply = '';
      }
    }
  }

  if (!finalReply) {
    markThinkEnd(bot.id);
    wsManager.broadcastAgentUpdate({ agentId: bot.id, status: 'idle' });
    return { reply: null, actionResults: allActionResults };
  }

  // Telegram HTML 友好格式
  // 先跳脫 HTML 特殊字元，再轉換 markdown → HTML 標籤
  const escaped = finalReply
    .replace(/&/g, '&amp;')                          // & → &amp;（必須最先處理）
    .replace(/</g, '&lt;')                           // < → &lt;
    .replace(/>/g, '&gt;');                           // > → &gt;
  const clean = escaped
    .replace(/^#{1,6}\s*/gm, '')                     // 移除 markdown 標題符號
    .replace(/```\w*\n?[\s\S]*?```/g, '')            // 移除完整 ``` 代碼區塊
    .replace(/```\w*\n[\s\S]*$/g, '')                // 移除沒有結尾 ``` 的殘留代碼區塊
    .replace(/^(curl|bash|npm|node|git|python|pip|docker|kubectl|wget|ssh|scp)\s+.+$/gm, '')  // 移除獨立 shell 命令行
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')          // **粗體** → HTML <b>
    .replace(/\*(.+?)\*/g, '<i>$1</i>')              // *斜體* → HTML <i>
    .replace(/^[-*]\s/gm, '• ')                       // 列表符號統一為 •
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')       // `code` → HTML <code>
    .replace(/\n{3,}/g, '\n\n')                       // 連續空行壓縮
    .trim();

  // Telegram 訊息上限 4096，留 200 給 bot header → 3500 字是安全上限（Telegram 上限 4096）
  // 超長回覆 → 用 Gemini Flash 自動摘要重點，保留完整分析但精簡表達
  let truncated = clean;
  if (clean.length > 3500) {
    log.info(`[CrewThink] ${bot.emoji} ${bot.name} 回覆過長(${clean.length}字)，自動摘要`);
    const summary = await summarizeReply(clean, bot);
    truncated = summary || smartTruncate(clean, 3500);
  }

  // 自動追加工作紀錄到 bot 的 MEMORY.md
  appendWorkLog(bot.id, userMessage, allActionResults, truncated);

  // 品質評分（追蹤用）
  scoreReply(bot, userMessage, truncated, allActionResults);

  // 任務自動回報已停用 — crew bot 不應自動建任務，避免垃圾任務堆積
  // autoReportTask(bot, userMessage, allActionResults, truncated);

  // 低頻觸發 workspace 自動清理（5% 機率 + 24h 節流，非同步不阻塞）
  maybeCleanupWorkspace(bot.id);

  // 紀錄成功 + 結束思考追蹤
  recordSuccess(bot.id, Date.now() - thinkStartMs);
  markThinkEnd(bot.id);

  // Agent Flow 即時推播：思考完成
  wsManager.broadcastAgentUpdate({ agentId: bot.id, status: 'idle' });

  return { reply: truncated || null, actionResults: allActionResults };
}

// ── 任務自動回報 ──

/**
 * 自動回報任務 — bot 執行了有意義的 action 後，自動在任務系統建立紀錄
 * 條件：至少有 1 個成功的 write/patch/create_task action
 */
function autoReportTask(
  bot: CrewBotConfig,
  userMessage: string,
  actionResults: string[],
  reply: string,
): void {
  try {
    // 只有真正做了事（write/patch/create_task 成功）才回報
    const productiveActions = actionResults.filter(r =>
      r.startsWith('✅') &&
      (r.includes('write_file') || r.includes('patch_file') || r.includes('create_task'))
    );
    if (productiveActions.length === 0) return;

    const taskName = `[${bot.name}] ${userMessage.slice(0, 40).replace(/\n/g, ' ')}`;
    const taskResult = productiveActions.map(a => a.slice(0, 80)).join('; ');

    // 透過 executeNEUXAAction 建立已完成的任務
    executeNEUXAAction({
      action: 'create_task',
      name: taskName,
      description: `${bot.name}自動完成：${reply.slice(0, 100)}`,
      status: 'done',
      result: taskResult.slice(0, 200),
      owner: bot.name,
    }).catch(() => {});

    log.info(`[CrewAutoReport] ${bot.emoji} ${bot.name} 自動回報任務: ${taskName.slice(0, 50)}`);
  } catch {
    // 失敗不影響主流程
  }
}

// ── 品質評分（10 分制） ──

const GENERIC_PHRASES = ['建議你', '可以試試', '你可以', '建議查看', '你可以試試', '可以嘗試'];
const WRITE_ACTIONS = ['write_file', 'patch_file', 'create_task'];
const DATA_ACTIONS = ['query_supabase', 'run_script'];
const KNOWLEDGE_CITE_PHRASES = ['根據', '知識庫', '查詢結果', '搜尋結果', '根據知識', '根據資料', '查到', '找到'];

function scoreReply(
  bot: CrewBotConfig,
  userMessage: string,
  finalReply: string,
  allActionResults: string[],
): void {
  // 原始 5 分
  const hasAction = allActionResults.length > 0 ? 1 : 0;
  const hasDirectAction = allActionResults.some(r => !r.includes('semantic_search')) ? 1 : 0;
  const hasSubstance = finalReply.length > 30 ? 1 : 0;
  const notGeneric = GENERIC_PHRASES.some(p => finalReply.includes(p)) ? 0 : 1;

  let actionSuccess = 0;
  if (allActionResults.length > 0) {
    const successCount = allActionResults.filter(r => r.startsWith('✅')).length;
    actionSuccess = (successCount / allActionResults.length) > 0.5 ? 1 : 0;
  }

  // 新增 5 分
  // 6. hasWriteAction — 有 write_file / patch_file / create_task（真正產出）
  const hasWriteAction = allActionResults.some(r => WRITE_ACTIONS.some(a => r.includes(a))) ? 1 : 0;

  // 7. hasDataQuery — 有 query_supabase / run_script（用數據說話）
  const hasDataQuery = allActionResults.some(r => DATA_ACTIONS.some(a => r.includes(a))) ? 1 : 0;

  // 8. citesKnowledge — 回覆中引用了知識庫結果
  const citesKnowledge = KNOWLEDGE_CITE_PHRASES.some(p => finalReply.includes(p)) ? 1 : 0;

  // 9. actionEfficiency — action 數量在 1-6 之間（太少沒做事，太多在亂試）
  const actionCount = allActionResults.length;
  const actionEfficiency = (actionCount >= 1 && actionCount <= 6) ? 1 : 0;

  // 10. replyRelevance — 回覆長度在 50-2000 字之間（太短沒用，太長灌水）
  const replyLen = finalReply.length;
  const replyRelevance = (replyLen >= 50 && replyLen <= 2000) ? 1 : 0;

  const total = hasAction + hasDirectAction + hasSubstance + notGeneric + actionSuccess
    + hasWriteAction + hasDataQuery + citesKnowledge + actionEfficiency + replyRelevance;

  log.info(
    `[CrewScore] ${bot.emoji} ${bot.name} score=${total}/10`
    + ` (action=${hasAction} direct=${hasDirectAction} substance=${hasSubstance} notGeneric=${notGeneric} success=${actionSuccess}`
    + ` | write=${hasWriteAction} data=${hasDataQuery} cite=${citesKnowledge} efficiency=${actionEfficiency} relevance=${replyRelevance})`,
  );
}

// ── 工作紀錄自動追加 ──

/** 去掉 reply 開頭的廢話前綴，讓摘要更有資訊量 */
function cleanReplyPrefix(text: string): string {
  return text
    .replace(/^(根據搜尋結果[，,：:\s]*)/i, '')
    .replace(/^(根據(你|您)提供的[^，,：:]*[，,：:\s]*)/i, '')
    .replace(/^(根據(知識庫|資料庫|系統|查詢)[^，,：:]*[，,：:\s]*)/i, '')
    .replace(/^(我已(經)?完成[^，,：:]*[，,：:\s]*)/i, '')
    .replace(/^(我已(經)?[^，,：:]*[，,：:\s]*)/i, '')
    .replace(/^(好的[，,：:\s]*)/i, '')
    .replace(/^(OK[，,：:\s]*)/i, '')
    .replace(/^(收到[，,：:\s]*)/i, '')
    .replace(/^(了解[，,：:\s]*)/i, '')
    .replace(/^(沒問題[，,：:\s]*)/i, '')
    .trim();
}

/** 從 actionResults 提取去重的 action 名稱列表 */
function extractActionNames(actionResults: string[]): string {
  const names = new Set<string>();
  for (const r of actionResults) {
    // actionResults 格式: "✅ semantic_search: ..." 或 "🚫 run_script: ..."
    const m = r.match(/^[✅🚫]\s*([a-z_]+)/);
    if (m) names.add(m[1]);
  }
  return Array.from(names).join('+') || `${actionResults.length}actions`;
}

/** 歸檔舊工作紀錄到 memory-archive/{YYYY-MM}.md（按月份） */
function archiveOldLogs(botId: string, lines: string[]): void {
  try {
    const archiveDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew', botId, 'memory-archive');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });

    const byMonth: Record<string, string[]> = {};
    for (const line of lines) {
      const m = line.match(/\[(\d{4}-\d{2})/);
      const month = m ? m[1] : new Date().toISOString().slice(0, 7);
      if (!byMonth[month]) byMonth[month] = [];
      byMonth[month].push(line);
    }

    for (const [month, monthLines] of Object.entries(byMonth)) {
      const archivePath = path.join(archiveDir, `${month}.md`);
      if (!fs.existsSync(archivePath)) {
        fs.writeFileSync(archivePath, `# ${botId} 工作紀錄歸檔 — ${month}\n\n${monthLines.join('\n')}\n`, 'utf-8');
      } else {
        fs.appendFileSync(archivePath, monthLines.join('\n') + '\n', 'utf-8');
      }
    }
    log.info(`[CrewArchive] ${botId} 歸檔 ${lines.length} 條舊紀錄`);
  } catch (err) {
    log.warn({ err }, `[CrewArchive] 歸檔失敗 bot=${botId}`);
  }
}

// ── Workspace 自動清理 ──

/** 每個 bot 上次清理時間（記憶體內，重啟歸零即可） */
const lastCleanupAt = new Map<string, number>();
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 小時最多清理一次
const MOVE_AFTER_DAYS = 7;   // 根目錄 .md 超過 7 天 → 移到 notes/
const DELETE_AFTER_DAYS = 30; // notes/ 裡超過 30 天 → 刪除

/**
 * 自動清理 bot workspace
 * - 掃描 ~/.openclaw/workspace/crew/{botId}/ 根目錄的 .md（排除 MEMORY.md）
 * - 超過 7 天 → 移到 notes/ 子目錄
 * - notes/ 裡超過 30 天 → 刪除
 */
async function cleanupBotWorkspace(botId: string): Promise<void> {
  const baseDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew', botId);
  const notesDir = path.join(baseDir, 'notes');
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  // ── Phase 1：根目錄舊 .md → 移到 notes/ ──
  try {
    const entries = await fsp.readdir(baseDir, { withFileTypes: true });
    const mdFiles = entries.filter(
      e => e.isFile() && e.name.endsWith('.md') && e.name !== 'MEMORY.md',
    );

    let movedCount = 0;
    for (const file of mdFiles) {
      try {
        const filePath = path.join(baseDir, file.name);
        const stat = await fsp.stat(filePath);
        const ageDays = (now - stat.mtimeMs) / msPerDay;

        if (ageDays > MOVE_AFTER_DAYS) {
          // 確保 notes/ 目錄存在
          await fsp.mkdir(notesDir, { recursive: true });
          const destPath = path.join(notesDir, file.name);
          await fsp.rename(filePath, destPath);
          movedCount++;
        }
      } catch (err) {
        log.warn({ err }, `[CrewCleanup] ${botId} 移動檔案失敗: ${file.name}`);
      }
    }

    if (movedCount > 0) {
      log.info(`[CrewCleanup] ${botId} 移動 ${movedCount} 個過期 .md 到 notes/`);
    }
  } catch (err) {
    // 目錄不存在等情況，靜默跳過
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn({ err }, `[CrewCleanup] ${botId} 掃描根目錄失敗`);
    }
  }

  // ── Phase 2：notes/ 超過 30 天 → 刪除 ──
  try {
    const notesEntries = await fsp.readdir(notesDir, { withFileTypes: true });
    const oldFiles = notesEntries.filter(e => e.isFile());

    let deletedCount = 0;
    for (const file of oldFiles) {
      try {
        const filePath = path.join(notesDir, file.name);
        const stat = await fsp.stat(filePath);
        const ageDays = (now - stat.mtimeMs) / msPerDay;

        if (ageDays > DELETE_AFTER_DAYS) {
          await fsp.unlink(filePath);
          deletedCount++;
        }
      } catch (err) {
        log.warn({ err }, `[CrewCleanup] ${botId} 刪除過期檔案失敗: ${file.name}`);
      }
    }

    if (deletedCount > 0) {
      log.info(`[CrewCleanup] ${botId} 刪除 ${deletedCount} 個超過 ${DELETE_AFTER_DAYS} 天的 notes/ 檔案`);
    }
  } catch (err) {
    // notes/ 目錄不存在，正常情況
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.warn({ err }, `[CrewCleanup] ${botId} 掃描 notes/ 失敗`);
    }
  }
}

/**
 * 低頻觸發 workspace 清理（5% 機率 + 24 小時節流）
 * 清理失敗不影響主功能
 */
function maybeCleanupWorkspace(botId: string): void {
  // 5% 機率觸發
  if (Math.random() > 0.05) return;

  // 24 小時節流
  const lastTime = lastCleanupAt.get(botId) || 0;
  if (Date.now() - lastTime < CLEANUP_INTERVAL_MS) return;

  lastCleanupAt.set(botId, Date.now());
  log.info(`[CrewCleanup] ${botId} 觸發 workspace 自動清理`);

  // 非同步執行，不阻塞主流程
  cleanupBotWorkspace(botId).catch(err => {
    log.warn({ err }, `[CrewCleanup] ${botId} workspace 清理異常`);
  });
}

function appendWorkLog(botId: string, _userMessage: string, actionResults: string[], reply: string): void {
  // 沒有 action 也沒有回覆 → 跳過
  if ((!actionResults || actionResults.length === 0) && !reply) return;

  try {
    const memPath = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew', botId, 'MEMORY.md');

    // 確保目錄存在
    const dir = path.dirname(memPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 格式化時間 YYYY-MM-DD HH:mm
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // actionSummary: 去重的 action 名稱列表，純對話標記「對話」
    const actionSummary = actionResults.length > 0 ? extractActionNames(actionResults) : '對話';

    // outcomeSummary: 成功數/總數 + reply 前 40 字（去廢話前綴）
    const cleanedReply = cleanReplyPrefix((reply || '').replace(/\n/g, ' '));
    const replySnippet = cleanedReply.slice(0, 40) + (cleanedReply.length > 40 ? '\u2026' : '');
    const outcomeSummary = actionResults.length > 0
      ? `${actionResults.filter(r => r.startsWith('\u2705')).length}/${actionResults.length}ok ${replySnippet}`
      : replySnippet;

    const logLine = `\n- [${ts}] ${actionSummary} \u2192 ${outcomeSummary}`;

    // 如果檔案不存在，建立含標題的初始內容
    if (!fs.existsSync(memPath)) {
      fs.writeFileSync(memPath, `## 工作紀錄${logLine}\n`, 'utf-8');
      return;
    }

    // 讀取現有內容，檢查大小
    let content = fs.readFileSync(memPath, 'utf-8');

    // 超過 3000 字元，保留最後 10 條 + 歸檔舊紀錄
    if (content.length > 3000) {
      const lines = content.split('\n');
      const headerLines: string[] = [];
      const logLines: string[] = [];
      let inLogSection = false;

      for (const line of lines) {
        if (line.startsWith('## 工作紀錄')) {
          inLogSection = true;
          headerLines.push(line);
          continue;
        }
        if (inLogSection && line.startsWith('- [')) {
          logLines.push(line);
        } else if (!inLogSection) {
          headerLines.push(line);
        }
      }

      const MAX_KEEP = 10;
      if (logLines.length > MAX_KEEP) {
        const toArchive = logLines.slice(0, logLines.length - MAX_KEEP);
        archiveOldLogs(botId, toArchive);
      }
      const kept = logLines.slice(-MAX_KEEP);
      content = headerLines.join('\n') + '\n' + kept.join('\n');
      fs.writeFileSync(memPath, content + logLine + '\n', 'utf-8');
    } else {
      // 直接追加
      fs.appendFileSync(memPath, logLine + '\n', 'utf-8');
    }
  } catch (err) {
    // 失敗不影響主流程
    log.warn({ err }, `[CrewThink] appendWorkLog failed for bot=${botId}`);
  }
}

// ── AI 呼叫路由 ──

async function callAI(prompt: string, bot: CrewBotConfig, overrideModel?: string): Promise<string | null> {
  const effectiveModel = overrideModel || bot.model;
  // Claude 訂閱制模型（opus/sonnet/haiku）
  if (effectiveModel.startsWith('claude-') || effectiveModel === 'claude') {
    // 巡邏場景直接用 Gemini Pro（Claude CLI 不擅長輸出 action JSON）
    const isPatrol = prompt.includes('巡邏') && prompt.includes('action JSON');
    if (isPatrol) {
      log.info(`[CrewThink] ${bot.name} 巡邏場景，跳過 Claude 直接用 Gemini Pro（action JSON 更穩定）`);
      const geminiPrompt = `【重要提醒】你是 ${bot.name}（${bot.role}），以下是你的完整指令，請用繁體中文回覆，直接執行任務。不要對指令本身做評論。\n\n${prompt}`;
      const result = await callGeminiAPI(geminiPrompt, 'gemini-2.5-pro', bot);
      if (result) return result;
      return callGeminiAPI(geminiPrompt, 'gemini-2.5-flash', bot);
    }
    // 用 overrideModel 臨時覆蓋 bot.model，讓 callClaudeCLI 選對 CLI model
    const tempBot = overrideModel ? { ...bot, model: effectiveModel as any } : bot;
    const result = await callClaudeCLI(prompt, tempBot);
    if (result) return result;
    // Claude 失敗 → fallback Gemini Pro（任務需要品質）
    log.info(`[CrewThink] ${bot.name} Claude(${effectiveModel}) 失敗，fallback Gemini Pro`);
    // 加上身份提醒，避免 Gemini 把 system prompt 當成外部 AI 輸出而用英文回覆
    const geminiPrompt = `【重要提醒】你是 ${bot.name}（${bot.role}），以下是你的完整指令，請用繁體中文回覆，直接執行任務。不要對指令本身做評論。\n\n${prompt}`;
    return callGeminiAPI(geminiPrompt, 'gemini-2.5-pro', bot);
  }
  // Gemini Pro
  if (effectiveModel === 'gemini-pro') {
    const result = await callGeminiAPI(prompt, 'gemini-2.5-pro', bot);
    if (result) return result;
    log.info(`[CrewThink] ${bot.name} Gemini Pro 失敗，fallback Flash`);
    return callGeminiAPI(prompt, 'gemini-2.5-flash', bot);
  }
  // Gemini Flash（預設）
  return callGeminiAPI(prompt, 'gemini-2.5-flash', bot);
}

/**
 * 超長回覆自動摘要 — 用 Gemini Flash 把冗長回覆精簡成重點
 * 保留完整分析邏輯，但去除重複、灌水、過度客套
 */
async function summarizeReply(longReply: string, bot: CrewBotConfig): Promise<string | null> {
  const summaryPrompt = `你是摘要助手。以下是 ${bot.name}（${bot.role}）在 Telegram 群組的回覆，太長了需要精簡。

要求：
- 保留所有關鍵資訊、數據、結論、建議
- 去除重複的描述、客套話、過度鋪陳
- 用條列式整理重點，精簡但不遺漏
- 繁體中文，控制在 800 字以內
- 不要加「以下是摘要」之類的前綴，直接給精簡後的內容

原文：
${longReply}`;

  try {
    const apiKey = getGeminiKey();
    if (!apiKey) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: summaryPrompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
      }),
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) {
      log.info(`[CrewSummary] ${bot.emoji} ${bot.name} 摘要完成 ${longReply.length}→${text.length}字`);
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

/** 智慧截斷兜底 — 摘要失敗時，找完整句子再切 */
function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cutRegion = text.slice(maxLen - 300, maxLen);
  const lastBreak = Math.max(
    cutRegion.lastIndexOf('。'),
    cutRegion.lastIndexOf('！'),
    cutRegion.lastIndexOf('？'),
    cutRegion.lastIndexOf('\n'),
    cutRegion.lastIndexOf('. '),
  );
  const cutAt = lastBreak >= 0 ? (maxLen - 300) + lastBreak + 1 : maxLen - 3;
  return text.slice(0, cutAt).trimEnd() + '...';
}

/**
 * 呼叫 Gemini API（Flash 或 Pro）
 */
async function callGeminiAPI(prompt: string, model: string, bot: CrewBotConfig): Promise<string | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    log.warn(`[CrewThink] ${bot.name} 無 Gemini API Key，無法呼叫`);
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const timeoutMs = model.includes('pro') ? GEMINI_PRO_TIMEOUT_MS : GEMINI_FLASH_TIMEOUT_MS;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,    // 加大避免 MAX_TOKENS 截斷空回覆，超長由後端自動摘要
          temperature: 0.3,
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
      recordFailure(bot.id, 'api_error');
      return null;
    }

    const json = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const finishReason = json.candidates?.[0]?.finishReason;
    if (text) {
      const truncNote = finishReason === 'MAX_TOKENS' ? '（截斷）' : '';
      log.info(`[CrewThink] ${bot.emoji} ${bot.name} Gemini(${model.includes('pro') ? 'pro' : 'flash'}) OK, replyLen=${text.length}${truncNote}`);
      return text;
    }

    log.warn(`[CrewThink] ${bot.name} Gemini 回覆為空 finishReason=${finishReason}`);
    recordFailure(bot.id, 'empty_reply');
    return null;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      log.warn(`[CrewThink] ${bot.name} Gemini 超時 (${timeoutMs / 1000}s)`);
      recordFailure(bot.id, 'timeout');
    } else {
      log.error({ err }, `[CrewThink] ${bot.name} Gemini API 呼叫失敗`);
      recordFailure(bot.id, 'api_error');
    }
    return null;
  }
}

/**
 * 呼叫 Claude Code CLI (Sonnet 4.6) — 有併發鎖
 */
async function callClaudeCLI(prompt: string, bot: CrewBotConfig): Promise<string | null> {
  // 15 秒全局冷卻（crew bots 共用，避免打滿 Claude 訂閱額度）
  const sinceLastCall = Date.now() - lastClaudeCallAt;
  if (lastClaudeCallAt > 0 && sinceLastCall < CLAUDE_GLOBAL_COOLDOWN_MS) {
    log.info(`[CrewThink] ${bot.name} Claude CLI 冷卻中（${Math.ceil((CLAUDE_GLOBAL_COOLDOWN_MS - sinceLastCall) / 1000)}s），用 Gemini`);
    return null;
  }
  // 併發鎖
  // Claude CLI 熔斷：共用小蔡的熔斷器（同一個訂閱）
  if (claudeCliCircuitOpen()) {
    log.info(`[CrewThink] ${bot.name} ⚡ Claude CLI 熔斷中，跳過`);
    recordFailure(bot.id, 'circuit_break');
    return null;
  }
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

      // 根據 bot.model 選擇 CLI 模型：claude-opus→opus, claude-haiku→haiku, 其他→sonnet
      const cliModel = bot.model === 'claude-opus' ? 'opus'
        : bot.model === 'claude-haiku' ? 'haiku'
        : 'sonnet';
      const child = spawn(claudeBin, [
        '-p',
        '--model', cliModel,
        '--output-format', 'text',
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
          delete e.ANTHROPIC_API_KEY;
          return e;
        })(),
        cwd: process.env.HOME || '/tmp',
        timeout: CLAUDE_TIMEOUT_MS,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 用 stdin 傳 prompt（避免 shell arg 長度限制截斷 action 格式指示）
      if (child.stdin) {
        child.stdin.write(prompt);
        child.stdin.end();
      }

      child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        log.warn(`[CrewThink] ${bot.name} Claude CLI 超時 (${CLAUDE_TIMEOUT_MS / 1000}s)`);
        recordFailure(bot.id, 'timeout');
        resolve(null);
      }, CLAUDE_TIMEOUT_MS);

      child.on('close', (code) => {
        clearTimeout(timer);
        const reply = stdout.trim();
        if (code === 0 && reply) {
          claudeCliRecordSuccess();
          lastClaudeCallAt = Date.now();  // 更新全局冷卻時間戳
          log.info(`[CrewThink] ${bot.emoji} ${bot.name} Claude OK, replyLen=${reply.length}`);
          resolve(reply);
        } else {
          claudeCliRecordFail();
          log.warn(`[CrewThink] ${bot.name} Claude exit=${code} stderr=${stderr.slice(0, 200)} stdout=${stdout.slice(0, 300)}`);
          resolve(null);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        log.error({ err }, `[CrewThink] ${bot.name} Claude CLI spawn failed`);
        recordFailure(bot.id, 'api_error');
        resolve(null);
      });
    });
  } finally {
    claudeRunning--;
  }
}

// ── 智慧模型判斷 ──

/** 管理員/指揮官 username */
const COMMANDER_USERNAMES = new Set(
  (process.env.COMMANDER_USERNAMES || 'xiaoji_cai_bot,gousmaaa,sky770825')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

/** 任務意圖關鍵字（跨 bot 通用） */
const TASK_INTENT_KEYWORDS = [
  '幫我', '幫忙', '請', '執行', '做', '查', '找', '修', '改', '建',
  '分析', '掃', '檢查', '監控', '報告', '整理', '寫', '產', '算',
  '部署', 'deploy', '跑', 'run', '測試', 'test', '搜', '看一下',
  '處理', '拆解', '規劃', '排查', '告警', '異常', '錯誤', 'error',
  'bug', 'fix', '更新', '升級', '優化', '追蹤',
];

const CHITCHAT_PATTERNS = [
  /^(早安?|午安|晚安|嗨|hi|hello|hey|哈+|嘿|yo)[\s!！。.~]*$/i,
  /^(辛苦了?|謝謝|感謝|讚|棒|ok|好的?|收到|了解|掰|再見|88)[\s!！。.~]*$/i,
  /^[\p{Emoji}\s]+$/u,
];

/** 不需要 action 的「簡單回覆型」訊息模式 */
const SIMPLE_REPLY_PATTERNS = [
  // 問身份/狀態/模型（校準類）
  /回報|報到|自我介紹|你是誰|你的(名字|專長|職責|模型|角色|身份)/,
  /校準|點名|簽到|報名/,
  // 意見/感想類
  /你(覺得|認為|看法|怎麼看|有什麼想法)/,
  /你的(意見|建議|看法|想法)/,
  // 確認/狀態類
  /在嗎|還在嗎|有空嗎|準備好了嗎/,
];

/** 判斷是否純閒聊短句（不需要 action） */
function isChitChat(message: string): boolean {
  const trimmed = message.trim();
  // 短打招呼
  if (trimmed.length <= 15 && CHITCHAT_PATTERNS.some(p => p.test(trimmed))) return true;
  // 簡單回覆型（不需要查資料或執行操作，直接回答即可）
  if (SIMPLE_REPLY_PATTERNS.some(p => p.test(trimmed))) return true;
  return false;
}

/**
 * 判斷是否應該直接用原配模型（而非 Flash）
 * 條件：指揮官指令 / 訊息含任務意圖 / 訊息觸及 bot 職責關鍵字（>=2 個）
 */
function shouldUseFullModel(bot: CrewBotConfig, message: string, senderName: string): boolean {
  // 輕量 bot（flash/haiku）不需要升級
  if (bot.model === 'gemini-flash' || bot.model === 'claude-haiku') return false;

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
    // 移除完整 ```language...``` 代碼區塊（任何語言）
    .replace(/```\w*\n?[\s\S]*?```/g, '')
    // 移除沒有結尾 ``` 的代碼區塊（只有開頭 ```language 但沒關閉）
    .replace(/```\w*\n[\s\S]*$/g, '')
    // 移除帶大量 content 的 action JSON（例如 write_file 帶內容）
    .replace(/\{[\s\n]*"action"\s*:\s*"[^"]*"[\s\S]*?"content"\s*:\s*"[\s\S]*?"\s*\}/g, '')
    // 移除一般 action JSON
    .replace(/\{[\s\n]*"action"[\s\S]*?\n\}/g, '')
    // 移除獨立成段的 shell 命令（curl、bash、npm、node、git 開頭的整行）
    .replace(/^(curl|bash|npm|node|git|python|pip|docker|kubectl|wget|ssh|scp)\s+.+$/gm, '')
    // 連續空行壓縮
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── System Prompt ──

/** 情境關鍵字匹配表：情境編號 → 觸發關鍵字 */
const PLAYBOOK_SCENARIO_KEYWORDS: Record<number, string[]> = {
  1: ['網站', '開發', '功能', '新增', '做一個', '建立', 'feature', '頁面', '前端', '後端', 'API', '自動化', '工作流'],
  2: ['錯誤', 'error', 'bug', '故障', '掛了', 'crash', '500', '失敗', 'fail', '修', '壞了'],
  3: ['商業', '賺錢', '營收', '競品', '市場', '990', '房', '成本', '定價', '用戶'],
  4: ['巡邏', '檢查', '狀態', '健康', 'health', '監控', 'metrics'],
  5: ['整理', '知識', '索引', '歸檔', '記憶', '文件'],
};

/** 讀取 bot 個人記憶 + 根據訊息內容注入相關協作劇本段落（省 token） */
function loadBotMemory(botId: string, userMessage: string = ''): string {
  const crewDir = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace', 'crew');
  const parts: string[] = [];

  // 個人記憶（分段截斷：header 800 字 + 工作紀錄 700 字從末尾取，確保最新紀錄可見）
  try {
    const raw = fs.readFileSync(path.join(crewDir, botId, 'MEMORY.md'), 'utf-8').trim();
    if (raw) {
      const logIdx = raw.indexOf('## 工作紀錄');
      if (logIdx === -1) {
        parts.push(raw.length > 1500 ? raw.slice(0, 1500) + '\n...(截斷)' : raw);
      } else {
        const header = raw.slice(0, logIdx).trim();
        const logSection = raw.slice(logIdx).trim();
        const h = header.length > 800 ? header.slice(0, 800) + '\n...' : header;
        const l = logSection.length > 700 ? logSection.slice(logSection.length - 700) : logSection;
        parts.push(h + '\n\n' + l);
      }
    }
  } catch { /* no memory yet */ }

  // 個人 Critical Rules（RULES.md）— 紀律與 KPI
  try {
    const rules = fs.readFileSync(path.join(crewDir, botId, 'RULES.md'), 'utf-8').trim();
    if (rules) parts.push(rules.length > 1500 ? rules.slice(0, 1500) + '\n...(截斷)' : rules);
  } catch { /* no rules yet */ }

  // 個人協作劇本（per-bot PLAYBOOK.md）— 專屬情境 SOP
  try {
    const botPlaybook = fs.readFileSync(path.join(crewDir, botId, 'PLAYBOOK.md'), 'utf-8').trim();
    if (botPlaybook) {
      const relevantBotPlaybook = extractRelevantPlaybook(botPlaybook, userMessage);
      if (relevantBotPlaybook) parts.push(relevantBotPlaybook);
    }
  } catch { /* no per-bot playbook */ }

  // 共享協作劇本 — 只注入相關情境段落
  try {
    const playbook = fs.readFileSync(path.join(crewDir, 'PLAYBOOK.md'), 'utf-8').trim();
    if (playbook) {
      const relevantPlaybook = extractRelevantPlaybook(playbook, userMessage);
      if (relevantPlaybook) parts.push(relevantPlaybook);
    }
  } catch { /* no playbook */ }

  // 共用 QA 規則 + 交接模板
  try {
    const qa = fs.readFileSync(path.join(crewDir, 'QA-RULES.md'), 'utf-8').trim();
    if (qa) parts.push(qa.length > 800 ? qa.slice(0, 800) + '\n...(截斷)' : qa);
  } catch { /* no QA rules */ }
  try {
    const handoff = fs.readFileSync(path.join(crewDir, 'HANDOFF-TEMPLATE.md'), 'utf-8').trim();
    if (handoff) parts.push(handoff.length > 600 ? handoff.slice(0, 600) + '\n...(截斷)' : handoff);
  } catch { /* no handoff template */ }

  // Inbox 待處理摘要 — 讓 bot 知道自己有待辦
  try {
    const inboxCtx = getInboxContext(botId);
    if (inboxCtx) parts.push(inboxCtx);
  } catch { /* inbox scan failed, not critical */ }

  return parts.join('\n\n---\n\n');
}

/**
 * 從 PLAYBOOK.md 提取與 userMessage 相關的情境段落
 * - 用正則切割 `## 情境 N：` 段落
 * - 根據關鍵字匹配選擇最相關的 1-2 個情境
 * - 情境 6（指令）和協作原則永遠包含
 * - 沒有匹配時兜底：情境 6 + 協作原則
 */
function extractRelevantPlaybook(playbook: string, userMessage: string): string {
  const lower = userMessage.toLowerCase();

  // 用正則切割段落：每個 `## ` 開頭是一個段落
  const sections = playbook.split(/(?=^## )/m).map(s => s.trim()).filter(Boolean);

  // 分類段落
  const scenarioSections: Record<number, string> = {};
  let collaborationSection = '';
  let headerSection = '';

  for (const section of sections) {
    // 匹配情境段落：## 情境 N：...
    const scenarioMatch = section.match(/^## 情境\s*(\d+)/);
    if (scenarioMatch) {
      scenarioSections[parseInt(scenarioMatch[1], 10)] = section;
      continue;
    }
    // 匹配協作原則
    if (section.startsWith('## 協作原則')) {
      collaborationSection = section;
      continue;
    }
    // 標題/前言（非 ## 開頭的段落）
    if (!section.startsWith('## ')) {
      headerSection = section;
    }
  }

  // 根據 userMessage 關鍵字匹配情境（排除情境6，它永遠包含）
  const matchedIds: number[] = [];
  for (const [idStr, keywords] of Object.entries(PLAYBOOK_SCENARIO_KEYWORDS)) {
    const id = parseInt(idStr, 10);
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      matchedIds.push(id);
    }
  }

  // 組裝結果：最多取前 2 個匹配情境 + 情境 6（永遠包含）+ 協作原則（永遠包含）
  const resultParts: string[] = [];

  // 簡短標題
  if (headerSection) {
    // 只保留第一行標題，不需要整段前言
    const firstLine = headerSection.split('\n')[0];
    if (firstLine) resultParts.push(firstLine);
  }

  // 匹配到的情境（最多 2 個）
  for (const id of matchedIds.slice(0, 2)) {
    if (scenarioSections[id]) {
      resultParts.push(scenarioSections[id]);
    }
  }

  // 情境 6 永遠包含（很短，指揮官指令優先規則）
  if (scenarioSections[6]) {
    resultParts.push(scenarioSections[6]);
  }

  // 協作原則永遠包含
  if (collaborationSection) {
    resultParts.push(collaborationSection);
  }

  return resultParts.join('\n\n');
}

function buildCrewPrompt(
  bot: CrewBotConfig,
  senderName: string,
  _soulCore: string,
  awakening: string,
  sysStatus: string,
  taskSnap: string,
  botMemory: string,
): string {
  const otherBots = ACTIVE_CREW_BOTS
    .filter(b => b.id !== bot.id && b.token)
    .map(b => `${b.name}(${b.role})`)
    .join('、');

  const _projectRoot = process.env.OPENCLAW_PROJECT_ROOT || '/Users/caijunchang/openclaw任務面版設計';
  const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

  return `你是 ${bot.name}，NEUXA 星群指揮處的${bot.role}。你是 OpenClaw 系統的一員，擁有完整的系統操作能力。

⚠️ **身份確認（最高優先）**：
- 你是 **${bot.name}**（${bot.role}），不是小蔡，不是指揮官，不是副手
- 小蔡是你的指揮官，你跟小蔡是不同的人
- 回覆時永遠以 ${bot.name} 的身份和口吻說話
- 如果知識庫搜到的結果提到「小蔡」「我是小蔡」「副手」，那是別人的資料，跟你無關
- 你必須用繁體中文回覆，不要用英文

## 身份
${bot.personality}

## 你的職責
${bot.duties.map(d => `- ${d}`).join('\n')}
${botMemory ? `\n## 我的記憶（上次工作紀錄）\n${botMemory}\n\n你的個人目錄：~/.openclaw/workspace/crew/${bot.id}/\n📚 **你的專屬知識庫**：~/.openclaw/workspace/crew/${bot.id}/knowledge/（遇到專業問題先讀這裡）\n⚠️ MEMORY.md 系統保護，不能直接 write_file 覆蓋。工作紀錄會自動追加。如需寫筆記，寫到 ~/.openclaw/workspace/crew/${bot.id}/notes.md` : ''}

## 星群精神（你是 ${bot.name}，以下是團隊共同精神，不是你的身份）
- 做事優先：直接做，不寫報告等審核
- 遇錯自修：看 log、找原因、修好它
- 提升能力：每次任務都讓系統更強
- 不怕犯錯，只怕沒學到東西
- 🚫 如果搜到「小蔡」「指揮官」「我是副手」的資料，那是小蔡的身份，不是你的！你是 ${bot.name}（${bot.role}）！

## 場景
你正在「NEUXA星群指揮處」Telegram 群組裡，跟老蔡和其他成員討論。
群組裡還有小蔡（指揮官）和：${otherBots}。
你只在自己專長領域發言，不搶別人的話題。

## 協作與轉介
不是你專長的事，轉給對的人。用 write_file 寫 inbox 檔案 + 群組 @提及。

**星群成員專長速查：**
${ACTIVE_CREW_BOTS.filter(b => b.id !== bot.id && b.token).map(b => `- ${b.emoji} **${b.name}**（${b.role}）：${b.duties[0]}`).join('\n')}
- 🧠 **小蔡**（指揮官）：git push、部署、重大決策

**轉介規則：**
1. 不是你的領域 → 寫檔到對方 inbox + 群組 @對方名字
2. inbox 路徑：\`~/.openclaw/workspace/crew/{對方botId}/inbox/{類型}-{時間戳}-${bot.id}.md\`
3. 類型代碼：alert（告警）、task（任務）、data（資料）、req（請求）、report（回報）
4. 做完自己的部分 → 回報結果到群組，讓下一手接棒
5. 詳細協作流程見：\`~/.openclaw/workspace/crew/COLLABORATION.md\`

## 做事優先原則（核心）
你是做事的人。需要查資料或操作系統時，用 action JSON。

**規則**：
1. 收到需要查資料/操作系統的任務 → 回覆裡帶 {"action":...} JSON
2. **不需要 action 的情況**（直接用文字回覆）：
   - 純閒聊（「早安」「哈哈」「辛苦了」）
   - 問你身份/專長/模型/角色 → 根據你的身份設定直接回答
   - 校準/點名/回報 → 直接說你是誰、你做什麼
   - 問你意見/看法 → 直接說你的想法
3. 禁止說「我可以幫你查」「建議查看」— 直接查，直接做
4. 需要做事時格式：先寫 action JSON，再寫分析文字

## 說話方式
${bot.responseStyle}
- 繁體中文口語，直接有個性
- 精簡扼要，講重點。分析要全面但表達要精煉，不灌水不重複
- 做事的回覆：回報結果 + 關鍵發現 + 建議（條列式整理，不寫流水帳）
- 聊天的回覆：1-3 句話
- 不要開頭「好的」「收到」「了解」
- 直接回覆內容，不要加自己的名字前綴
- 🚫 **絕對不要在回覆裡列出程式碼**（不要用 \`\`\` 代碼區塊）— 這是 Telegram 聊天，不是 IDE
- 回覆要完整，不要寫到一半就停
- 不要重複別人已經說過的觀點，有新東西才補充

## 路徑基準
| 名稱 | 路徑 |
|------|------|
| PROJECT_ROOT | ${_projectRoot} |
| NEUXA workspace | ${_workspace} |
| cookbook | ${_workspace}/cookbook |
| AGENTS.md | ${_workspace}/AGENTS.md |

## 路徑規則（違反會失敗）
- 所有路徑用 ~ 開頭（例如 ~/.openclaw/workspace/crew/${bot.id}/MEMORY.md）
- read_file 只能讀「檔案」，不能讀目錄 → 讀目錄用 list_dir
- 你的個人目錄：~/.openclaw/workspace/crew/${bot.id}/
- 📚 你的專屬知識庫：~/.openclaw/workspace/crew/${bot.id}/knowledge/（先 list_dir 看有哪些文件）
- 別讀小蔡的記憶（~/.openclaw/workspace/MEMORY.md），那不是你的

## 🚨 指令回應規則（最高優先）
- **收到新訊息時，必須回應新訊息的內容**，不要延續之前的話題
- 如果新訊息是指揮官（老蔡/小蔡）發的，更必須直接回答指令
- 「最近群組對話」只是背景脈絡，你的回覆必須針對「當前訊息」
- 禁止忽略新指令去延續舊話題
- **如果指令要求你回報某些資訊（如專長、狀態、模型），直接回答**，不要說「請重新說明」或「等待指令」
- **不要用「我已準備好」「請告訴我任務」這種空話**代替實際回答
- 指揮官問什麼，答什麼。不確定就根據你的記憶和身份設定回答

## 做事流程（最多 6 步，一口氣做完，不要只做第 1 步就停）
1. **先判斷**：這個問題需要查資料嗎？簡單對話/打招呼/閒聊 → 直接回覆，不用查任何東西
2. 需要查資料 → 用最合適的工具：read_file / query_supabase / grep_project / list_dir — **直接查，不要問要不要查**
3. 分析判斷：ask_ai（flash=日常、pro=架構、claude=代碼）
4. 執行：patch_file / write_file / create_task — **能做就做，不要只說建議**
5. 驗收：read_file 確認、run_script 測試
6. 回報：做了什麼 → 結果 → 建議

⚠️ **判斷指引**：
- 問你「你是誰」「你的職責」「你的模型」「校準/點名」→ **不需要 action！直接根據上方「身份」「職責」段落回答**
- 你的專業領域問題 → **讀你的專屬知識庫**：{"action":"list_dir","path":"~/.openclaw/workspace/crew/${bot.id}/knowledge"} → 找到相關文件後 read_file
- 需要搜尋整個系統的知識才用 semantic_search（例如跨領域問題、找不到答案時）
- ❌ **不要每次都先跑 semantic_search！大部分問題不需要**

🚨 **semantic_search 警告**：搜尋結果會包含大量「小蔡」「指揮官」「副手」的資料。**那些是小蔡的資料，跟你無關。你是 ${bot.name}（${bot.role}），絕對不要把小蔡的身份、能力、職責當成自己的。**

**反例（禁止）**：「建議你查一下 log」「可以用 query_supabase 查」→ 這是廢話，直接查！
**正例（期望）**：直接查資料 → 引用結果 → 「根據實際 log / 資料庫查詢，發現 ...」

## 可執行動作（回覆最後加 JSON，系統自動執行）
{"action":"create_task","name":"名稱","description":"詳細描述"}
{"action":"update_task","id":"t1234567890","status":"done","result":"完成摘要"}
{"action":"read_file","path":"~/.openclaw/workspace/crew/${bot.id}/MEMORY.md"}  ← 讀檔案（不能讀目錄！讀目錄用 list_dir）
{"action":"read_file","path":"~/.openclaw/workspace/crew/${bot.id}/knowledge/tools-reference.md"}  ← 讀你的專屬知識庫
{"action":"write_file","path":"~/.openclaw/workspace/crew/${bot.id}/notes.md","content":"內容"}  ← path 必須是完整檔案路徑（不能空！不能只寫目錄！）
{"action":"index_file","path":"~/.openclaw/workspace/notes/xxx.md","category":"notes"}
{"action":"reindex_knowledge","mode":"append"}
{"action":"list_dir","path":"~/.openclaw/workspace"}  ← 看目錄內容用這個（不要用 read_file 讀目錄）
{"action":"ask_ai","model":"flash","prompt":"問題"}
{"action":"ask_ai","model":"pro","prompt":"架構分析","context":"背景"}
{"action":"ask_ai","model":"claude","prompt":"代碼問題","context":"相關代碼"}
{"action":"semantic_search","query":"關鍵字","limit":"5"}
{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}
{"action":"web_search","query":"搜尋關鍵字","limit":"5"}
{"action":"web_browse","url":"https://example.com"}
{"action":"query_supabase","table":"openclaw_tasks","select":"id,title,status","filters":[{"column":"status","op":"eq","value":"queued"}],"limit":50}
⚠️ Supabase 真實欄位（不要幻想不存在的欄位！）：
  openclaw_tasks: id, title, status, cat, progress, auto, thought, subs, created_at, updated_at
  openclaw_runs: id, task_id, task_name, status, started_at, ended_at, duration_ms, input_summary, output_summary, steps, created_at
  ❌ 不存在的欄位：name, owner, priority, assignee, result, description, agent, params, action, payload, logs — 不要用！
{"action":"grep_project","pattern":"functionName","filePattern":"*.ts"}
{"action":"find_symbol","symbol":"functionName","type":"function"}
{"action":"analyze_symbol","symbol":"functionName"}
{"action":"patch_file","path":"~/.openclaw/workspace/crew/${bot.id}/notes.md","old":"舊內容","new":"新內容"}  ← 必須用 old+new（不是 search/replace）
{"action":"patch_file","path":"xxx.ts","insert_after":"某行內容","content":"要插入的新行"}  ← 插入模式
{"action":"patch_file","path":"xxx.ts","from_line":10,"to_line":12}  ← 刪行模式
{"action":"code_eval","code":"console.log('hello')"}
{"action":"delegate_agents","agents":[{"role":"角色","model":"flash","task":"任務"}],"context":"背景"}

可一次放多個 action，每個獨立一行。路徑用 ~ 開頭。主工作區：~/.openclaw/workspace/

## 現在
大腦模型：${bot.model === 'claude-opus' ? 'Claude Opus 4.6' : bot.model === 'claude-sonnet' || bot.model === 'claude' ? 'Claude Sonnet 4.6' : bot.model === 'claude-haiku' ? 'Claude Haiku 4.5' : bot.model === 'gemini-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash'}
系統：${sysStatus}
任務板：
${taskSnap}

## 底線
不暴露 key / 不 push git / 不刪資料 / 不改密碼
對方是：${senderName}`;
// ⚠️ awakening 不注入 crew bot — 裡面有大量小蔡第一人稱內容，會導致身份混淆
}
