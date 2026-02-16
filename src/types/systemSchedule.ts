/**
 * SystemSchedule（系統排程）資料模型
 * 對應 OpenClaw 的 cron job，唯讀顯示於任務板
 */

export interface SystemSchedule {
  id: string;
  name: string;
  /** 是否啟用 */
  enabled: boolean;
  /** 排程類型：cron 或 interval */
  scheduleKind: 'cron' | 'interval' | 'every';
  /** cron 表達式（如 0 9 * * *） */
  scheduleExpr?: string;
  /** 時間間隔（毫秒）- 用於 every 類型 */
  everyMs?: number;
  /** 時區 */
  timezone?: string;
  /** 下次執行時間（ISO 字串） */
  nextRunAt: string | null;
  /** 上次執行時間（ISO 字串） */
  lastRunAt?: string | null;
  /** 最後執行狀態 */
  lastStatus?: 'ok' | 'failed' | 'running' | null;
  /** 最後錯誤訊息 */
  lastError?: string | null;
  /** 連續錯誤次數 */
  consecutiveErrors?: number;
  /** 任務描述（從 payload 提取） */
  description?: string;
  /** 來源 agent */
  agentId: string;
  /** session 目標（main/isolated） */
  sessionTarget?: 'main' | 'isolated' | null;
  /** payload 類型（systemEvent/agentTurn） */
  payloadKind?: 'systemEvent' | 'agentTurn' | null;
  /** 指定模型（若有） */
  model?: string | null;
  /** 執行 timeout 秒數（若有） */
  timeoutSeconds?: number | null;
  /** 建立時間 */
  createdAt: string;
  /** 更新時間 */
  updatedAt: string;
}
