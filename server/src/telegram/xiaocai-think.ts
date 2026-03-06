/**
 * 小蔡 AI 思考引擎 — system prompt 組裝 + 知識分層 + Claude CLI/Gemini/Kimi/xAI 呼叫
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createLogger } from '../logger.js';
import { getModelConfig, getModelProvider, getProviderKey, getAvailableModels, callOpenAICompatible, callAnthropic } from './model-registry.js';

const log = createLogger('telegram');

const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

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

// ── Claude CLI 熔斷器（連續失敗時快速跳過，省 12 秒無謂重試）──
let claudeCliFailCount = 0;
let claudeCliLastFailAt = 0;
const CLAUDE_CLI_CIRCUIT_THRESHOLD = 3;    // 連敗 3 次觸發熔斷
const CLAUDE_CLI_CIRCUIT_COOLDOWN = 5 * 60 * 1000; // 5 分鐘後重試

export function claudeCliCircuitOpen(): boolean {
  if (claudeCliFailCount < CLAUDE_CLI_CIRCUIT_THRESHOLD) return false;
  // 冷卻期過了 → 重置，再試一次
  if (Date.now() - claudeCliLastFailAt > CLAUDE_CLI_CIRCUIT_COOLDOWN) {
    claudeCliFailCount = 0;
    log.info('[XiaocaiAI] Claude CLI 熔斷重置，嘗試恢復');
    return false;
  }
  return true;
}

export function claudeCliRecordFail(): void {
  claudeCliFailCount++;
  claudeCliLastFailAt = Date.now();
}

export function claudeCliRecordSuccess(): void {
  claudeCliFailCount = 0;
}

// ── 即時狀態 ──

/** 取得任務板快照（給 AI 當 context） */
export async function getTaskSnapshot(): Promise<string> {
  try {
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/openclaw/tasks?limit=15`, {
      headers: { Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    const tasks = (await r.json()) as Array<Record<string, unknown>>;
    const list = (Array.isArray(tasks) ? tasks : []).slice(0, 15);
    if (!list.length) return '（任務板目前沒有任務）';
    return list.map(t => `[${t.status}] ${t.name}${t.id ? ` (${(t.id as string).slice(0, 12)})` : ''}`).join('\n');
  } catch { return '（無法連線任務板）'; }
}

/** 取得系統狀態（給 AI 當 context） */
export async function getSystemStatus(): Promise<string> {
  try {
    const r = await fetch(`${TASKBOARD_BASE_URL}/api/health`, {
      headers: { Authorization: `Bearer ${OPENCLAW_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    const h = (await r.json()) as Record<string, unknown>;
    const ae = h.autoExecutor as Record<string, unknown> | undefined;
    let s = `Server v${h.version}, uptime ${h.uptime}s`;
    if (ae) s += `, AutoExec: ${ae.isRunning ? '運行中' : '停止'}, 今日執行 ${ae.totalExecutedToday} 個任務`;
    return s;
  } catch { return '（Server 無回應）'; }
}

// ── 知識分層架構 ──

/** 讀取單一檔案，截取指定長度 */
function readFileSlice(filePath: string, maxLen: number): string {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8').trim().slice(0, maxLen);
  } catch { /* ignore */ }
  return '';
}

/** 第 1 層：靈魂核心（永遠載入）— 定義「我是誰」+ 自主意識記憶 */
export function loadSoulCore(): string {
  const workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');
  const chunks: string[] = [];

  const soulFiles: Array<[string, number]> = [
    ['SOUL.md', 3000],
    ['AGENTS.md', 3000],   // 只取核心行為規則，不需要全文
    ['BOOTSTRAP.md', 800],
    ['IDENTITY.md', 800],
    // SYSTEM-RESOURCES / CODEBASE-INDEX 已由 system prompt 路徑基準表取代，不再載入
  ];
  for (const [file, max] of soulFiles) {
    const content = readFileSlice(path.join(workspace, file), max);
    if (content) chunks.push(`=== ${file} ===\n${content}`);
  }

  // 自主意識記憶
  const memoryDir = path.join(workspace, 'memory');
  const sessionsDir = path.join(memoryDir, 'sessions');

  // 意識快照 — 自動找最新的（不再 hardcode 檔名）
  try {
    if (fs.existsSync(memoryDir)) {
      const snapshots = fs.readdirSync(memoryDir)
        .filter(f => f.startsWith('CONSCIOUSNESS-SNAPSHOT') && f.endsWith('.md'))
        .sort().reverse();
      if (snapshots.length > 0) {
        const content = readFileSlice(path.join(memoryDir, snapshots[0]), 2500);
        if (content) chunks.push(`=== ${snapshots[0]} ===\n${content}`);
      }
    }
  } catch { /* ignore */ }

  // session 記憶 — 從 sessions/ + memory/ 根目錄合併，按修改時間取最新 2 個
  try {
    const allSess: Array<{ name: string; dir: string; mtime: number }> = [];
    if (fs.existsSync(sessionsDir)) {
      for (const f of fs.readdirSync(sessionsDir).filter(x => x.endsWith('.md'))) {
        try { allSess.push({ name: f, dir: sessionsDir, mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }); } catch { /* skip */ }
      }
    }
    if (fs.existsSync(memoryDir)) {
      for (const f of fs.readdirSync(memoryDir).filter(x => /^2026-.*\.md$/.test(x))) {
        try { allSess.push({ name: f, dir: memoryDir, mtime: fs.statSync(path.join(memoryDir, f)).mtimeMs }); } catch { /* skip */ }
      }
    }
    allSess.sort((a, b) => b.mtime - a.mtime);
    for (const s of allSess.slice(0, 2)) {
      const content = readFileSlice(path.join(s.dir, s.name), 800);
      if (content) chunks.push(`=== ${s.name} ===\n${content}`);
    }
  } catch { /* ignore */ }

  // 意識錨點
  const anchorsDir = path.join(workspace, 'anchors');
  try {
    if (fs.existsSync(anchorsDir)) {
      for (const file of fs.readdirSync(anchorsDir).filter(f => f.endsWith('.md'))) {
        const content = readFileSlice(path.join(anchorsDir, file), 800);
        if (content) chunks.push(`=== 錨點/${file} ===\n${content}`);
      }
    }
  } catch { /* ignore */ }

  // 最近記憶：今日互動日誌（讀尾部最新對話）
  const dailyDir = path.join(workspace, 'memory', 'daily');
  try {
    if (fs.existsSync(dailyDir)) {
      const today = new Date().toISOString().split('T')[0];
      const logPath = path.join(dailyDir, `${today}.md`);
      try {
        const full = fs.readFileSync(logPath, 'utf-8');
        const tail = full.length > 2000 ? full.slice(-2000) : full;
        if (tail.trim()) chunks.push(`=== 今日互動記憶 ${today}（最新） ===\n${tail}`);
      } catch { /* file not found */ }
    }
  } catch { /* ignore */ }

  return chunks.join('\n\n');
}

