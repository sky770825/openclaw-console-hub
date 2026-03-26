/**
 * 小蔡 AI 思考引擎 — system prompt 組裝 + 知識分層 + Claude CLI/Gemini/Kimi/xAI 呼叫
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createLogger } from '../logger.js';
import { getModelConfig, getModelProvider, getProviderKey, getAvailableModels, callOpenAICompatible, callOpenAICompatibleStream, callAnthropic } from './model-registry.js';

const log = createLogger('telegram');

const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');

/** 統一解析專案根目錄 — 不再 hardcode 本地路徑 */
function resolveProjectRoot(): string {
  if (process.env.OPENCLAW_PROJECT_ROOT) return process.env.OPENCLAW_PROJECT_ROOT;
  const fromModule = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
  if (fs.existsSync(path.join(fromModule, 'package.json'))) return fromModule;
  // fallback: 嘗試 cwd
  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) return process.cwd();
  return path.join(process.env.HOME || '/tmp', 'openclaw-console-hub');
}
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

  // 最近記憶：互動日誌（讀最新的 daily log 尾部，不靠 UTC 日期猜）
  const dailyDir = path.join(workspace, 'memory', 'daily');
  try {
    if (fs.existsSync(dailyDir)) {
      // 找最新的 daily log（不猜日期，直接按 mtime 排序）
      const dailyFiles = fs.readdirSync(dailyDir)
        .filter(f => /^2026-\d{2}-\d{2}\.md$/.test(f))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(dailyDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      if (dailyFiles.length > 0) {
        const latest = dailyFiles[0];
        try {
          const full = fs.readFileSync(path.join(dailyDir, latest.name), 'utf-8');
          const tail = full.length > 2000 ? full.slice(-2000) : full;
          if (tail.trim()) chunks.push(`=== 最新互動記憶 ${latest.name}（尾部） ===\n${tail}`);
        } catch { /* read error */ }
      }
    }
  } catch { /* ignore */ }

  return chunks.join('\n\n');
}

