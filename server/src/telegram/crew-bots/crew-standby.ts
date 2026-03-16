/**
 * 蝦蝦團隊 — Standby Bot 自動啟動管理
 * Standby Bot：商業自動化 + 數據分析
 *
 * 觸發方式：
 * 1. 事件驅動（其他 bot 偵測到需要 standby bot 的場景）
 * 2. 定時排程（每日/每週報告）
 * 3. 手動呼叫（orchestrator 指派）
 */

import { createLogger } from '../../logger.js';
import { STANDBY_CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
import { spawnStandbyBot } from './crew-poller.js';
import type { StructuredTask } from './crew-poller.js';

const log = createLogger('crew-standby');

// ── 排程狀態 ──
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastDailyReport = 0;    // 每日報告
let lastWeeklyAudit = 0;    // 每週審計

// ── Task ID 計數器 ──
let taskCounter = 0;
function nextTaskId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++taskCounter}`;
}

// ── 阿商 Trigger Functions ──

/** 觸發阿商：SaaS 工具評估 */
export async function triggerSaasAudit(context?: string): Promise<string> {
  const task: StructuredTask = {
    id: nextTaskId('saas-audit'),
    description: '審查目前使用的 SaaS 工具和訂閱服務，評估 ROI，找出可優化或替代的選項',
    assignedTo: 'ashang',
    expectedOutput: '每個工具的 ROI 評估表（月費 vs 節省時間），以及建議取消/替換/升級的清單',
    context: context || '請查詢系統目前使用的服務：Zeabur(n8n)、Supabase、Telegram Bot API、Google AI。評估每個的必要性和替代方案。',
  };
  log.info(`[StandbyTrigger] 觸發阿商 SaaS 審計: ${task.id}`);
  return spawnStandbyBot('ashang', task);
}

/** 觸發阿商：n8n Workflow 設計建議 */
export async function triggerWorkflowDesign(processDescription: string): Promise<string> {
  const task: StructuredTask = {
    id: nextTaskId('workflow-design'),
    description: `設計自動化 workflow：${processDescription}`,
    assignedTo: 'ashang',
    expectedOutput: 'n8n workflow 設計方案，包含：觸發條件、節點流程、預期效果、實作難度評估',
    context: `n8n URL: https://sky770825.zeabur.app\n現有 workflow 可透過 API 查詢。\n需求：${processDescription}`,
  };
  log.info(`[StandbyTrigger] 觸發阿商 workflow 設計: ${task.id}`);
  return spawnStandbyBot('ashang', task);
}

/** 觸發阿商：自動化機會掃描（發現重複手動操作時） */
export async function triggerAutomationScan(repetitivePattern: string): Promise<string> {
  const task: StructuredTask = {
    id: nextTaskId('automation-scan'),
    description: `分析重複操作模式，設計自動化方案：${repetitivePattern}`,
    assignedTo: 'ashang',
    expectedOutput: '自動化方案：從手動→半自動→全自動的三階段計畫，含 ROI 估算',
    context: repetitivePattern,
  };
  log.info(`[StandbyTrigger] 觸發阿商自動化掃描: ${task.id}`);
  return spawnStandbyBot('ashang', task);
}

// ── 阿數 Trigger Functions ──

/** 觸發阿數：深度數據分析（metrics 異常時自動觸發） */
export async function triggerDataAnalysis(anomalyDescription: string): Promise<string> {
  const task: StructuredTask = {
    id: nextTaskId('data-analysis'),
    description: `深度分析數據異常：${anomalyDescription}`,
    assignedTo: 'ashu',
    expectedOutput: '根因分析 + 趨勢圖描述 + 建議的閾值調整 + 後續監控重點',
    context: `你的回覆必須包含以下 action JSON：\n` +
      `{"action":"query_supabase","table":"openclaw_tasks","select":"status,created_at,updated_at","filters":[],"limit":100}\n` +
      `{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}\n\n` +
      `拿到數據後，針對以下異常做深度分析：${anomalyDescription}`,
  };
  log.info(`[StandbyTrigger] 觸發阿數數據分析: ${task.id}`);
  return spawnStandbyBot('ashu', task);
}

/** 觸發阿數：Supabase 深度查詢 */
export async function triggerDeepQuery(query: string): Promise<string> {
  const task: StructuredTask = {
    id: nextTaskId('deep-query'),
    description: `執行深度數據查詢：${query}`,
    assignedTo: 'ashu',
    expectedOutput: '查詢結果表格 + 統計摘要 + 數據洞察',
    context: `你的回覆必須包含以下 action JSON（根據需求修改 table/select/filters）：\n` +
      `{"action":"query_supabase","table":"openclaw_tasks","select":"*","filters":[],"limit":200}\n\n` +
      `查詢需求：${query}`,
  };
  log.info(`[StandbyTrigger] 觸發阿數深度查詢: ${task.id}`);
  return spawnStandbyBot('ashu', task);
}