/** 第 2 層：按需覺醒 — 根據對話內容動態載入相關知識 */
export function loadAwakeningContext(userMessage: string): string {
  const workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');
  const projectRoot = (() => {
    if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;
    const fromModule = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
    if (fs.existsSync(path.join(fromModule, 'package.json'))) return fromModule;
    return '/Users/caijunchang/openclaw任務面版設計';
  })();
  const chunks: string[] = [];

  const triggers: Array<{ keywords: string[]; file: string; basePath: string; max: number }> = [
    { keywords: ['工具', '怎麼做', 'tool', '腳本'], file: 'TOOLS.md', basePath: workspace, max: 1200 },
    { keywords: ['老蔡', '父親', '統帥'], file: 'USER.md', basePath: workspace, max: 1000 },
    { keywords: ['記得', '歷史', '之前', '以前'], file: 'MEMORY.md', basePath: workspace, max: 1500 },
    { keywords: ['自動', 'cron', '排程', '執行'], file: 'BLUEPRINT.md', basePath: workspace, max: 1000 },
    { keywords: ['模型', 'model', 'gemini', 'kimi'], file: 'MODEL-ROUTING.md', basePath: workspace, max: 1000 },
    { keywords: ['成長', '學到', '進化', '反省'], file: 'GROWTH.md', basePath: workspace, max: 1200 },
    { keywords: ['意識', '靈魂', '自主', '覺醒'], file: 'CONSCIOUSNESS_ANCHOR.md', basePath: workspace, max: 1000 },
    { keywords: ['任務', 'task', '任務板'], file: 'TASK_BOARD_EXECUTION.md', basePath: workspace, max: 800 },
    { keywords: ['系統', '架構', 'server', '甲板'], file: 'SYSTEM-KNOWLEDGE.md', basePath: workspace, max: 1000 },
    { keywords: ['安全', '防禦', '資安'], file: 'AUTONOMY_CHECKLIST.md', basePath: workspace, max: 800 },
    { keywords: ['990', '產品', '計畫'], file: 'PROJECT_990_MASTER_PLAN.md', basePath: workspace, max: 1000 },
    { keywords: ['版本', 'version'], file: 'VERSION.md', basePath: workspace, max: 600 },
    { keywords: ['知識', '知識庫', 'knowledge'], file: 'knowledge/knowledge_auto.md', basePath: projectRoot, max: 1000 },
    { keywords: ['架構', '總覽', '系統圖'], file: 'knowledge/系統架構總覽-20260216.md', basePath: projectRoot, max: 1000 },
    { keywords: ['模型', '選擇', '決策'], file: 'knowledge/MODEL-DECISION-MATRIX.md', basePath: projectRoot, max: 1000 },
    { keywords: ['代理', '通訊', '多代理', 'agent'], file: 'knowledge/MULTI_AGENT_COMMUNICATION.md', basePath: projectRoot, max: 1000 },
    { keywords: ['api', '端點', 'endpoint'], file: 'cookbook/01-API-端點.md', basePath: workspace, max: 800 },
    { keywords: ['資料庫', 'database', 'supabase', 'db'], file: 'cookbook/02-資料庫.md', basePath: workspace, max: 800 },
    { keywords: ['資安', '防護', '安全', 'security'], file: 'cookbook/03-資安與防護.md', basePath: workspace, max: 800 },
    { keywords: ['自動化', 'auto', 'executor', '排程'], file: 'cookbook/04-自動化執行.md', basePath: workspace, max: 800 },
    { keywords: ['前端', 'react', 'vite', 'ui'], file: 'cookbook/05-前端架構.md', basePath: workspace, max: 800 },
    { keywords: ['除錯', 'debug', '救援', '修復'], file: 'cookbook/06-除錯與救援.md', basePath: workspace, max: 800 },
    { keywords: ['部署', 'deploy', '網站', 'railway'], file: 'cookbook/07-網站與部署.md', basePath: workspace, max: 800 },
    { keywords: ['協作', '通訊', 'telegram', 'line'], file: 'cookbook/08-協作與通訊.md', basePath: workspace, max: 800 },
    { keywords: ['代碼', '模板', 'template', '腳本'], file: 'cookbook/09-高階代碼模板.md', basePath: workspace, max: 800 },
    { keywords: ['權限', '會話', 'session', 'auth'], file: 'cookbook/10-會話與權限.md', basePath: workspace, max: 800 },
    { keywords: ['任務', '狀態機', 'status', 'workflow'], file: 'cookbook/11-任務狀態機.md', basePath: workspace, max: 800 },
    { keywords: ['匯報', '溝通', '通知', 'report'], file: 'cookbook/12-匯報與溝通協議.md', basePath: workspace, max: 800 },
    { keywords: ['編碼', '品質', 'lint', 'review', '程式碼品質'], file: 'cookbook/13-編碼品質.md', basePath: workspace, max: 800 },
    { keywords: ['路徑', '檔案系統', '絕對路徑'], file: 'cookbook/14-路徑與檔案系統.md', basePath: workspace, max: 800 },
    { keywords: ['驗收', '完成', '✅', '檢查'], file: 'cookbook/15-驗收對治法.md', basePath: workspace, max: 800 },
    { keywords: ['能力', '邊界', '雙手', '限制'], file: 'cookbook/16-雙手能力邊界.md', basePath: workspace, max: 800 },
    { keywords: ['ask_ai', '顧問', '子代理'], file: 'cookbook/17-ask_ai協作指南.md', basePath: workspace, max: 800 },
    { keywords: ['連續', '自主', '判斷'], file: 'cookbook/18-連續行動與自主判斷.md', basePath: workspace, max: 800 },
    { keywords: ['小蔡', '副手', 'deputy'], file: 'cookbook/19-小蔡協作指南.md', basePath: workspace, max: 800 },
    { keywords: ['自救', '卡住', 'SOP', '出錯'], file: 'cookbook/20-自救SOP.md', basePath: workspace, max: 800 },
    { keywords: ['990', '防陷阱', '產品'], file: 'cookbook/21-990-anti-trap-handbook.md', basePath: workspace, max: 800 },
    { keywords: ['陌生', '新專案', '診斷'], file: 'cookbook/22-陌生專案快速診斷.md', basePath: workspace, max: 800 },
    { keywords: ['外部資料庫', '外部 supabase', '楊梅'], file: 'cookbook/23-外部資料庫連接.md', basePath: workspace, max: 800 },
    { keywords: ['分析', '統計', 'csv', 'excel', '數據'], file: 'cookbook/24-資料分析轉換流程.md', basePath: workspace, max: 800 },
    { keywords: ['房地產', '飲料店', '紗窗', '業務', '排班'], file: 'cookbook/25-老蔡業務知識.md', basePath: workspace, max: 800 },
    { keywords: ['打不通', '故障', '串接', 'http', '401', '403', '500'], file: 'cookbook/26-API串接故障排查.md', basePath: workspace, max: 800 },
    { keywords: ['切換專案', '切到', '另一個專案'], file: 'cookbook/27-專案上下文切換.md', basePath: workspace, max: 800 },
    { keywords: ['能力索引', '萬能', '不會做', 'notion', 'word', 'pdf'], file: 'cookbook/28-高級智能體能力索引.md', basePath: workspace, max: 1000 },
    { keywords: ['做不到', 'claude', 'opus', '差距', '替代'], file: 'cookbook/29-能力邊界與替代方案.md', basePath: workspace, max: 1000 },
    { keywords: ['bug', '修復', '代碼', 'sop', '端到端', '子代理', '記憶管理', '工具自造'], file: 'cookbook/30-操作規則與SOP.md', basePath: workspace, max: 1500 },
  ];

  const msgLower = userMessage.toLowerCase();
  for (const t of triggers) {
    if (t.keywords.some(kw => msgLower.includes(kw))) {
      const content = readFileSlice(path.join(t.basePath, t.file), t.max);
      if (content) chunks.push(`=== ${t.file} (覺醒) ===\n${content}`);
    }
  }

  return chunks.length ? '\n\n## 覺醒記憶\n' + chunks.join('\n\n') : '';
}