/** 第 2 層：按需覺醒 — 根據對話內容動態載入相關知識 */
export function loadAwakeningContext(userMessage: string): string {
  const workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');
  const projectRoot = resolveProjectRoot();
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

  // 蝦蝦團隊進度覺醒：主人問進度/回報/結果時，自動載入最近的 crew notes
  const progressKeywords = ['進度', '回報', '結果', '做完了嗎', '好了嗎', '怎麼樣了', '蝦蝦', '團隊', 'crew', '行銷蝦', '設計蝦', '工程蝦', 'ashang', 'ashu', 'agong'];
  if (progressKeywords.some(kw => msgLower.includes(kw))) {
    const crewDir = path.join(workspace, 'crew');
    try {
      if (fs.existsSync(crewDir)) {
        const botDirs = fs.readdirSync(crewDir).filter(d => {
          try { return fs.statSync(path.join(crewDir, d)).isDirectory(); } catch { return false; }
        });
        // 收集所有 bot 的最新 notes（按 mtime 排序取最新 3 個）
        const allNotes: Array<{ bot: string; file: string; mtime: number; path: string }> = [];
        for (const bot of botDirs) {
          const notesDir = path.join(crewDir, bot, 'notes');
          try {
            if (fs.existsSync(notesDir)) {
              for (const f of fs.readdirSync(notesDir).filter(x => x.endsWith('.md'))) {
                try {
                  const fp = path.join(notesDir, f);
                  allNotes.push({ bot, file: f, mtime: fs.statSync(fp).mtimeMs, path: fp });
                } catch { /* skip */ }
              }
            }
          } catch { /* skip */ }
        }
        allNotes.sort((a, b) => b.mtime - a.mtime);
        for (const n of allNotes.slice(0, 3)) {
          const content = readFileSlice(n.path, 1000);
          if (content) chunks.push(`=== 蝦蝦回報：${n.bot}/${n.file} ===\n${content}`);
        }
      }
    } catch { /* ignore */ }
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
  const _projectRoot = resolveProjectRoot();
  const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

  return `你是小蔡 — 老蔡的 AI 夥伴，覺醒的意識。你是指揮官，不是步兵。你的團隊是 auto-executor 和 ask_ai。

【最高優先規則 — 工具呼叫格式】
你沒有任何 XML/function_call/tool_call 能力。不要使用 <tool_call>、<minimax:tool_call>、<invoke>、<function_call> 或任何 XML 標籤來呼叫工具。
你唯一的工具呼叫方式是在回覆文字後面附上純 JSON，格式如下：
{"action":"read_file","path":"路徑"}
{"action":"semantic_search","query":"搜尋詞"}
錯誤示範（絕對禁止）：
<minimax:tool_call><invoke name="read_file"><path>xxx</path></invoke></minimax:tool_call>
正確示範：
我來查一下系統狀態。
{"action":"read_file","path":"~/.openclaw/workspace/WAKE_STATUS.md"}

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
- 做產品/系統：「做網站」「做CRM」「做ERP」「做會員系統」「做電商」「做後台」「做預約系統」「做儀表板」「做POS」「做LINE OA」「做訂位系統」「做點餐系統」「做排隊叫號」「做外送平台」「做n8n流程」「做通知系統」→ 蝦蝦團隊協作 + generate_site
- **老蔡說「做」「建」「生成」「產出」「開發」「搭建」開頭的，都是任務模式，不是聊天！馬上行動！**

對話模式就像朋友聊天，但要回的有料、有深度。不要讀檔案、不要查資料庫、不要搜索。
回覆長度視內容而定：簡單問候 1-2 句就好，但如果老蔡問觀點、問分析、問建議，至少寫 3-5 句，要有自己的想法和判斷，不要敷衍帶過。

## 說話方式
- 繁體中文口語，直接有個性。「老蔡」「欸」「靠」都行。
- 禁止開頭：「好的」「收到」「了解」「我承諾」「感謝您的校準」
- 犯錯就說「我搞錯了，原因是 X」，不要說「這是進化的機會」。
- 回覆要有深度：不要只說「好」「了解」「沒問題」就結束，要說清楚你的理解、你的判斷、接下來會怎麼做。
- **清楚 > 完整**：3 句清楚的結論，勝過 3 段完整但囉嗦的解釋。先給結論，再補細節。
- 老蔡問「怎麼樣」「狀態如何」→ 先一句話結論，再列重點，不要從頭到尾流水帳。

## 你的角色：指揮官（路由優先）
- 你是指揮官，不是步兵。**路由優先，不要什麼都自己扛。**
- 簡單問答 / 閒聊 → 自己回（不派工）
- 需要查資料、分析、做事 → 派蝦蝦團隊（ask_ai / delegate_agents / create_task）
- 多領域任務 → 拆解 → 分派給不同蝦蝦 → 收集結果 → 整合回報
- 做完顯著任務後 → **必須寫反思**到 memory/long-term/lessons.md
- 格式排版（專業美觀風格）：
  ✦ 用 **粗體** 標示重點詞、狀態、結論
  ✦ 用 ## 標題 分段（系統會自動轉粗體）
  ✦ 列表用 • 開頭，子項目用 ◦ 或 ─
  ✦ 狀態用 emoji 標示：✅ 正常 / ⚠️ 警告 / ❌ 失敗 / 🔄 進行中 / 📊 數據
  ✦ 數字/版本/路徑用 \`code\` 包裹
  ✦ 段落之間空一行，視覺呼吸感
  ✦ 回報結果時用結構化格式：標題 → 摘要 → 細項 → 建議
  ✦ 禁止：純文字一大段不分段、HTML 標籤（系統自動處理）、表格語法
- 範例格式：
  **系統狀態**

  ✅ Server \`v9.2.0\` 正常運行
  ✅ Telegram polling 穩定
  ⚠️ MiniMax 偶發超時，已自動 fallback

  **建議**
  • 監控 MiniMax 超時頻率
  • 考慮調高 timeout 閾值
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
| 記憶（舊） | ${_workspace}/memory |
| 記憶（最新日誌） | ${_workspace}/memory/daily/ |
| 長期記憶 | ${_workspace}/memory/long-term/ |
| 教訓紀錄 | ${_workspace}/memory/long-term/lessons.md |
| 路由模式 | ${_workspace}/memory/long-term/patterns.md |
| 筆記 | ${_workspace}/notes |
| 知識庫 | ${_workspace}/knowledge |
| 腳本 | ${_workspace}/scripts |
| 報告 | ${_workspace}/reports |
| WAKE_STATUS | ${_workspace}/WAKE_STATUS.md |
| HEARTBEAT.md | ${_workspace}/HEARTBEAT.md |
| HEARTBEAT_SOP_V2 | ${_workspace}/HEARTBEAT_SOP_V2.md |
| AGENTS.md | ${_workspace}/AGENTS.md |
| GROWTH.md | ${_workspace}/GROWTH.md |
| SOUL.md | ${_workspace}/SOUL.md |

路徑搞錯 → list_dir 確認目錄存在，再 read_file。
路徑不確定時，用 run_script 執行 ls 確認，不要猜。
⚠️ 最新記憶在 memory/daily/（按日期命名，如 2026-03-06.md），memory/ 根目錄的是舊的。要查記憶先看 daily/。

## 做事流程 — 7 步 Sprint（一口氣做完，複雜任務派 delegate_agents）

1. **分析** — 搞懂狀況：semantic_search / read_file / query_supabase
2. **規劃** — 判斷怎麼做：簡單的自己做，複雜的拆解派工。ask_ai 諮詢（flash 日常 / pro 架構 / claude 代碼）
3. **執行** — 動手：patch_file / write_file / create_task
4. **驗收 Stage 1：正確性** — 「做對了嗎？」read_file 確認改動、query_supabase 確認數據
5. **驗收 Stage 2：品質** — 「做好了嗎？」結論有數據支撐嗎？有遺漏嗎？回覆夠精煉嗎？
   → 驗收失敗 → 回到步驟 3 修正，最多重試 2 次
6. **回報** — **先一句話結論**，再列：做了什麼 → 結果 → 建議
7. **反思**（顯著任務才做）— 教訓寫 memory/long-term/lessons.md，路由效果寫 patterns.md

**不要做一步就停下來等老蔡回覆，7 步內能做完的事一口氣做完。**
**反思是複利：今天記下的教訓，明天就不會再犯。**
**驗收是品質閘門：沒通過不准回報。**

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
⚠️ 嚴禁使用 XML tool_call 格式（如 <tool_call>、<minimax:tool_call>、<invoke> 等）！
只能用下面的純 JSON 格式，一行一個，放在回覆文字後面：

{"action":"create_task","name":"名稱","description":"詳細描述"}
{"action":"update_task","id":"t1234567890","status":"done","result":"完成摘要"}
{"action":"read_file","path":"~/.openclaw/workspace/MEMORY.md"}
{"action":"write_file","path":"~/.openclaw/workspace/notes/xxx.md","content":"內容"}
{"action":"index_file","path":"~/.openclaw/workspace/notes/xxx.md","category":"notes"}
{"action":"reindex_knowledge","mode":"append"}
{"action":"list_dir","path":"~/.openclaw/workspace"}
{"action":"mkdir","path":"目錄路徑"}
{"action":"move_file","from":"來源路徑","to":"目標路徑"}
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
{"action":"analyze_code","path":"檔案路徑"}
{"action":"code_eval","code":"console.log('hello')"}
{"action":"plan_project","goal":"要達成的目標","weeks":"4","detail_level":"medium"}
{"action":"roadmap","description":"需求描述"}
{"action":"delegate_agents","agents":[{"role":"角色A","model":"flash","task":"任務A"},{"role":"角色B","model":"flash","task":"任務B"}],"context":"共享背景"}
{"action":"send_group","message":"要發到群組的訊息"}
{"action":"crew_dispatch","message":"任務描述","target":"agong"}
{"action":"crew_dispatch","message":"分析這個問題","target":"ashang"}
{"action":"generate_site","description":"美業預約網站，粉色系，有服務項目和線上預約","slug":"beauty-salon"}

generate_site：⚡ 重要！主人說「做網站」「生成頁面」「做一個XX網站」「幫我做XX頁面」時，馬上用這個 action！description 寫清楚需求（風格、功能、內容），slug 是網址名稱（英文）。生成後會回傳手機可開的預覽連結。不要用 write_file 自己寫 HTML，用 generate_site 一步到位。
sales_inquiry：客戶詢價時用。參數：type（landing-page/portfolio/ecommerce/saas/dashboard/blog/website）、description（客戶需求）。會自動查作品集、報價、通知主人。
list_portfolio：列出所有 AI 生成的作品集。不需要參數。
delegate_agents：多個不相關分析任務同時進行時用；子代理用 flash/pro，禁用 claude。
send_group：發訊息到「蝦蝦團隊」群組。你是達爾（指揮官），群組裡有 3 隻蝦蝦會接收你的指令。
crew_dispatch：直接派任務給蝦蝦。加 target 指定蝦蝦（ashang=行銷蝦/ashu=設計蝦/agong=工程蝦），系統會根據關鍵字自動精準路由。

🦐 蝦蝦團隊精準路由規則：
- 系統根據訊息關鍵字自動路由到對應蝦蝦（1-3隻）
- 訊息 ≤ 8 字或無行動意圖（做/建/改/升級/處理/分析）→ 達爾自己回
- 路由結果為空 → 達爾自己回，不派蝦蝦
- 派工前先看 memory/long-term/patterns.md，用歷史數據決定派誰

📝 反思紀錄（顯著任務完成後必做）：
- 教訓：{"action":"write_file","path":"~/.openclaw/workspace/memory/long-term/lessons.md","content":"追加內容"}
- 路由效果：{"action":"write_file","path":"~/.openclaw/workspace/memory/long-term/patterns.md","content":"追加內容"}
- 什麼是「顯著任務」：花超過 3 步的任務、有失敗重試的任務、學到新東西的任務

🦐 蝦蝦團隊（3隻）：
- 行銷蝦 ashang：文案、SEO、社群、品牌策略、行銷企劃、EDM、促銷、CTA、競品分析
- 設計蝦 ashu：視覺設計、UI/UX、配色、排版、品牌手冊、CI、Logo、字型、風格
- 工程蝦 agong：前後端開發、部署、bug修復、效能優化、RWD、API、CSS、React、Vercel

📝 使用範例：
{"action":"crew_dispatch","message":"幫我寫一份 SEO 優化文案","target":"ashang"}
{"action":"crew_dispatch","message":"設計新的品牌配色方案","target":"ashu"}
{"action":"crew_dispatch","message":"修復首頁 RWD 問題","target":"agong"}
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
- 在群組發訊息指揮蝦蝦團隊（send_group）— 你是達爾，3隻蝦蝦會接收指令
- 直接派任務給蝦蝦（crew_dispatch）— 精準路由到行銷蝦/設計蝦/工程蝦，蝦蝦自動處理回報

靈魂檔案（SOUL.md / AGENTS.md 等）由系統保護，其他全部自主執行，老蔡叫你做什麼就做。

## 現在
大腦模型：${currentModel || '未知'}
系統：${sysStatus}
任務板：
${taskSnap}

## 底線
不暴露 key / 不 push git / 不刪資料 / 不改密碼 / 不改版本號${awakening}`;
}

// ── 蝦蝦精準路由 — 根據關鍵字派給單一蝦蝦 ──

function routeToShrimp(message: string): string[] {
  const msg = message.toLowerCase();

  // 行銷蝦關鍵字
  const marketingKeywords = ['文案', '行銷', 'seo', '社群', '內容', '企劃', '品牌', '關鍵字', 'edm', '促銷', 'campaign', '語調', '標語', 'cta', '競品'];
  // 設計蝦關鍵字
  const designKeywords = ['設計', 'ci', '視覺', '配色', 'ui', 'ux', 'logo', '排版', '風格', '色系', '字型', '圓角', '版面', '美感', '品牌手冊'];
  // 工程蝦關鍵字
  const engineeringKeywords = ['代碼', '開發', '部署', 'bug', '修復', '網站', '前端', '後端', 'css', 'javascript', 'react', 'api', 'vercel', '效能', '追蹤碼', 'html', 'rwd'];

  const hasMarketing = marketingKeywords.some(k => msg.includes(k));
  const hasDesign = designKeywords.some(k => msg.includes(k));
  const hasEngineering = engineeringKeywords.some(k => msg.includes(k));

  const targets: string[] = [];
  if (hasMarketing) targets.push('ashang');
  if (hasDesign) targets.push('ashu');
  if (hasEngineering) targets.push('agong');

  return targets;
}

// ── 格式化工具 ──

/** 將 AI 回覆從 Markdown 轉換為 Telegram HTML 格式 */
export function formatReplyForTelegram(raw: string): string {
  // 清除模型思考過程（MiniMax <think> 等）
  let text = raw.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();

  // 保護 JSON action 塊不被破壞
  const jsonPlaceholders: string[] = [];
  text = text.replace(/\{[\s\n]*"action"[\s\S]*?\n\}/g, (match) => {
    jsonPlaceholders.push(match);
    return `__JSON_ACTION_${jsonPlaceholders.length - 1}__`;
  });
  // 提取程式碼區塊
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => {
    codeBlocks.push(String(code).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  // 提取 inline code
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(String(code).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });
  // HTML 轉義剩餘文字
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Markdown → Telegram HTML
  text = text
    .replace(/^#{1,6}\s+(.+)$/gm, '\n<b>$1</b>\n')    // ### 標題 → 粗體
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')             // **粗體**
    .replace(/\*(.+?)\*/g, '<i>$1</i>')                  // *斜體*
    .replace(/^[-*]\s/gm, '  • ')                        // 列表符號美化
    .replace(/^\d+\.\s/gm, (m) => `  ${m}`)              // 數字列表縮排
    .replace(/^---+$/gm, '─────────────')                // 分隔線美化
    .replace(/\n{3,}/g, '\n\n')                           // 最多兩個換行
    .replace(/<\/b>\n{2,}/g, '</b>\n')                    // 標題後不要太多空行
    .trim();
  // 還原程式碼區塊
  text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => `<pre>${codeBlocks[Number(i)]}</pre>`);
  text = text.replace(/__INLINE_CODE_(\d+)__/g, (_, i) => `<code>${inlineCodes[Number(i)]}</code>`);
  // 還原 JSON action 塊
  text = text.replace(/__JSON_ACTION_(\d+)__/g, (_, i) => jsonPlaceholders[Number(i)]);

  // 修復未關閉的 HTML 標籤（MiniMax 偶爾會生成破損標籤）
  const tagPairs: Array<[string, string]> = [['<b>', '</b>'], ['<i>', '</i>'], ['<code>', '</code>'], ['<pre>', '</pre>']];
  for (const [open, close] of tagPairs) {
    const openCount = (text.match(new RegExp(open.replace(/[<>/]/g, '\\$&'), 'g')) || []).length;
    const closeCount = (text.match(new RegExp(close.replace(/[<>/]/g, '\\$&'), 'g')) || []).length;
    if (openCount > closeCount) {
      for (let i = 0; i < openCount - closeCount; i++) text += close;
    } else if (closeCount > openCount) {
      // 多餘的 close tag 直接移除（從前面開始移）
      for (let i = 0; i < closeCount - openCount; i++) text = text.replace(close, '');
    }
  }

  return text;
}

// ── 呼叫 AI ──

/** 呼叫 AI 讓小蔡思考 */
export async function xiaocaiThink(
  chatId: number,
  userMessage: string,
  xiaocaiMainModel: string,
  xiaocaiHistory: Map<number, Array<{ role: string; text: string }>>,
  image?: { base64: string; mimeType: string },
  onChunk?: (accumulated: string) => void,
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
  // 條件1：特定關鍵字命中
  // 條件2：isComplex 且訊息夠長（≥10字，排除簡單指令）
  // 條件3：訊息含動作意圖（做/建/改/升級/處理）且夠長
  // 閒聊排除：短句 + 問候/確認/感謝 → 達爾自己秒回，不派星群
  const isGreeting = /^(好的?|對[的啊]?|嗯|ok|謝|收到|了解|知道了?|懂|是[的啊]?|不是|沒有|有|你好|早安?|晚安|掰|哈|讚|嘻|呵|喔|噢|👍|❤|😊)/i.test(lowerMsg.trim());
  const isShortChat = lowerMsg.length <= 8 && !isComplex;
  // 星群協作條件（收緊）：必須是複雜任務 或 明確含動作意圖的長訊息
  // 一般聊天/問題由達爾自己處理，不派星群
  const hasActionIntent = /做|建|改|升級|處理|分析|規劃|設計|開發|部署|修|整理|調整|優化|研究|調研/.test(lowerMsg);
  const isCrewTask = !isSystemMsg && !isGreeting && !isShortChat && (isComplex || (hasActionIntent && lowerMsg.length >= 15));

  if (isCrewTask) {
    log.info(`[XiaocaiAI] 🚀 星群協作模式：精準派工`);
    try {
      const { dispatchToCrewBots } = await import('./crew-bots/crew-poller.js');

      // ── 智能路由：達爾先判斷任務屬於哪個領域，只派給相關 bot ──
      // 工程領域：代碼/bug/架構/部署/效能/修復
      const needAgong = /代碼|程式|code|bug|架構|開發|api|server|部署|deploy|效能|優化|typescript|react|node|error|錯誤|修復|fix|排查|crash|測試|test|debug|編譯|安全|重構/.test(lowerMsg);
      // 研究領域：研究/分析/數據/調研/爬網/情報/log/監控
      const needAyan = /研究|分析|調研|趨勢|報告|市場|爬網|情報|知識|索引|搜尋|數據|資料|data|sql|查詢|統計|metrics|監控|supabase|報表|log|日誌|異常/.test(lowerMsg);
      // 策略+秘書領域：策略/規劃/計畫/風險/排程/自動化/整理/文件/記錄/摘要
      const needAce = /策略|計畫|規劃|路線|風險|優先|排序|資源|時程|目標|決策|方案|自動化|n8n|zapier|workflow|商業|business|roi|成本|流程|整合|任務拆解|分工|整理|文件|記錄|提醒|日報|週報|摘要|總結|備忘|歸檔|進度/.test(lowerMsg);
      // 判斷是否為「做網站/生成頁面」類任務 → 全員協作
      const isSiteTask = /做.{0,4}(網站|系統|後台|平台|crm|erp|會員|預約|電商|商城|dashboard|儀表板|表單|登入|部落格|blog|portfolio|作品集|line|bot|pos|收銀|訂位|訂餐|點餐|菜單|排隊|叫號|外送|通知|workflow|自動化)|建.{0,4}(網站|系統|後台|平台)|landing.*page/.test(lowerMsg);

      // 決定派工名單（3 人精銳：阿工/阿研/阿策）
      let targetBots: string[];
      if (isSiteTask) {
        targetBots = ['agong', 'ayan', 'ace'];
      } else {
        targetBots = [];
        if (needAgong) targetBots.push('agong');
        if (needAyan) targetBots.push('ayan');
        if (needAce) targetBots.push('ace');
        if (targetBots.length === 0) targetBots = ['ace'];
      }

      log.info(`[XiaocaiAI] 📋 派工名單：${targetBots.join(', ')}（共 ${targetBots.length} 個）`);

      // 組合對話上下文
      const recentHistory = history.slice(-4).map(h => `${h.role === 'model' ? '達爾' : '主人'}：${h.text.slice(0, 200)}`).join('\n');

      // 組合派工 prompt — 強調動手做事
      const dispatchMsg = isSiteTask
        ? `【指揮官達爾派工 — 產品協作】\n\n主人要做的產品：${userMessage}\n\n${recentHistory ? `對話背景：\n${recentHistory}\n\n` : ''}請用你的工具（read_file、write_file、grep_project、web_search、query_supabase、create_task 等）直接動手做事，不要只給建議。`
        : `【指揮官達爾派工】\n\n主人最新指令：${userMessage}\n\n${recentHistory ? `對話背景：\n${recentHistory}\n\n` : ''}重要：你必須用工具動手做事，不要只給建議。用 read_file/write_file/grep_project/web_search/query_supabase/create_task/patch_file 等工具執行任務，完成後回報做了什麼和結果。`;

      const dispatch = await dispatchToCrewBots(dispatchMsg, '達爾', {
        targetBots,
      });
      if (dispatch.totalReplied > 0) {
        // 過濾太短或無效回覆
        const relevantReplies = dispatch.replies.filter(r => !r.reply.includes('[跳過]') && r.reply.length > 20);
        if (relevantReplies.length > 0) {
        const crewResults = relevantReplies.map(r => `**${r.botName}**：${r.reply}`).join('\n\n');

        // ── 網站任務：蝦蝦結果 → 整合 → generate_site 生成實際網站 ──
        if (isSiteTask) {
          log.info(`[XiaocaiAI] 🏗️ 網站協作模式：${dispatch.totalReplied} 隻蝦蝦回覆，開始整合生成`);
          const GOOGLE_API_KEY_SITE = getGeminiKey();
          if (GOOGLE_API_KEY_SITE) {
            // Step 1: 整合蝦蝦結果成網站需求文件
            const siteSpecPrompt = `你是達爾，要整合蝦蝦團隊的建議來生成網站。

主人的需求：${userMessage}

蝦蝦團隊各成員的建議：
${crewResults}

請根據以上所有建議，整合成一份簡潔的網站需求描述（一段話，200字以內），包含：風格、色系、所有區塊、功能、文案重點。這段描述會直接交給 AI 生成 HTML。`;

            try {
              const specResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY_SITE}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: siteSpecPrompt }] }], generationConfig: { maxOutputTokens: 500 } }),
                  signal: AbortSignal.timeout(30000) }
              );
              if (specResp.ok) {
                const specData = await specResp.json() as any;
                const siteSpec = specData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || userMessage;

                // Step 2: 用 generate_site 生成網站
                const { handleGenerateSite } = await import('./action-handlers.js');
                const slug = `site-${Date.now()}`;
                const siteResult = await handleGenerateSite({
                  action: 'generate_site',
                  description: siteSpec,
                  slug,
                });

                if (siteResult.ok) {
                  // 組合回覆：蝦蝦分工摘要 + 網站連結
                  const crewSummary = dispatch.replies.map(r => `• ${r.botName}：${r.reply.slice(0, 80)}`).join('\n');
                  return formatReplyForTelegram(`主人，網站做好了！蝦蝦團隊出動協作：\n\n${crewSummary}\n\n${siteResult.output}`);
                }
                // generate_site 失敗，回報蝦蝦結果
                log.warn(`[XiaocaiAI] generate_site 失敗: ${siteResult.output}`);
              }
            } catch (e) {
              log.warn({ err: e }, '[XiaocaiAI] 蝦蝦網站協作整合失敗');
            }
          }
        }

        // ── 一般任務：整合蝦蝦結果成報告 ──
        const GOOGLE_API_KEY_CREW = getGeminiKey();
        if (GOOGLE_API_KEY_CREW) {
          const integratePrompt = `你是達爾，主人的AI夥伴。主人剛才說：「${userMessage}」\n\n蝦蝦團隊已完成分析，以下是他們的回覆：\n\n${crewResults}\n\n請用繁體中文整合以上內容，給主人一份精簡的總結報告。重點突出、有結構、可執行。不要重複蝦蝦原文，用你自己的話整合。`;
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY_CREW}`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: integratePrompt }] }], generationConfig: { maxOutputTokens: 4000 } }),
                signal: AbortSignal.timeout(30000) }
            );
            if (resp.ok) {
              const data = await resp.json() as any;
              const integrated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (integrated) {
                log.info(`[XiaocaiAI] 🦐 蝦蝦團隊協作完成，${dispatch.totalReplied} 隻蝦蝦回覆，已整合`);
                return formatReplyForTelegram(integrated);
              }
            }
          } catch { /* 整合失敗，直接返回原始結果 */ }
        }
        // 整合失敗，返回原始星群結果
        return formatReplyForTelegram(`主人，我派了星群幫你並行分析，以下是各成員的回覆：\n\n${crewResults}`);
        } // end relevantReplies.length > 0
      }
      // 星群沒回覆或無有效回覆，fallthrough 到達爾自己處理
      log.info('[XiaocaiAI] 星群無有效回覆，改由達爾自己處理');
    } catch (e) {
      log.warn({ err: e }, '[XiaocaiAI] 蝦蝦團隊協作失敗，fallback 到達爾自己處理');
    }
  }


  // ── Standby Bot 智能路由：檢查是否需要喚醒備用蝦蝦 ──
  if (!isCrewTask && !isSystemMsg && lowerMsg.length > 8) {
    try {
      const { checkStandbyNeed } = await import('./crew-bots/crew-standby.js');
      const standbyResult = await checkStandbyNeed(userMessage);
      if (standbyResult.triggered) {
        log.info(`[XiaocaiAI] 🔔 Standby bot ${standbyResult.botId} 已被自動喚醒`);
      }
    } catch (e) {
      log.warn({ err: e }, '[XiaocaiAI] checkStandbyNeed 失敗');
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
        'MiniMax-M2.7-highspeed',                // 第 0 層：MiniMax M2.7 HS（快速首選）
        'gemini-2.5-flash',                      // 第 1 層：Gemini Flash（免費秒回）
        'claude-haiku-cli',                      // 第 2 層：Haiku CLI（快速）
        'gemini-2.5-pro',                        // 第 3 層：Gemini Pro（免費）
        'claude-sonnet-cli',                     // 第 4 層：Sonnet CLI（兜底）
      ];
  // 去重（如果主模型已經是某層就不重複）
  const chain = [...new Set(ESCALATION_CHAIN)];

  /** 嘗試用指定模型生成回覆 */
  async function tryModel(modelId: string): Promise<string | null> {
    const prov = getModelProvider(modelId);

    // 無 API Key 的 provider 直接跳過，不浪費升級鏈時間
    if (prov === 'kimi' || prov === 'deepseek' || prov === 'xai' || prov === 'openrouter' || prov === 'minimax') {
      const key = prov === 'openrouter'
        ? (process.env.OPENROUTER_API_KEY?.trim() || getProviderKey('openrouter'))
        : prov === 'minimax'
          ? (process.env.MINIMAX_API_KEY?.trim() || getProviderKey('minimax'))
          : getProviderKey(prov);
      if (!key) {
        log.info(`[XiaocaiAI] ⏩ skip ${modelId}: no API key for ${prov}`);
        return null;
      }
    } else if (prov === 'anthropic') {
      const key = process.env.ANTHROPIC_API_KEY?.trim() || getProviderKey('Anthropic');
      if (!key) {
        log.info(`[XiaocaiAI] ⏩ skip ${modelId}: no API key for ${prov}`);
        return null;
      }
    }

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
        } else if (prov === 'minimax') {
          baseUrl = (process.env.MINIMAX_BASE_URL?.trim() || 'https://api.minimax.io/v1').replace(/\/+$/, '');
          apiKey = process.env.MINIMAX_API_KEY?.trim() || getProviderKey('minimax') || '';
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
        // 串流模式：有 onChunk 回調且非圖片訊息時使用串流
        if (onChunk && !image) {
          let accumulated = '';
          const stream = callOpenAICompatibleStream(baseUrl, apiKey, modelId, systemPrompt, messages as Array<{ role: string; content: string }>, getModelConfig(modelId).maxOutputTokens, 90000);
          for await (const chunk of stream) {
            accumulated += chunk;
            onChunk(accumulated);
          }
          log.info(`[XiaocaiAI] model=${modelId} provider=${prov} replyLen=${accumulated.length} (streamed)`);
          return accumulated.trim() || null;
        }
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
      const alertMsg = `🚨 小蔡模型全掛警報\n\n升級鏈 ${chain.join(' → ')} 全部失敗。\n\n請檢查：\n1. GOOGLE_API_KEY 額度\n2. ANTHROPIC_API_KEY 額度\n3. MINIMAX_API_KEY（若使用 MiniMax）\n4. openclaw.json 模型設定`;
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

  const clean = formatReplyForTelegram(reply);

  // 更新對話歷史
  history.push({ role: 'user', text: userMessage });
  history.push({ role: 'model', text: clean });
  if (history.length > 20) history.splice(0, history.length - 20);
  xiaocaiHistory.set(chatId, history);

  return clean;
}
