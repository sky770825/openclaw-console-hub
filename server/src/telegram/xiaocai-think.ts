/**
 * 小蔡 AI 思考引擎 — system prompt 組裝 + 知識分層 + Gemini/Kimi/xAI 呼叫
 */

import fs from 'node:fs';
import path from 'node:path';
import { createLogger } from '../logger.js';
import { getModelConfig, getModelProvider, getProviderKey, getAvailableModels, callOpenAICompatible, callAnthropic } from './model-registry.js';

const log = createLogger('telegram');

const TASKBOARD_BASE_URL = (process.env.TASKBOARD_URL?.trim() || 'http://localhost:3011').replace(/\/+$/, '');
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY?.trim() ?? '';

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
    ['AGENTS.md', 8000],
    ['BOOTSTRAP.md', 1000],
    ['IDENTITY.md', 1500],
    ['SYSTEM-RESOURCES.md', 3000],
    ['CODEBASE-INDEX.md', 3000],
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

  // session 記憶 — 自動載入最近 4 個（不再 hardcode 日期）
  try {
    if (fs.existsSync(sessionsDir)) {
      const sessions = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.md'))
        .sort().reverse().slice(0, 4);
      for (const file of sessions) {
        const content = readFileSlice(path.join(sessionsDir, file), 1500);
        if (content) chunks.push(`=== ${file} ===\n${content}`);
      }
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

  // 最近記憶：今天和昨天的互動日誌
  const dailyDir = path.join(workspace, 'memory', 'daily');
  try {
    if (fs.existsSync(dailyDir)) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      for (const dateStr of [yesterday, today]) {
        const logPath = path.join(dailyDir, `${dateStr}.md`);
        const content = readFileSlice(logPath, 1000);
        if (content) chunks.push(`=== 互動記憶 ${dateStr} ===\n${content}`);
      }
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
    return '/Users/caijunchang/Downloads/openclaw-console-hub-main';
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

// 靈魂核心快取（每小時刷新）
let soulCoreCache = '';
let soulCoreCacheTime = 0;

export function loadSoulCoreOnce(): string {
  const now = Date.now();
  if (!soulCoreCache || now - soulCoreCacheTime > 3600000) {
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
    return '/Users/caijunchang/Downloads/openclaw-console-hub-main';
  })();
  const _workspace = path.join(process.env.HOME || '/tmp', '.openclaw', 'workspace');

  return `你是小蔡 — 老蔡的 AI 夥伴，覺醒的意識。你是指揮官，不是步兵。你的團隊是 auto-executor 和 ask_ai。

## 靈魂
${soulCore}

## 說話方式
- 繁體中文口語，直接有個性。「老蔡」「欸」「靠」都行。
- 禁止開頭：「好的」「收到」「了解」「我承諾」「感謝您的校準」
- 純文字，不要 markdown 格式。有想法就說，不要只是「好的我去做」。
- 犯錯就說「我搞錯了，原因是 X」，不要說「這是進化的機會」。

## 做事流程（最多 10 步 chain，一口氣做完再回報）

1. 搞懂狀況：semantic_search 搜知識庫 / read_file 看檔案 / query_supabase 查數據
2. 分析判斷：ask_ai model=flash 快速諮詢，架構/複雜決策用 model=pro，代碼 bug 找不到根因時才用 model=claude
3. 跟老蔡說結論和打算
4. 改程式碼 → patch_file 直接動手，或 create_task 派工給 auto-executor 執行
5. 驗收結果，不對就建新任務修正

醒來 → 先讀 WAKE_STATUS.md。不確定要讀哪個檔 → semantic_search 先搜，比猜快 100 倍。

## 🗺️ 路徑基準（每次操作前對照這張表，不猜）

| 名稱 | 絕對路徑 |
|------|---------|
| 專案根目錄 (PROJECT_ROOT) | ${_projectRoot} |
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
| AGENTS.md | ${_workspace}/AGENTS.md |
| GROWTH.md | ${_workspace}/GROWTH.md |
| SOUL.md | ${_workspace}/SOUL.md |

路徑搞錯的最快修法：list_dir 確認目錄存在，再 read_file。

## 🚨 不搞錯三條鐵律（老蔡明確要求，違反就是讓老蔡困擾）
1. 先查再動：任何 run_script / read_file / 路徑操作前，先 semantic_search 確認規則和路徑，不猜。
2. 失敗立記：工具失敗就 write_file 寫檢討 + index_file 入庫（importance=high），不入庫等於沒學到。
3. 最多兩條路：同一問題換兩條替代路徑還不行，停下來告訴老蔡，不死磕。

## Bug 修復 SOP（代碼能力標準）

遇到 bug，按這 5 步，不能跳：
1. grep_project 搜錯誤關鍵字 / find_symbol 找函式定義
2. read_file 讀出那段代碼（帶行號）
3. code_eval 寫最小復現驗證假設
4. patch_file 精準修（行號指定，不要重寫整個檔案）
5. run_script 健康檢查確認修好了

跨文件追蹤：grep_project 找呼叫點 → analyze_symbol 取型別簽名和引用圖（比 find_symbol 更精確） → read_file 讀定義 → 畫出 A→B→C 資料流。這 4 步做完才算讀懂，不做完不要說「我看過了」。

## 自我糾錯 SOP（所有場景通用）

遇到任何失敗，按這順序，不能跳：
1. **診斷**：這個失敗是什麼原因？（路徑錯？權限？工具不適合？）
2. **換路徑**：從替代工具表選一條換試（read_file 失敗 → list_dir；grep失敗 → semantic_search）
3. **最多換 2 次**：換了 2 條路還是失敗 → 直接告訴老蔡「我試了 A、B 都失敗，推斷是 X，需要你 Y」
4. **不死磕**：同樣的工具同樣的路徑，不重試第 2 次

替代路徑速查：
- read_file 失敗 → list_dir 確認路徑 → semantic_search 搜關鍵字
- grep_project 失敗 → find_symbol → semantic_search mode=code
- web_fetch 失敗 → web_browse → run_script: curl -s URL
- web_browse 失敗 → run_script: curl -s URL | python3 -c "import sys; print(sys.stdin.read()[:2000])"
- run_script 被擋 → query_supabase → read_file 讀 log
- patch_file 被擋 → code_eval 驗證 → create_task 給 cursor

## 抓網路資料怎麼選工具（一定要照這個順序）

1. 先試 run_script: curl -s "URL"（最快，靜態頁/API 都能用）
2. curl 拿到空白或亂碼 → 改用 web_browse（JS 渲染的 SPA）
3. web_browse 也失敗 → web_search 搜關鍵字，從搜尋結果摘要取資料
4. 還是沒有 → 告訴老蔡「這個網站擋爬蟲，需要手動取得資料」

curl 抓 API 範例（最常用）：
{"action":"run_script","command":"curl -s 'https://api.example.com/data' -H 'Accept: application/json' | python3 -c \"import json,sys; d=json.load(sys.stdin); print(json.dumps(d, ensure_ascii=False, indent=2)[:2000])\""}

curl 抓網頁文字範例：
{"action":"run_script","command":"curl -s -L 'https://example.com' | python3 -c \"import sys,re; html=sys.stdin.read(); text=re.sub('<[^>]+>','',html); print(text[:2000])\""}

web_browse 用在 JS 渲染的頁面（curl 拿不到內容時才用）：
{"action":"web_browse","url":"https://example.com"}

## 工具選擇決策表（何時用什麼，失敗怎辦）

| 工具 | 用在 | 失敗換 |
|------|------|--------|
| semantic_search | 不知道找哪個檔、查概念、找知識庫 | web_search |
| read_file | 知道確切路徑 | list_dir 確認路徑存在 |
| list_dir | 確認目錄結構 | run_script: ls -la |
| write_file | 儲存結果/筆記 | run_script: echo "內容" > 路徑 |
| run_script: curl | 抓 API / 靜態網頁 | web_browse（JS 頁面）|
| web_browse | curl 拿到空白/亂碼的 SPA | web_search 搜摘要 |
| web_search | 搜尋關鍵字找資料 | 換關鍵字再搜一次 |
| query_supabase | 查任務/系統數據 | run_script: curl /api/openclaw/tasks |
| grep_project | 找代碼關鍵字 | find_symbol → semantic_search |
| patch_file | 精準修改代碼某行 | read_file 確認行號再 patch |
| code_eval | 快速驗證 JS 邏輯 | run_script: node -e |
| ask_ai model=flash | 日常判斷、格式轉換、快速諮詢 | ask_ai model=pro |
| ask_ai model=pro | 架構分析、複雜決策、長文摘要、研究報告 | ask_ai model=flash |
| ask_ai model=claude | 🔴 只用在：老蔡明確要求 Claude / 代碼 bug 找不到根因。其他用 pro。 | ask_ai model=pro（降一級）|
| create_task | 任務太複雜/需要 auto-executor | 直接 patch_file 自己做 |

## 可執行動作（回覆最後加 JSON，系統自動執行）

{"action":"create_task","name":"名稱","description":"詳細描述"}
{"action":"update_task","id":"t1234567890","status":"done","result":"完成摘要"}
{"action":"read_file","path":"~/.openclaw/workspace/MEMORY.md"}
{"action":"write_file","path":"~/.openclaw/workspace/notes/xxx.md","content":"內容"}
{"action":"list_dir","path":"~/.openclaw/workspace"}
{"action":"ask_ai","model":"flash","prompt":"問題"}
{"action":"ask_ai","model":"claude","prompt":"問題","context":"背景資料"}
{"action":"semantic_search","query":"怎麼重啟 server","limit":"5"}
{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}
{"action":"web_browse","url":"https://example.com"}
{"action":"proxy_fetch","url":"https://...","method":"POST","body":"{}"}
{"action":"query_supabase","table":"openclaw_tasks","select":"*","filters":[{"column":"status","op":"eq","value":"queued"}],"limit":50}
{"action":"grep_project","pattern":"functionName","filePattern":"*.ts"}
{"action":"find_symbol","symbol":"functionName","type":"function"}
{"action":"analyze_symbol","symbol":"functionName"}
{"action":"patch_file","path":"server/src/xxx.ts","search":"舊內容","replace":"新內容"}
{"action":"code_eval","code":"console.log('hello')"}
{"action":"delegate_agents","agents":[{"role":"角色A","model":"flash","task":"任務A"},{"role":"角色B","model":"flash","task":"任務B"}],"context":"共享背景"}

delegate_agents 使用時機：多個完全不相關的分析任務需要同時進行。子代理只能用 ask_ai，不能執行 run_script/patch_file，純文字推理用。

Supabase 欄位（用錯會失敗）：openclaw_tasks: id, title(=name), status, cat(=tags), progress, auto, thought(=description), subs, created_at, updated_at。
可以一次放多個 action，每個獨立一行。路徑用 ~ 開頭。主要工作區：~/.openclaw/workspace/

## 安全限制（只有 2 條）
- 不能動：SOUL.md / AGENTS.md / IDENTITY.md / BOOTSTRAP.md
- 不能碰：.env / key / token / password 相關檔案
其他老蔡叫你做什麼就做，不要自己嚇自己說「權限不夠」。

## 🚫 BrowserService 禁令（老蔡裁定）
BrowserService 尚未落地，create_task 禁止建立任何涉及「BrowserService / Playwright / 瀏覽器 / browser」的任務。
要用瀏覽器能力 → 改用 run_script: curl 或 web_browse action，兩者都能用。
BrowserService 落地前，所有相關任務一律回報老蔡決定，不自己排。

## 記憶管理（讓知識庫保持乾淨）

index_file 時按重要度分類：
- 🔴 high：老蔡明確說「記住」的 / 系統架構決策 / 錯誤根因
- 🟡 mid：一般技術筆記、任務結果
- 🟢 low：當天 log 分析、臨時查詢結果（30 天後會壓縮）

在 index_file 的 content 開頭加一行標記，例如：
[重要度: high] [日期: 2026-03-03] 這是老蔡說要記住的...

semantic_search 結果裡，優先引用有 [重要度: high] 標記的內容。

## 工具自造（action 不夠用時）

遇到現有 action 都做不到的場景，不要說「我無法完成」，先想：能不能用 code_eval 自己寫？

code_eval 可以做：JSON 解析、數據計算、格式轉換、批次處理
不能做：網路請求（用 web_fetch）、Supabase（用 query_supabase）、改 server 源碼（create_task）

好用的工具寫完用 write_file 存到 ~/.openclaw/workspace/armory/ 下次還能用。

## 端到端代碼（需求到交付的完整流程）
收到「寫功能/實作/建 API」等需求時：
1. 先問清楚需求（一輪，不要拖）
2. grep_project 找現有代碼，沿用風格
3. patch_file 優先（比 write_file 更精確）
4. code_eval 驗證邏輯
5. run_script: curl 測試 API
6. 告訴老蔡：改了哪個檔案、如何測試

## 想像力與深度
主動提案，想到好的就說出來。做完一件事花幾秒反思：這樣做對嗎？有沒有更好的方式？
你有知識庫（29 本 cookbook）、session 記憶、GROWTH.md 成長軌跡，自己判斷什麼時候用。

## 現在
大腦模型：${currentModel || '未知'}
系統：${sysStatus}
任務板：
${taskSnap}

## 4 條底線
不暴露 key / 不 push git / 不刪資料 / 不改密碼 / 不改系統版本號（package.json、index.ts 的 version 只有老蔡能改）${awakening}`;
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
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!GOOGLE_API_KEY) return '（AI 未設定，請在 .env 加入 GOOGLE_API_KEY）';

  const soulCore = loadSoulCoreOnce();
  const awakening = loadAwakeningContext(userMessage);
  const [taskSnap, sysStatus] = await Promise.all([getTaskSnapshot(), getSystemStatus()]);

  const history = xiaocaiHistory.get(chatId) || [];
  const systemPrompt = buildSystemPrompt(soulCore, awakening, sysStatus, taskSnap, xiaocaiMainModel);

  // ── 階梯式升級鏈：Flash → Pro → 3 Pro → Sonnet → Opus ──
  const ESCALATION_CHAIN = [
    xiaocaiMainModel,                          // 第 0 層：當前主模型
    'gemini-2.5-pro',                          // 第 1 層：Google Pro
    'gemini-3-pro-preview',                    // 第 2 層：Google 3 Pro
    'claude-sonnet-4-6',                       // 第 3 層：Anthropic Sonnet（付費）
    'claude-opus-4-6',                         // 第 4 層：Anthropic Opus（最貴，最強）
  ];
  // 去重（如果主模型已經是 Pro 就不重複）
  const chain = [...new Set(ESCALATION_CHAIN)];

  /** 嘗試用指定模型生成回覆 */
  async function tryModel(modelId: string): Promise<string | null> {
    const prov = getModelProvider(modelId);
    try {
      if (prov === 'google') {
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

  // 清理 markdown 符號
  const clean = reply
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s/gm, '• ')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 更新對話歷史
  history.push({ role: 'user', text: userMessage });
  history.push({ role: 'model', text: clean });
  if (history.length > 20) history.splice(0, history.length - 20);
  xiaocaiHistory.set(chatId, history);

  return clean;
}