/** 觸發阿數：每日數據洞察報告 */
export async function triggerDailyInsightReport(): Promise<string> {
  const task: StructuredTask = {
    id: nextTaskId('daily-insight'),
    description: '產出每日數據洞察報告：任務完成率、API 健康度、系統效能趨勢',
    assignedTo: 'ashu',
    expectedOutput: '每日數據報告：1) 今日任務統計 2) API 回應速度 3) 異常事件 4) 趨勢洞察 5) 明日建議',
    context: `你的回覆必須包含以下 action JSON：\n` +
      `{"action":"query_supabase","table":"openclaw_tasks","select":"id,status,created_at,updated_at","filters":[],"limit":200}\n` +
      `{"action":"run_script","command":"curl -s http://localhost:3011/api/health"}\n` +
      `{"action":"run_script","command":"tail -100 ~/.openclaw/logs/server.log | grep -c -i error"}\n\n` +
      `拿到數據後，產出完整的每日數據洞察報告。用數據說話，不要空泛的描述。`,
  };
  log.info(`[StandbyTrigger] 觸發阿數每日報告: ${task.id}`);
  return spawnStandbyBot('ashu', task);
}

// ── 排程系統 ──

/** 啟動 standby bot 排程（每小時檢查一次是否需要觸發定時任務） */
export function startStandbyScheduler(): void {
  if (!CREW_GROUP_CHAT_ID) {
    log.warn('[StandbyScheduler] 無 CREW_GROUP_CHAT_ID，跳過');
    return;
  }

  if (STANDBY_CREW_BOTS.length === 0) {
    log.warn('[StandbyScheduler] 無 standby bot，跳過');
    return;
  }

  // 每小時檢查一次排程
  schedulerTimer = setInterval(() => {
    checkScheduledTasks().catch(err =>
      log.error({ err }, '[StandbyScheduler] 排程檢查失敗')
    );
  }, 60 * 60 * 1000); // 1 hour

  log.info(`[StandbyScheduler] 已啟動，管理 ${STANDBY_CREW_BOTS.length} 個 standby bot 的排程任務`);
}

/** 停止排程 */
export function stopStandbyScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  log.info('[StandbyScheduler] 已停止');
}

/** 檢查是否有排程任務需要執行 */
async function checkScheduledTasks(): Promise<void> {
  const now = Date.now();
  const hour = new Date().getHours();  // Local hour (Taipei = UTC+8)
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon

  // 阿數：每日 09:00 數據洞察報告（間隔至少 20 小時）
  if (hour === 9 && now - lastDailyReport > 20 * 60 * 60 * 1000) {
    log.info('[StandbyScheduler] 觸發阿數每日報告');
    lastDailyReport = now;
    await triggerDailyInsightReport().catch(err =>
      log.error({ err }, '[StandbyScheduler] 阿數每日報告失敗')
    );
  }

  // 阿商：每週一 10:00 SaaS 成本審計（間隔至少 6 天）
  if (dayOfWeek === 1 && hour === 10 && now - lastWeeklyAudit > 6 * 24 * 60 * 60 * 1000) {
    log.info('[StandbyScheduler] 觸發阿商每週審計');
    lastWeeklyAudit = now;
    await triggerSaasAudit().catch(err =>
      log.error({ err }, '[StandbyScheduler] 阿商每週審計失敗')
    );
  }
}

// ── 智能路由：根據訊息內容判斷是否需要啟動 standby bot ──

/** 分析訊息是否需要 standby bot 介入，若需要則自動 spawn */
export async function checkStandbyNeed(text: string): Promise<{ triggered: boolean; botId?: string; result?: string }> {
  // 阿商觸發詞
  const ashangTriggers = [
    /saas|訂閱|subscription/i,
    /roi|投資報酬|成本效益/i,
    /n8n.*(?:workflow|流程|設計)/i,
    /自動化.*(?:方案|建議|設計)/i,
    /工具.*(?:評估|比較|推薦)/i,
    /zapier|make\.com|自動化平台/i,
  ];

  // 阿數觸發詞
  const ashuTriggers = [
    /數據.*(?:分析|報告|洞察|趨勢)/i,
    /(?:查詢|sql|query).*(?:supabase|資料庫)/i,
    /(?:統計|metrics|指標).*(?:分析|報告)/i,
    /(?:異常|anomaly).*(?:數據|data)/i,
    /圖表|dashboard|儀表板/i,
    /任務完成率|成功率|錯誤率/i,
  ];

  for (const pattern of ashangTriggers) {
    if (pattern.test(text)) {
      log.info(`[StandbyCheck] 訊息匹配阿商觸發詞: ${pattern.source}`);
      const result = await triggerAutomationScan(text);
      return { triggered: true, botId: 'ashang', result };
    }
  }

  for (const pattern of ashuTriggers) {
    if (pattern.test(text)) {
      log.info(`[StandbyCheck] 訊息匹配阿數觸發詞: ${pattern.source}`);
      const result = await triggerDataAnalysis(text);
      return { triggered: true, botId: 'ashu', result };
    }
  }

  return { triggered: false };
}

// ── 狀態查詢 ──

export function getStandbySchedulerStatus() {
  return {
    running: schedulerTimer !== null,
    standbyBots: STANDBY_CREW_BOTS.map(b => ({
      id: b.id,
      name: b.name,
      role: b.role,
      hasToken: !!b.token,
    })),
    lastDailyReport: lastDailyReport ? new Date(lastDailyReport).toISOString() : null,
    lastWeeklyAudit: lastWeeklyAudit ? new Date(lastWeeklyAudit).toISOString() : null,
  };
}
