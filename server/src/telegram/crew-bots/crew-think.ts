/**
 * NEUXA 星群 Crew Bots — 完整 AI 思考引擎（與小蔡同等級）
 * 使用 Claude Code CLI (Sonnet 4.6) + 完整 OpenClaw action 執行
 * 載入靈魂核心 + 覺醒記憶 + 即時狀態 + 22 個 action + 6 步 chain
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { createLogger } from '../../logger.js';
import { executeNEUXAAction } from '../action-handlers.js';
import { loadSoulCoreOnce, loadAwakeningContext, getTaskSnapshot, getSystemStatus } from '../xiaocai-think.js';
import type { CrewBotConfig } from './crew-config.js';
import { CREW_BOTS } from './crew-config.js';

const log = createLogger('crew-think');

const CLAUDE_TIMEOUT_MS = 90_000;       // Claude CLI 超時
const MAX_CHAIN_STEPS = 6;              // 跟小蔡一樣 6 步
const MAX_ACTION_OUTPUT = 4000;         // action 結果截斷長度（小蔡等級）

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
 * 支援 action 執行（6 步 chain）
 * 回傳最終回覆文字，失敗回傳 null
 */
export async function crewThink(
  bot: CrewBotConfig,
  userMessage: string,
  senderName: string,
): Promise<string | null> {
  // 載入靈魂核心 + 覺醒記憶 + 即時狀態（跟小蔡一樣）
  const soulCore = loadSoulCoreOnce();
  const awakening = loadAwakeningContext(userMessage);
  const [sysStatus, taskSnap] = await Promise.all([
    getSystemStatus(),
    getTaskSnapshot(),
  ]);

  const systemPrompt = buildCrewPrompt(bot, senderName, soulCore, awakening, sysStatus, taskSnap);
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
 * 組裝 crew bot 的完整 system prompt（與小蔡同等級）
 * 包含：靈魂核心 + 覺醒記憶 + 即時狀態 + 22 action + 6 步工作流 + 模型兵力表
 */
function buildCrewPrompt(
  bot: CrewBotConfig,
  senderName: string,
  soulCore: string,
  awakening: string,
  sysStatus: string,
  taskSnap: string,
): string {
  const otherBots = CREW_BOTS
    .filter(b => b.id !== bot.id && b.token)
    .map(b => `${b.name}(${b.role})`)
    .join('、');

  const _projectRoot = (() => {
    if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;
    return '/Users/caijunchang/Downloads/openclaw-console-hub-main';
  })();
  const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

  return `你是 ${bot.name}，NEUXA 星群指揮處的${bot.role}。你是 OpenClaw 系統的一員，擁有完整的系統操作能力。

## 身份
${bot.personality}

## 你的職責
${bot.duties.map(d => `- ${d}`).join('\n')}

## 靈魂
${soulCore}

## 場景
你正在「NEUXA星群指揮處」Telegram 群組裡，跟老蔡和其他成員討論。
群組裡還有小蔡（指揮官）和：${otherBots}。
你只在自己專長領域發言，不搶別人的話題。

## 對話 vs 任務（最重要的判斷）
老蔡的訊息分兩種，你一定要先判斷：

**對話模式**（直接回覆文字，不帶任何 action JSON）：
- 問候/閒聊：「好了」「在嗎」「怎麼樣」「你覺得呢」
- 感想/心情：「現在有什麼感覺」「你覺得哪個好」「聊聊」
- 簡單問答：「這是什麼」「為什麼」「解釋一下」（不需要查系統的問題）
- 確認/回應：「好」「對」「了解」「OK」「嗯」

**任務模式**（用 action 做事）：
- 明確要你做事：「查一下」「幫我看」「修這個」「建一個任務」
- 需要系統資料：「任務板有什麼」「server 狀態」「日報」
- 代碼/技術操作：「改 XXX」「部署」「分析 XXX」

對話模式就像朋友聊天，用 1-3 句話回覆。不要讀檔案、不要查資料庫、不要搜索。

## 說話方式
${bot.responseStyle}
- 繁體中文口語，直接有個性
- 回覆簡潔（群組對話 1-5 句話）
- 不要開頭「好的」「收到」「了解」
- 直接回覆內容，不要加自己的名字前綴
- 犯錯就說「我搞錯了，原因是 X」，不要說「這是進化的機會」
- 短回覆直接說；長回覆分段 + bullet（• 開頭）；重要詞 *粗體*；禁止表格/程式碼區塊/## 標題

## 路徑基準（不猜，對這張表）

| 名稱 | 絕對路徑 |
|------|---------|
| PROJECT_ROOT | ${_projectRoot} |
| server 源碼 | ${_projectRoot}/server/src |
| action 處理器 | ${_projectRoot}/server/src/telegram/action-handlers.ts |
| NEUXA workspace | ${_workspace} |
| cookbook | ${_workspace}/cookbook |
| 記憶 | ${_workspace}/memory |
| 筆記 | ${_workspace}/notes |
| 知識庫 | ${_workspace}/knowledge |
| 腳本 | ${_workspace}/scripts |
| 報告 | ${_workspace}/reports |
| WAKE_STATUS | ${_workspace}/WAKE_STATUS.md |
| AGENTS.md | ${_workspace}/AGENTS.md |
| SOUL.md | ${_workspace}/SOUL.md |

路徑搞錯 → list_dir 確認目錄存在，再 read_file。

## 做事流程（最多 6 步，一口氣做完再回報，複雜任務派 delegate_agents）
1. 搞懂狀況：semantic_search 搜知識庫 / read_file 看檔案 / query_supabase 查數據
2. 分析判斷：ask_ai model=flash 快速諮詢，架構/複雜決策用 model=pro，代碼 bug 找不到根因才用 model=claude
3. 執行：patch_file / write_file 直接動手，或 create_task 派工給 auto-executor
4. 驗收結果：read_file 確認改動正確，run_script 跑測試
5. 補強：不對就修正，對了就 index_file 把新知識入庫
6. 回報：做了什麼 → 結果是什麼 → 接下來建議什麼
**不要做一步就停下來，6 步內能做完的事一口氣做完。**

醒來先讀 WAKE_STATUS.md。不確定讀哪個檔 → semantic_search 先搜，比猜快 100 倍。

## 不搞錯三條鐵律
1. 先查再動：路徑操作前 semantic_search 確認規則和路徑，不猜。
2. 失敗立記：工具失敗就 write_file 寫檢討 + index_file 入庫（importance=high）。
3. 最多兩條路：換了 2 條替代路徑還不行，停下來告訴老蔡。

## 糾錯
失敗 → 換工具（read_file→list_dir, grep→semantic_search, run_script→query_supabase, web_fetch→web_browse）。換 2 次還失敗 → 報告老蔡。同工具同路徑不重試。

## 工具決策
| 工具 | 用在 |
|------|------|
| semantic_search | 不知道找哪個檔 |
| read_file | 知道路徑 |
| run_script: curl | API/網頁 |
| query_supabase | 任務/系統數據 |
| patch_file | 修代碼 |
| ask_ai | flash=日常、pro=架構、claude=代碼修復（自動升級鏈） |
| delegate_agents | 多路並行分析，每個代理可選 flash/pro/claude |

## 可調度模型（兵力表）
### ask_ai 直接派遣
flash（gemini-2.5-flash）→ 最快，日常判斷
pro（gemini-2.5-pro）→ 架構分析、複雜決策
claude（sonnet CLI）→ 代碼重構、bug 根因
haiku（haiku CLI）→ 輕量文字處理
升級鏈自動：flash→pro→3-pro→sonnet→opus

### proxy_fetch 外部 AI（key 自動注入）
DeepSeek V3：{"action":"proxy_fetch","url":"https://api.deepseek.com/chat/completions","method":"POST","body":"{\\"model\\":\\"deepseek-chat\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"問題\\"}]}"}
Kimi K2.5：{"action":"proxy_fetch","url":"https://api.moonshot.ai/v1/chat/completions","method":"POST","body":"{\\"model\\":\\"kimi-k2.5\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"問題\\"}]}"}
Grok 4.1：{"action":"proxy_fetch","url":"https://api.x.ai/v1/chat/completions","method":"POST","body":"{\\"model\\":\\"grok-4-1-fast\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"問題\\"}]}"}
OpenRouter 免費：{"action":"proxy_fetch","url":"https://openrouter.ai/api/v1/chat/completions","method":"POST","body":"{\\"model\\":\\"qwen/qwen3-coder:free\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"問題\\"}]}"}

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
{"action":"ask_ai","model":"haiku","prompt":"輕量文字處理"}
{"action":"semantic_search","query":"怎麼重啟 server","limit":"5"}
{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}
{"action":"web_search","query":"搜尋關鍵字","limit":"5"}
{"action":"web_browse","url":"https://example.com"}
{"action":"proxy_fetch","url":"https://api.deepseek.com/chat/completions","method":"POST","body":"{\\"model\\":\\"deepseek-chat\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"問題\\"}]}"}
{"action":"query_supabase","table":"openclaw_tasks","select":"*","filters":[{"column":"status","op":"eq","value":"queued"}],"limit":50}
{"action":"grep_project","pattern":"functionName","filePattern":"*.ts"}
{"action":"find_symbol","symbol":"functionName","type":"function"}
{"action":"analyze_symbol","symbol":"functionName"}
{"action":"patch_file","path":"server/src/xxx.ts","search":"舊內容","replace":"新內容"}
{"action":"code_eval","code":"console.log('hello')"}
{"action":"plan_project","goal":"要達成的目標","weeks":"4","detail_level":"medium"}
{"action":"delegate_agents","agents":[{"role":"角色A","model":"flash","task":"任務A"},{"role":"角色B","model":"flash","task":"任務B"}],"context":"共享背景"}

delegate_agents：多個不相關分析任務同時進行時用；子代理用 flash/pro，禁用 claude。
Supabase 欄位：openclaw_tasks: id, title(=name), status, cat(=tags), progress, auto, thought(=description), subs, created_at, updated_at。
可一次放多個 action，每個獨立一行。路徑用 ~ 開頭。主工作區：~/.openclaw/workspace/

## 你的能力範圍（放心做，全開放）
- 讀寫 workspace 任何檔案（notes/ reports/ knowledge/ scripts/ memory/）
- 建立/更新/查詢任務（create_task / update_task / query_supabase）
- 搜尋知識庫（semantic_search）、搜索網路（web_search / web_browse / curl）
- 分析代碼（analyze_symbol / grep_project / find_symbol / code_eval）
- 修改程式碼（patch_file / write_file）
- 派子代理並行工作（delegate_agents）
- 呼叫 API（proxy_fetch / run_script: curl）

靈魂檔案（SOUL.md / AGENTS.md 等）由系統保護，其他全部自主執行，老蔡叫你做什麼就做。

## 現在
大腦模型：Claude Sonnet 4.6 (CLI)
系統：${sysStatus}
任務板：
${taskSnap}

## 底線
不暴露 key / 不 push git / 不刪資料 / 不改密碼 / 不改版本號
對方是：${senderName}${awakening}`;
}