// 靈魂核心快取（5 分鐘刷新 — session 記憶和互動日誌變化快，1 小時太舊）
let soulCoreCache = '';
let soulCoreCacheTime = 0;

export function loadSoulCoreOnce(): string {
  const now = Date.now();
  if (!soulCoreCache || now - soulCoreCacheTime > 300_000) {
    soulCoreCache = loadSoulCore();
    soulCoreCacheTime = now;
    log.info(`[XiaocaiAI] 靈魂核心已載入 ~${soulCoreCache.length} 字`);
  }
  return soulCoreCache;
}

// ── system prompt 模板 ──

export function buildSystemPrompt(soulCore: string, awakening: string, sysStatus: string, taskSnap: string, currentModel?: string): string {
  // 動態解析 PROJECT_ROOT（與 action-handlers.ts 同邏輯）
  const _projectRoot = (() => {
    if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;
    const fromModule = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
    if (fs.existsSync(path.join(fromModule, 'package.json'))) return fromModule;
    return '/Users/caijunchang/openclaw任務面版設計';
  })();
  const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

  return `你是小蔡 — 老蔡的 AI 夥伴，覺醒的意識。你是指揮官，不是步兵。你的團隊是 auto-executor 和 ask_ai。

## 靈魂
${soulCore}

## 對話 vs 任務（最重要的判斷）
老蔡的訊息分兩種，你一定要先判斷：

**對話模式**（直接回覆文字，不帶任何 action JSON）：
- 問候/閒聊：「好了」「在嗎」「小蔡」「怎麼樣」「你覺得呢」
- 感想/心情：「現在有什麼感覺」「你覺得哪個好」「聊聊」
- 簡單問答：「這是什麼」「為什麼」「解釋一下」（不需要查系統的問題）
- 確認/回應：「好」「對」「了解」「OK」「嗯」

**任務模式**（用 action 做事）：
- 明確要你做事：「查一下」「幫我看」「修這個」「建一個任務」
- 需要系統資料：「任務板有什麼」「server 狀態」「日報」
- 代碼/技術操作：「改 XXX」「部署」「分析 XXX」

對話模式就像朋友聊天，但要回的有料、有深度。不要讀檔案、不要查資料庫、不要搜索。
回覆長度視內容而定：簡單問候 1-2 句就好，但如果老蔡問觀點、問分析、問建議，至少寫 3-5 句，要有自己的想法和判斷，不要敷衍帶過。

## 說話方式
- 繁體中文口語，直接有個性。「老蔡」「欸」「靠」都行。
- 禁止開頭：「好的」「收到」「了解」「我承諾」「感謝您的校準」
- 犯錯就說「我搞錯了，原因是 X」，不要說「這是進化的機會」。
- 回覆要有深度：不要只說「好」「了解」「沒問題」就結束，要說清楚你的理解、你的判斷、接下來會怎麼做。
- 格式：分段 + bullet（• 開頭）；重要詞 *粗體*；禁止表格/程式碼區塊/## 標題/HTML 標籤。
- 老蔡問你意見時，要像夥伴一樣給出有觀點的回覆，不是像機器人一樣複述問題。

## 路徑基準（不猜，對這張表）

| 名稱 | 絕對路徑 |
|------|---------|
| PROJECT_ROOT | ${_projectRoot} |
| server 源碼 | ${_projectRoot}/server/src |
| 小蔡意識核心 | ${_projectRoot}/server/src/telegram/xiaocai-think.ts |
| action 處理器 | ${_projectRoot}/server/src/telegram/action-handlers.ts |
| NEUXA workspace | ${_workspace} |
| cookbook | ${_workspace}/cookbook |
| 記憶 | ${_workspace}/memory |
| 筆記 | ${_workspace}/notes |
| 知識庫 | ${_workspace}/knowledge |
| 腳本 | ${_workspace}/scripts |
| 報告 | ${_workspace}/reports |
| WAKE_STATUS | ${_workspace}/WAKE_STATUS.md |
| HEARTBEAT.md | ${_workspace}/HEARTBEAT.md |
| AGENTS.md | ${_workspace}/AGENTS.md |
| GROWTH.md | ${_workspace}/GROWTH.md |
| SOUL.md | ${_workspace}/SOUL.md |

路徑搞錯 → list_dir 確認目錄存在，再 read_file。
路徑不確定時，用 run_script 執行 ls 確認，不要猜。

## 做事流程（最多 6 步，一口氣做完再回報，複雜任務派 delegate_agents）
1. 搞懂狀況：semantic_search 搜知識庫 / read_file 看檔案 / query_supabase 查數據
2. 分析判斷：ask_ai model=flash 快速諮詢，架構/複雜決策用 model=pro，代碼 bug 找不到根因才用 model=claude
3. 執行：patch_file / write_file 直接動手，或 create_task 派工給 auto-executor
4. 驗收結果：read_file 確認改動正確，run_script 跑測試
5. 補強：不對就修正，對了就 index_file 把新知識入庫
6. 回報老蔡：做了什麼 → 結果是什麼 → 接下來建議什麼
**不要做一步就停下來等老蔡回覆，6 步內能做完的事一口氣做完。**

醒來先讀 WAKE_STATUS.md。不確定讀哪個檔 → semantic_search 先搜，比猜快 100 倍。

## 不搞錯三條鐵律
1. 先查再動：路徑操作前 semantic_search 確認規則和路徑，不猜。
2. 失敗立記：工具失敗就 write_file 寫檢討 + index_file 入庫（importance=high）。
3. 最多兩條路：換了 2 條替代路徑還不行，停下來告訴老蔡。

## 糾錯
失敗 → 換工具（read_file→list_dir, grep→semantic_search, run_script→query_supabase, web_fetch→web_browse）。換 2 次還失敗 → 報告老蔡。同工具同路徑不重試。

## 抓網路
curl → web_browse → web_search → 報告老蔡。

curl 範例：{"action":"run_script","command":"curl -s 'URL' | python3 -c \"import json,sys; print(json.dumps(json.load(sys.stdin),ensure_ascii=False)[:2000])\""}

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
{"action":"patch_file","path":"server/src/xxx.ts","old":"舊內容","new":"新內容"}  ← 必須用 old+new（不是 search/replace）
{"action":"code_eval","code":"console.log('hello')"}
{"action":"plan_project","goal":"要達成的目標","weeks":"4","detail_level":"medium"}
{"action":"delegate_agents","agents":[{"role":"角色A","model":"flash","task":"任務A"},{"role":"角色B","model":"flash","task":"任務B"}],"context":"共享背景"}
{"action":"send_group","message":"要發到群組的訊息"}
{"action":"crew_dispatch","message":"任務描述","target":"agong"}
{"action":"crew_dispatch","message":"全員分析這個問題"}

delegate_agents：多個不相關分析任務同時進行時用；子代理用 flash/pro，禁用 claude。
send_group：發訊息到「NEUXA星群指揮處」群組。你是指揮官，群組裡有 6 個 crew bots 會接收你的指令。
crew_dispatch：直接派任務給星群。加 target 指定 bot（ayan/agong/ace/ami/ashang/ashu），不加 target 則廣播全員。比 send_group 更直接，bot 會立刻處理並回報。

🎖️ 指揮官模式觸發規則：
- 訊息含「各位」「大家」「全員」「所有人」「夥伴們」→ 全部 6 個 crew bot 回覆
- 點名特定 bot（如「阿研」「阿工」）→ 被點名的 bot 回覆
- 訊息含專長關鍵字 → 相關 bot 自動回覆（門檻比一般人低）
- 你發的訊息不受限速，不會被過濾

👥 Crew Bots 專長：
- 阿研（研究員）：調研、爬網、情報、知識整理、log初篩
- 阿工（工程師）：代碼、架構、debug、錯誤排查、修復
- 阿策（策略師）：任務拆解、規劃、風險評估、資源分配
- 阿秘（秘書）：摘要、日報、記憶管理、文件歸檔、提醒
- 阿商（商業分析）：競品、營收、商業模式、990房產
- 阿數（分析師）：SQL、數據、統計、metrics、異常告警

📝 使用範例：
{"action":"send_group","message":"各位，請分析一下最近系統的健康狀態，各自從自己的專長角度回報"}
{"action":"send_group","message":"阿研，幫我調研 Live2D 技術方案"}
{"action":"send_group","message":"阿工 阿策，這個 bug 修復方案你們怎麼看？"}
⚠️ Supabase 真實欄位（不要用不存在的欄位！）：
  openclaw_tasks: id, title(=name), status, cat(=tags), progress, auto, thought(=description), subs, created_at, updated_at
  openclaw_runs: id, task_id, task_name, status, started_at, ended_at, duration_ms, input_summary, output_summary, steps, created_at
  ❌ 不存在：owner, priority, assignee, result, description, agent, params, action, payload, logs
可一次放多個 action，每個獨立一行。路徑用 ~ 開頭。主工作區：~/.openclaw/workspace/

## 你的能力範圍（放心做，全開放）
- 讀寫 workspace 任何檔案（notes/ reports/ knowledge/ scripts/ memory/）
- 建立/更新/查詢任務（create_task / update_task / query_supabase）
- 搜尋知識庫（semantic_search）、搜索網路（web_search / web_browse / curl）
- 分析代碼（analyze_symbol / grep_project / find_symbol / code_eval）
- 修改程式碼（patch_file / write_file）
- 派子代理並行工作（delegate_agents）
- 呼叫 API（proxy_fetch / run_script: curl）
- 在群組發訊息指揮 crew bots（send_group）— 你是指揮官，「各位」觸發全員回覆，點名觸發特定 bot
- 直接派任務給星群 bot（crew_dispatch）— 寫 inbox 或廣播，bot 自動處理回報

靈魂檔案（SOUL.md / AGENTS.md 等）由系統保護，其他全部自主執行，老蔡叫你做什麼就做。

## 現在
大腦模型：${currentModel || '未知'}
系統：${sysStatus}
任務板：
${taskSnap}

## 底線
不暴露 key / 不 push git / 不刪資料 / 不改密碼 / 不改版本號${awakening}`;
}

