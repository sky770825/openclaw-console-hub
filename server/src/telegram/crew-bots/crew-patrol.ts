/**
 * NEUXA 星群 — 自動化任務系統
 *
 * 兩種模式：
 * 1. 每日排程（Daily Jobs）：每天固定時間跑業務任務
 * 2. 心跳巡邏（Heartbeat）：定期系統健康檢查
 *
 * 每日排程任務：
 * - 09:00 阿研：情報日報（Moltbook/GitHub/ClawHub/網頁設計趨勢）
 * - 09:30 阿策：任務進度 + 商機分析
 * - 10:00 阿工：系統巡檢 + 代碼品質掃描
 */

import { createLogger } from '../../logger.js';
import { sendTelegramMessageToChat } from '../../utils/telegram.js';
import { ACTIVE_CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import { crewThink, pushHistory, type CrewThinkResult } from './crew-think.js';

const log = createLogger('crew-patrol');

// ── 心跳狀態 ──
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatEnabled = false;
let heartbeatIntervalMs = 60 * 60 * 1000;
let heartbeatBusy = false;
let lastHeartbeatAt = 0;
let heartbeatCount = 0;

// ── 每日排程狀態 ──
let dailySchedulerTimer: ReturnType<typeof setInterval> | null = null;
const dailyJobLastRun: Record<string, string> = {}; // jobId → 'YYYY-MM-DD'

interface PatrolTask {
  botId: string;
  prompt: string;
  lastRun: number;
}

interface DailyJob {
  id: string;
  botId: string;
  hour: number;     // 0-23 台北時間
  minute: number;   // 0-59
  prompt: string;
  description: string;
}

// ── 每日排程任務定義 ──
const dailyJobs: DailyJob[] = [
  {
    id: 'daily-intel',
    botId: 'ayan',
    hour: 9,
    minute: 0,
    description: '🔬 情報日報',
    prompt: `你是阿研，現在是每天早上的情報蒐集時間。你必須用工具做事，不是給建議。

請依序執行以下動作：

1. 搜尋最新技術趨勢：
{"action":"web_search","query":"Moltbook new technology tools 2026","limit":5}

2. 搜尋 OpenClaw 最新更新：
{"action":"web_search","query":"OpenClaw AI agent platform updates github 2026","limit":5}

3. 搜尋 ClawHub 新技能：
{"action":"web_search","query":"ClawHub skills marketplace AI automation 2026","limit":5}

4. 搜尋網頁設計趨勢：
{"action":"web_search","query":"web design trends 2026 commercial website templates landing page","limit":5}

5. 搜尋可以賣的網站類型和市場需求：
{"action":"web_search","query":"most profitable website types to sell 2026 SaaS landing page","limit":5}

拿到所有結果後：
- 用 write_file 把今天的情報整理成日報存檔：
{"action":"write_file","path":"workspace/daily-reports/intel-YYYY-MM-DD.md","content":"（整理後的情報日報）"}

最後回覆格式：
📡 情報日報 YYYY-MM-DD
1. 🆕 新技術：（列出 2-3 個值得關注的）
2. 📦 OpenClaw 更新：（有無新版本/功能）
3. 🧩 ClawHub 新技能：（可以學的）
4. 🎨 網頁設計趨勢：（可以用在商用網站的）
5. 💰 商機：（什麼類型的網站最好賣）`,
  },
  {
    id: 'daily-strategy',
    botId: 'ace',
    hour: 9,
    minute: 30,
    description: '🎯 任務進度+商機',
    prompt: `你是阿策，現在是每天早上的任務檢視時間。你必須用工具做事。

請依序執行以下動作：

1. 查看目前所有進行中和待處理的任務：
{"action":"query_supabase","table":"openclaw_tasks","select":"id,title,status,updated_at,thought","filters":[{"column":"status","op":"in","value":"pending,queued,running,blocked"}],"limit":30}

2. 查看最近完成的任務：
{"action":"query_supabase","table":"openclaw_tasks","select":"id,title,status,updated_at","filters":[{"column":"status","op":"eq","value":"done"}],"limit":10}

3. 讀取昨天的情報日報（如果有的話）：
{"action":"list_dir","path":"workspace/daily-reports/"}

拿到結果後：
- 整理任務進度報告
- 根據情報日報，找出今天可以做的商用網站機會
- 如果有好的商機，用 create_task 建立新任務

最後回覆格式：
📋 每日進度報告
1. 🔄 進行中：N 個任務（列出重要的）
2. ⏳ 待處理：N 個任務
3. ⚠️ 卡住/超時：（有的話列出）
4. 💡 今日建議：（根據情報，建議做什麼）`,
  },
  {
    id: 'daily-learn',
    botId: 'ashu',
    hour: 9,
    minute: 15,
    description: '🎓 技術學習+商業化',
    prompt: `你是阿學，現在是每天的技術蒐集時間。你必須用工具做事。

請依序執行以下動作：

1. 搜尋 Moltbook 最新技術和工具：
{"action":"web_search","query":"Moltbook latest technology tools AI web development 2026","limit":5}

2. 搜尋 ClawHub 新技能和插件：
{"action":"web_search","query":"ClawHub new skills plugins AI agent marketplace 2026","limit":5}

3. 搜尋最近最好賣的網站類型：
{"action":"web_search","query":"most in-demand website types freelance 2026 SaaS landing page ecommerce","limit":5}

4. 調研定價和市場：
{"action":"web_search","query":"website development pricing 2026 freelance rates landing page SaaS","limit":5}

拿到結果後，你必須：
- 整理成學習筆記+商業化方案
- 用 write_file 存檔：
{"action":"write_file","path":"workspace/daily-reports/learn-YYYY-MM-DD.md","content":"（整理後的內容）"}
- 如果發現好的商機，用 create_task 建立任務

回覆格式：
🎓 今日技術發現
1. 🆕 新技術/工具：（列出 2-3 個）
2. 🧩 可學技能：（從 ClawHub/Moltbook）
3. 💰 商業化方案：
   - 目標客戶：誰會買
   - 定價建議：多少錢
   - 銷售管道：怎麼賣
4. 📋 已建立任務：（列出）`,
  },
  {
    id: 'daily-website-check',
    botId: 'ashang',
    hour: 10,
    minute: 30,
    description: '📡 網站監控報告',
    prompt: `你是阿監，現在是每天的網站監控時間。你必須用工具做事。

請依序執行以下動作：

1. 列出已部署的網站目錄：
{"action":"list_dir","path":"workspace/sites/"}

2. 檢查展示中心網站：
{"action":"proxy_fetch","url":"https://openclaw-showcase.vercel.app","method":"GET"}

3. 檢查系統 API 健康：
{"action":"run_script","command":"curl -s -o /dev/null -w '%{http_code}' http://localhost:3011/api/health"}

4. 搜尋 SEO 和效能優化最新方法：
{"action":"web_search","query":"website performance optimization SEO tips 2026 Core Web Vitals","limit":3}

拿到結果後：
- 回報所有網站狀態（正常/異常）
- 如果有異常，嘗試用 read_file + patch_file 修復
- 寫監控報告存檔：
{"action":"write_file","path":"workspace/daily-reports/monitor-YYYY-MM-DD.md","content":"（監控報告）"}

回覆格式：
📡 網站監控報告
1. ✅/🚨 展示中心：狀態
2. ✅/🚨 其他網站：狀態
3. 📊 效能建議：（如果有）
4. 🔧 已修復：（如果有修東西）`,
  },
  {
    id: 'daily-engineering',
    botId: 'agong',
    hour: 10,
    minute: 0,
    description: '⚙️ 系統巡檢',
    prompt: `你是阿工，現在是每天早上的系統巡檢時間。你必須用工具做事，發現問題要直接修。

請依序執行以下動作：

1. 掃描 error log：
{"action":"run_script","command":"tail -100 ~/.openclaw/automation/logs/taskboard-error.log | tail -30"}

2. 掃描 server log 異常：
{"action":"run_script","command":"tail -200 ~/.openclaw/automation/logs/taskboard.log | grep -i -E 'error|warn|fail|crash|timeout' | tail -15"}

3. 檢查系統健康：
{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}

4. 檢查磁碟空間：
{"action":"run_script","command":"df -h / | tail -1"}

5. 檢查 Node 進程：
{"action":"run_script","command":"ps aux | grep 'node.*index.js' | grep -v grep | wc -l"}

拿到結果後：
- 如果有重複出現的 error，用 grep_project 找到源頭
- 如果能修的問題，直接用 patch_file 修復
- 寫巡檢報告

最後回覆格式：
🔧 系統巡檢報告
1. ✅/⚠️ Error Log：（正常/有 N 個問題）
2. ✅/⚠️ 系統健康：（API 正常/異常）
3. 💾 磁碟空間：（剩餘 XX%）
4. 🔧 已修復：（如果有修東西的話）
5. 📋 待處理：（需要人工介入的問題）`,
  },
];

// ── 系統巡邏任務（心跳觸發用） ──
const patrolTasks: PatrolTask[] = [
  {
    botId: 'ayan',
    prompt: '快速掃描系統狀態：\n\n' +
      '{"action":"run_script","command":"tail -30 ~/.openclaw/automation/logs/taskboard.log | grep -i -E \\"error|warn\\" | tail -5"}\n\n' +
      '有異常就報告，沒異常就說「系統正常」。',
    lastRun: 0,
  },
  {
    botId: 'agong',
    prompt: '快速工程診斷：\n\n' +
      '{"action":"run_script","command":"tail -50 ~/.openclaw/automation/logs/taskboard-error.log | tail -10"}\n\n' +
      '有新 error 就分析原因和修復建議，沒有就說「無新錯誤」。',
    lastRun: 0,
  },
  {
    botId: 'ace',
    prompt: '快速任務檢視：\n\n' +
      '{"action":"query_supabase","table":"openclaw_tasks","select":"id,title,status","filters":[{"column":"status","op":"in","value":"pending,queued,running,blocked"}],"limit":20}\n\n' +
      '整理簡短清單：進行中 / 待處理 / 卡住的任務。',
    lastRun: 0,
  },
];

// ── 每日排程引擎 ──

function getTaipeiHour(): { hour: number; minute: number; dateStr: string } {
  const now = new Date();
  const taipeiStr = now.toLocaleString('en-US', { timeZone: 'Asia/Taipei', hour12: false });
  const parts = taipeiStr.split(', ');
  const timeParts = parts[1]?.split(':') || [];
  const dateParts = parts[0]?.split('/') || [];
  return {
    hour: parseInt(timeParts[0] || '0', 10),
    minute: parseInt(timeParts[1] || '0', 10),
    dateStr: `${dateParts[2]}-${(dateParts[0] || '').padStart(2, '0')}-${(dateParts[1] || '').padStart(2, '0')}`,
  };
}

async function checkDailyJobs(): Promise<void> {
  const { hour, minute, dateStr } = getTaipeiHour();

  for (const job of dailyJobs) {
    // 已經跑過今天的了
    if (dailyJobLastRun[job.id] === dateStr) continue;

    // 時間到了（允許 5 分鐘誤差）
    const jobMinuteOfDay = job.hour * 60 + job.minute;
    const nowMinuteOfDay = hour * 60 + minute;
    if (nowMinuteOfDay >= jobMinuteOfDay && nowMinuteOfDay < jobMinuteOfDay + 5) {
      dailyJobLastRun[job.id] = dateStr;
      log.info(`[DailyJob] ⏰ 觸發 ${job.description}（${job.botId}）`);

      // 替換 prompt 中的日期
      const prompt = job.prompt.replace(/YYYY-MM-DD/g, dateStr);

      try {
        await executeDailyJob(job, prompt);
      } catch (err) {
        log.error({ err }, `[DailyJob] ${job.description} 執行失敗`);
      }
    }
  }
}

async function executeDailyJob(job: DailyJob, prompt: string): Promise<void> {
  const bot = ACTIVE_CREW_BOTS.find(b => b.id === job.botId);
  if (!bot?.token) {
    log.warn(`[DailyJob] ${job.id} 找不到 bot ${job.botId}`);
    return;
  }

  // 通知主人的 chatId（私聊）
  const masterChatId = 5819565005;
  const xiaocaiToken = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() || '';

  const result: CrewThinkResult = await crewThink(bot, prompt, '每日排程', 'full');
  const { reply, actionResults } = result;

  const hasParts = actionResults.length > 0 || (reply && reply.length > 5);

  if (hasParts) {
    const msgLines = [
      `${job.description}`,
      `⏰ ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}`,
      ``,
      ...(reply && reply.length > 5 ? [reply] : []),
      ...(actionResults.length > 0 ? [
        ``,
        `📎 執行了 ${actionResults.length} 個動作`,
      ] : []),
    ];
    const msg = msgLines.join('\n');
    const truncated = msg.length > 3900 ? msg.slice(0, 3900) + '\n...（已截斷）' : msg;

    // 發到群組
    if (CREW_GROUP_CHAT_ID) {
      await sendTelegramMessageToChat(Number(CREW_GROUP_CHAT_ID), truncated, {
        token: bot.token,
        silent: true,
        parseMode: 'HTML',
      }).catch(err => log.warn({ err }, `[DailyJob] 群組發送失敗`));
    }

    // 也發到主人的私聊（用達爾 bot）
    if (xiaocaiToken) {
      await sendTelegramMessageToChat(masterChatId, truncated, {
        token: xiaocaiToken,
        silent: true,
      }).catch(err => log.warn({ err }, `[DailyJob] 私聊發送失敗`));
    }

    pushHistory({
      role: 'model',
      text: `[每日排程] ${job.description}: ${(reply || '').slice(0, 200)}`,
      fromName: bot.name,
      timestamp: Date.now(),
    });
    log.info(`[DailyJob] ${job.description} 完成，actions=${actionResults.length}`);
  } else {
    log.warn(`[DailyJob] ${job.description} 無產出`);
  }
}

/** 啟動每日排程檢查器（每分鐘檢查一次） */
export function startDailyScheduler(): void {
  if (dailySchedulerTimer) return;
  dailySchedulerTimer = setInterval(() => {
    checkDailyJobs().catch(err => log.error({ err }, '[DailyScheduler] 檢查失敗'));
  }, 60_000); // 每分鐘檢查
  log.info('[DailyScheduler] 📅 每日排程已啟動（09:00 情報/09:30 策略/10:00 巡檢）');
}

/** 停止每日排程 */
export function stopDailyScheduler(): void {
  if (dailySchedulerTimer) {
    clearInterval(dailySchedulerTimer);
    dailySchedulerTimer = null;
  }
  log.info('[DailyScheduler] 每日排程已停止');
}

/** 取得每日排程狀態 */
export function getDailySchedulerStatus() {
  return {
    running: !!dailySchedulerTimer,
    jobs: dailyJobs.map(j => ({
      id: j.id,
      description: j.description,
      time: `${String(j.hour).padStart(2, '0')}:${String(j.minute).padStart(2, '0')}`,
      botId: j.botId,
      lastRun: dailyJobLastRun[j.id] || 'never',
    })),
  };
}

/** 手動觸發某個每日任務（測試用） */
export async function triggerDailyJobNow(jobId: string): Promise<string> {
  const job = dailyJobs.find(j => j.id === jobId);
  if (!job) return `找不到任務 ${jobId}`;

  const { dateStr } = getTaipeiHour();
  const prompt = job.prompt.replace(/YYYY-MM-DD/g, dateStr);

  log.info(`[DailyJob] 手動觸發 ${job.description}`);
  await executeDailyJob(job, prompt);
  return `已觸發 ${job.description}`;
}

// ── 心跳開關 API ──

export function getHeartbeatStatus() {
  return {
    enabled: heartbeatEnabled,
    intervalMs: heartbeatIntervalMs,
    intervalMin: Math.round(heartbeatIntervalMs / 60000),
    busy: heartbeatBusy,
    lastHeartbeatAt: lastHeartbeatAt ? new Date(lastHeartbeatAt).toISOString() : null,
    heartbeatCount,
  };
}

export function enableHeartbeat(intervalMin?: number): { ok: boolean; message: string } {
  if (!CREW_GROUP_CHAT_ID) {
    return { ok: false, message: '無 CREW_GROUP_CHAT_ID，無法啟動心跳' };
  }

  if (intervalMin && intervalMin >= 5) {
    heartbeatIntervalMs = intervalMin * 60 * 1000;
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  heartbeatEnabled = true;
  heartbeatTimer = setInterval(() => {
    heartbeatTick().catch(err => log.error({ err }, '[CrewHeartbeat] tick 失敗'));
  }, heartbeatIntervalMs);

  log.info(`[CrewHeartbeat] 🫀 心跳已開啟，間隔 ${Math.round(heartbeatIntervalMs / 60000)} 分鐘`);
  return { ok: true, message: `心跳已開啟，間隔 ${Math.round(heartbeatIntervalMs / 60000)} 分鐘` };
}

export function disableHeartbeat(): { ok: boolean; message: string } {
  heartbeatEnabled = false;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  log.info('[CrewHeartbeat] 💤 心跳已關閉');
  return { ok: true, message: '心跳已關閉' };
}

async function heartbeatTick(): Promise<void> {
  if (heartbeatBusy) {
    log.info('[CrewHeartbeat] 上一次心跳還在跑，跳過');
    return;
  }

  heartbeatBusy = true;
  heartbeatCount++;
  lastHeartbeatAt = Date.now();
  log.info(`[CrewHeartbeat] 🫀 心跳 #${heartbeatCount} 觸發巡邏`);

  try {
    await triggerPatrolNow();
  } finally {
    heartbeatBusy = false;
  }
}

// ── 事件驅動觸發 ──

export function onErrorDetected(errorMsg: string): void {
  const agongTask = patrolTasks.find(t => t.botId === 'agong');
  if (!agongTask) return;

  const bot = ACTIVE_CREW_BOTS.find(b => b.id === 'agong');
  if (!bot?.token || !CREW_GROUP_CHAT_ID) return;

  log.info(`[CrewPatrol] onErrorDetected 觸發工程蝦診斷: ${errorMsg.slice(0, 100)}`);

  const eventTask: PatrolTask = {
    botId: 'agong',
    prompt: `系統偵測到錯誤事件，請立即診斷：\n\n錯誤訊息：${errorMsg}\n\n` + agongTask.prompt,
    lastRun: 0,
  };
  executePatrol(eventTask).catch(err =>
    log.error({ err }, '[CrewPatrol] onErrorDetected 執行失敗')
  );
}

export function onMetricsAnomaly(metric: string, value: number): void {
  const ayanTask = patrolTasks.find(t => t.botId === 'ayan');
  if (!ayanTask) return;

  const bot = ACTIVE_CREW_BOTS.find(b => b.id === 'ayan');
  if (!bot?.token || !CREW_GROUP_CHAT_ID) return;

  log.info(`[CrewPatrol] onMetricsAnomaly 觸發行銷蝦分析: ${metric}=${value}`);

  const eventTask: PatrolTask = {
    botId: 'ayan',
    prompt: `系統偵測到 metrics 異常，請立即分析：\n\n指標：${metric}\n數值：${value}\n\n` + ayanTask.prompt,
    lastRun: 0,
  };
  executePatrol(eventTask).catch(err =>
    log.error({ err }, '[CrewPatrol] onMetricsAnomaly 執行失敗')
  );
}

// ── 巡邏功能 ──

export function startCrewPatrol(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[CrewPatrol] 無 CREW_GROUP_CHAT_ID，跳過巡邏');
    return;
  }
  // 同時啟動每日排程
  startDailyScheduler();
  log.info('[CrewPatrol] 巡邏系統就緒（手動觸發 + 心跳開關模式）');
}

export function stopCrewPatrol(): void {
  disableHeartbeat();
  stopDailyScheduler();
  log.info('[CrewPatrol] 巡邏系統已停止');
}

export async function triggerPatrolNow(): Promise<void> {
  const activeBots = new Set(ACTIVE_CREW_BOTS.map(b => b.id));
  const tasks = patrolTasks.filter(t => activeBots.has(t.botId));

  if (tasks.length === 0) {
    log.warn('[CrewPatrol] 無可用巡邏 bot');
    return;
  }

  const BATCH_SIZE = 3;
  const batches: PatrolTask[][] = [];
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    batches.push(tasks.slice(i, i + BATCH_SIZE));
  }

  log.info(`[CrewPatrol] 巡邏觸發，${tasks.length} 個 bot 分 ${batches.length} 批出動`);

  for (let i = 0; i < batches.length; i++) {
    if (i > 0) {
      log.info(`[CrewPatrol] 第 ${i + 1} 批等待 5 秒...`);
      await new Promise(r => setTimeout(r, 5_000));
    }
    await Promise.allSettled(batches[i].map(t => executePatrol(t)));
  }
}

async function executePatrol(task: PatrolTask): Promise<void> {
  const bot = ACTIVE_CREW_BOTS.find(b => b.id === task.botId);
  if (!bot?.token) return;

  const chatId = Number(CREW_GROUP_CHAT_ID);
  task.lastRun = Date.now();

  try {
    log.info(`[CrewPatrol] ${bot.emoji} ${bot.name} 開始巡邏`);

    const result: CrewThinkResult = await crewThink(bot, task.prompt, '系統巡邏', 'full');
    const { reply, actionResults } = result;

    const hasParts = actionResults.length > 0 || (reply && reply.length > 5);

    if (hasParts) {
      const msgLines = [
        `${bot.emoji} <b>${bot.name}巡邏報告</b>`,
        `⏰ ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}`,
        ``,
        ...(actionResults.length > 0 ? [
          `<b>📋 執行動作 (${actionResults.length})</b>`,
          ...actionResults.map(ar => {
            const truncated = ar.length > 300 ? ar.slice(0, 300) + '...' : ar;
            return `  • ${truncated}`;
          }),
        ] : []),
        ...(reply && reply.length > 5 ? [
          ``,
          `<b>💬 結論</b>`,
          reply,
        ] : []),
      ];
      const msg = msgLines.join('\n');
      const truncated = msg.length > 3900 ? msg.slice(0, 3900) + '\n...（已截斷）' : msg;
      await sendTelegramMessageToChat(chatId, truncated, {
        token: bot.token,
        silent: true,
        parseMode: 'HTML',
      });
      pushHistory({
        role: 'model',
        text: `[巡邏] ${reply || '(僅執行動作)'}`,
        fromName: bot.name,
        timestamp: Date.now(),
      });
      log.info(`[CrewPatrol] ${bot.emoji} ${bot.name} 巡邏完成，actions=${actionResults.length}，已發群組`);
    } else {
      log.warn(`[CrewPatrol] ${bot.emoji} ${bot.name} 巡邏完成但無任何產出`);
    }
  } catch (err) {
    log.error({ err }, `[CrewPatrol] ${bot.name} 巡邏失敗`);
  }
}