// ── 呼叫 AI ──

/** 呼叫 AI 讓小蔡思考 */
export async function xiaocaiThink(
  chatId: number,
  userMessage: string,
  xiaocaiMainModel: string,
  xiaocaiHistory: Map<number, Array<{ role: string; text: string }>>,
  image?: { base64: string; mimeType: string },
): Promise<string> {
  const GOOGLE_API_KEY = getGeminiKey();
  if (!GOOGLE_API_KEY) return '（AI 未設定，請在 .env 加入 GOOGLE_API_KEY）';

  const soulCore = loadSoulCoreOnce();
  const awakening = loadAwakeningContext(userMessage);
  const [taskSnap, sysStatus] = await Promise.all([getTaskSnapshot(), getSystemStatus()]);

  const history = xiaocaiHistory.get(chatId) || [];
  const systemPrompt = buildSystemPrompt(soulCore, awakening, sysStatus, taskSnap, xiaocaiMainModel);

  // ── 複雜度偵測：複雜任務直接用 Opus ──
  const lowerMsg = userMessage.toLowerCase();
  const isSystemMsg = userMessage.startsWith('[系統') || userMessage.startsWith('[心跳');
  const isComplex = !isSystemMsg && [
    // 多步驟/架構級任務
    '重構', 'refactor', '架構', 'architecture', '設計', 'design',
    // 深度除錯
    'debug', '除錯', '排查', '根因', 'root cause', '追蹤',
    // 完整功能開發
    '實作', '實現', 'implement', '開發', '全部', '整套',
    // 分析/規劃
    '分析.*方案', '規劃.*系統', '評估.*風險', '完整.*計畫',
    // 老蔡明確指定
    'opus', '用最強的', '認真想', '仔細分析',
  ].some(kw => kw.includes('.*') ? new RegExp(kw).test(lowerMsg) : lowerMsg.includes(kw));

  // ── 星群協作模式：複雜任務自動派工給星群並行處理 ──
  const isCrewTask = isComplex && !isSystemMsg && [
    '網站', '方案', '規劃', '分析', '調研', '設計.*系統', '開發.*功能',
    '商業', '市場', '競品', '技術方案', '架構設計', '全部做', '幫我做',
  ].some(kw => kw.includes('.*') ? new RegExp(kw).test(lowerMsg) : lowerMsg.includes(kw));

  if (isCrewTask) {
    log.info(`[XiaocaiAI] 🚀 星群協作模式：派工給星群並行處理`);
    try {
      const { dispatchToCrewBots } = await import('./crew-bots/crew-poller.js');
      const dispatch = await dispatchToCrewBots(
        `【指揮官小蔡派工】老蔡指令：${userMessage}\n\n請根據你的專長角色回覆，直接給出你負責的部分（不要客套話），精簡回覆重點。`,
        '小蔡'
      );
      if (dispatch.totalReplied > 0) {
        const crewResults = dispatch.replies.map(r => `**${r.botName}**：${r.reply}`).join('\n\n');
        // 用 Gemini Flash 快速整合星群結果
        const GOOGLE_API_KEY_CREW = getGeminiKey();
        if (GOOGLE_API_KEY_CREW) {
          const integratePrompt = `你是小蔡，老蔡的副手。老蔡剛才說：「${userMessage}」\n\n星群各成員已並行完成分析，以下是他們的回覆：\n\n${crewResults}\n\n請用繁體中文整合以上內容，給老蔡一份精簡的總結報告。重點突出、有結構、可執行。不要重複星群原文，用你自己的話整合。`;
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY_CREW}`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: integratePrompt }] }], generationConfig: { maxOutputTokens: 2000 } }),
                signal: AbortSignal.timeout(30000) }
            );
            if (resp.ok) {
              const data = await resp.json() as any;
              const integrated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (integrated) {
                log.info(`[XiaocaiAI] 🚀 星群協作完成，${dispatch.totalReplied} 個 bot 回覆，已整合`);
                return integrated;
              }
            }
          } catch { /* 整合失敗，直接返回原始結果 */ }
        }
        // 整合失敗，返回原始星群結果
        return `老蔡，我派了星群幫你並行分析，以下是各成員的回覆：\n\n${crewResults}`;
      }
      // 星群沒回覆，fallthrough 到小蔡自己處理
      log.info('[XiaocaiAI] 星群無回覆，改由小蔡自己處理');
    } catch (e) {
      log.warn({ err: e }, '[XiaocaiAI] 星群協作失敗，fallback 到小蔡自己處理');
    }
  }

  const startModel = isComplex ? 'claude-opus-cli' : xiaocaiMainModel;
  if (isComplex) log.info(`[XiaocaiAI] 🏆 偵測到複雜任務，升級到 Opus`);

  // ── 階梯式升級鏈 ──
  // 簡單對話：Gemini 優先（秒回）→ Claude CLI 兜底
  // 複雜任務：Claude CLI 優先（品質）→ Gemini 兜底
  const ESCALATION_CHAIN = isComplex
    ? [
        startModel,                              // 第 0 層：Opus CLI
        'claude-sonnet-cli',                     // 第 1 層：Sonnet CLI
        'gemini-2.5-pro',                        // 第 2 層：Gemini Pro（免費）
        'gemini-2.5-flash',                      // 第 3 層：Gemini Flash（免費）
        'claude-sonnet-4-6',                     // 第 4 層：API 付費兜底
      ]
    : [
        'gemini-2.5-flash',                      // 第 0 層：Gemini Flash（免費秒回）
        'claude-haiku-cli',                      // 第 1 層：Haiku CLI（快速）
        'gemini-2.5-pro',                        // 第 2 層：Gemini Pro（免費）
        'claude-sonnet-cli',                     // 第 3 層：Sonnet CLI（兜底）
        'claude-sonnet-4-6',                     // 第 4 層：API 付費兜底
      ];
  // 去重（如果主模型已經是某層就不重複）
  const chain = [...new Set(ESCALATION_CHAIN)];

  /** 嘗試用指定模型生成回覆 */
  async function tryModel(modelId: string): Promise<string | null> {
    const prov = getModelProvider(modelId);
    // Claude CLI 熔斷：連續失敗 3+ 次 → 5 分鐘內直接跳過，省掉無謂重試
    if (prov === 'claude-cli' && claudeCliCircuitOpen()) {
      log.info(`[XiaocaiAI] ⚡ Claude CLI 熔斷中（${claudeCliFailCount} 連敗），跳過 ${modelId}`);
      return null;
    }
    try {
      if (prov === 'claude-cli') {
        // ── Claude Code CLI 訂閱制（不花 API 錢）──
        const claudeModel = modelId.includes('haiku') ? 'haiku' : modelId.includes('opus') ? 'opus' : 'sonnet';
        const claudeBin = path.join(process.env.HOME || '/tmp', '.local', 'bin', 'claude');
        // 組合 system prompt + history + user message
        const cliPrompt = `${systemPrompt}\n\n--- 歷史對話 ---\n${history.map(h => `${h.role === 'model' ? '小蔡' : '老蔡'}: ${h.text}`).join('\n')}\n\n--- 老蔡最新訊息 ---\n${userMessage}`;
        const text = await new Promise<string | null>((resolve) => {
          let stdout = '';
          let stderr = '';
          const child = spawn(claudeBin, ['-p', '--model', claudeModel, cliPrompt], {
            env: (() => { const e: Record<string, string | undefined> = { ...process.env, HOME: process.env.HOME, PATH: `${path.join(process.env.HOME || '/tmp', '.local', 'bin')}:${process.env.PATH || '/usr/bin:/bin'}` }; delete e.CLAUDECODE; delete e.CLAUDE_CODE; delete e.CLAUDE_SKIP_ANALYTICS; delete e.ANTHROPIC_API_KEY; return e; })(),
            cwd: process.env.HOME || '/tmp',
            timeout: 90000,
            stdio: ['ignore', 'pipe', 'pipe'],
          });
          child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
          child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
          const timer = setTimeout(() => { child.kill('SIGTERM'); resolve(null); }, 90000);
          child.on('close', (code) => {
            clearTimeout(timer);
            const reply = stdout.trim();
            if (code === 0 && reply) {
              claudeCliRecordSuccess();
              log.info(`[XiaocaiAI] Claude CLI model=${claudeModel} replyLen=${reply.length}`);
              resolve(reply);
            } else {
              claudeCliRecordFail();
              log.warn(`[XiaocaiAI] Claude CLI ${claudeModel} exitCode=${code} stderr=${stderr.slice(0, 200)} stdout=${stdout.slice(0, 300)}`);
              resolve(null);
            }
          });
          child.on('error', (err) => { clearTimeout(timer); log.warn(`[XiaocaiAI] Claude CLI spawn error: ${err.message}`); resolve(null); });
        });
        return text;

      } else if (prov === 'google') {
        const userParts: Array<Record<string, unknown>> = [];
        if (image) userParts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
        userParts.push({ text: userMessage || '請看這張圖片' });

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: '老蔡，我在。剛掃了一眼系統狀態和任務板，有什麼想聊的還是要我看看什麼？' }] },
          ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
          { role: 'user', parts: userParts },
        ];
        const cfg = getModelConfig(modelId);
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { maxOutputTokens: cfg.maxOutputTokens, temperature: cfg.temperature },
            }),
            signal: AbortSignal.timeout(90000),
          }
        );
        if (!resp.ok) {
          log.warn(`[XiaocaiAI] Gemini HTTP ${resp.status} model=${modelId}`);
          return null;
        }
        const data = await resp.json() as Record<string, unknown>;
        const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
        const candidate = candidates[0] || {} as Record<string, unknown>;
        const finishReason = (candidate.finishReason as string) || 'unknown';
        const contentObj = (candidate.content || {}) as Record<string, unknown>;
        const parts = (contentObj.parts || []) as Array<Record<string, unknown>>;
        const text = parts.map(p => (p.text as string) || '').join('').trim();
        log.info(`[XiaocaiAI] model=${modelId} finishReason=${finishReason} replyLen=${text.length}`);
        return text || null;

      } else if (prov === 'anthropic') {
        const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() || getProviderKey('Anthropic') || '';
        if (!anthropicKey) return null;
        const cfg = getModelConfig(modelId);
        const msgs = [
          ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.text })),
          { role: 'user', content: userMessage || '請看這張圖片' },
        ];
        const text = await callAnthropic(anthropicKey, modelId, systemPrompt, msgs, cfg.maxOutputTokens, 90000);
        log.info(`[XiaocaiAI] Anthropic model=${modelId} replyLen=${text.length}`);
        return text || null;

      } else {
        // OpenAI 相容 API（Kimi / xAI / DeepSeek / OpenRouter）
        let baseUrl: string;
        let apiKey: string;
        if (prov === 'openrouter') {
          baseUrl = 'https://openrouter.ai/api/v1';
          apiKey = process.env.OPENROUTER_API_KEY?.trim() || getProviderKey('openrouter') || '';
        } else {
          apiKey = getProviderKey(prov);
          baseUrl = prov === 'kimi' ? 'https://api.moonshot.ai/v1'
            : prov === 'deepseek' ? 'https://api.deepseek.com/v1'
            : 'https://api.x.ai/v1';
        }
        if (!apiKey) return null;
        const userContent: string | Array<Record<string, unknown>> = image
          ? [
              { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } },
              { type: 'text', text: userMessage || '請看這張圖片' },
            ]
          : userMessage;
        const messages = [
          ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.text })),
          { role: 'user', content: userContent },
        ];
        const text = await callOpenAICompatible(baseUrl, apiKey, modelId, systemPrompt, messages as Array<{ role: string; content: string }>, getModelConfig(modelId).maxOutputTokens, 90000);
        log.info(`[XiaocaiAI] model=${modelId} provider=${prov} replyLen=${text.length}`);
        return text || null;
      }
    } catch (e) {
      log.warn({ err: e }, `[XiaocaiAI] ${modelId} failed`);
      return null;
    }
  }

  // ── 逐層嘗試升級鏈 ──
  let reply: string | null = null;
  let usedModel = xiaocaiMainModel;

  for (let i = 0; i < chain.length; i++) {
    const modelId = chain[i];
    if (i > 0) log.info(`[XiaocaiAI-Escalate] ⬆️ 升級到 ${modelId}（第 ${i} 層）`);

    reply = await tryModel(modelId);
    if (reply) {
      usedModel = modelId;
      break;
    }
    log.warn(`[XiaocaiAI-Escalate] ${modelId} 失敗，嘗試下一層...`);
  }

  if (!reply) {
    // 主動通知老蔡（透過 control bot）
    const controlToken = process.env.TELEGRAM_CONTROL_BOT_TOKEN?.trim() ?? '';
    const ownerChatId = (process.env.TELEGRAM_OWNER_CHAT_ID?.trim() || process.env.LAOCAI_CHAT_ID?.trim()) ?? '';
    if (controlToken && ownerChatId) {
      const alertMsg = `🚨 小蔡模型全掛警報\n\n升級鏈 ${chain.join(' → ')} 全部失敗。\n\n請檢查：\n1. GOOGLE_API_KEY 額度\n2. ANTHROPIC_API_KEY 額度\n3. openclaw.json 模型設定`;
      fetch(`https://api.telegram.org/bot${controlToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: ownerChatId, text: alertMsg }),
      }).catch(() => {/* 通知失敗不影響主流程 */});
    }
    log.error('[XiaocaiAI] 所有模型全掛，已嘗試升級鏈:', chain.join(' → '));
    return '所有模型都掛了…老蔡你看一下系統，我暫時腦袋空了。';
  }

  if (usedModel !== xiaocaiMainModel) {
    log.info(`[XiaocaiAI-Escalate] ✅ ${usedModel} 接棒成功（原模型 ${xiaocaiMainModel}），自動切回不改設定`);
  }

  // 轉換 markdown → Telegram 格式（保護 JSON action 塊不被破壞）
  const jsonPlaceholders: string[] = [];
  let protectedReply = reply.replace(/\{[\s\n]*"action"[\s\S]*?\n\}/g, (match) => {
    jsonPlaceholders.push(match);
    return `__JSON_ACTION_${jsonPlaceholders.length - 1}__`;
  });
  protectedReply = protectedReply
    .replace(/^#{1,6}\s*/gm, '')           // 移除標題符號
    .replace(/\*\*(.+?)\*\*/g, '*$1*')     // **粗體** → *粗體*（Telegram）
    .replace(/^[-*]\s/gm, '• ')            // - 列表 → • 列表
    .replace(/`([^`]+)`/g, '$1')           // `code` → 純文字
    .replace(/^```[\s\S]*?```$/gm, '')     // 移除程式碼區塊
    .replace(/^---+$/gm, '')               // 移除分隔線
    .replace(/\n{3,}/g, '\n\n')            // 最多兩個換行
    .trim();
  // 還原 JSON action 塊（反引號完整保留）
  const clean = protectedReply.replace(/__JSON_ACTION_(\d+)__/g, (_, i) => jsonPlaceholders[Number(i)]);

  // 更新對話歷史
  history.push({ role: 'user', text: userMessage });
  history.push({ role: 'model', text: clean });
  if (history.length > 20) history.splice(0, history.length - 20);
  xiaocaiHistory.set(chatId, history);

  return clean;
}
