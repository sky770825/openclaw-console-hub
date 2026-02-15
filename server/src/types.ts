/** 與前端 src/types 對齊的簡化型別 */

export type TaskStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'review'
  | 'done'
  | 'blocked';
export type ScheduleType = 'cron' | 'interval' | 'webhook' | 'manual';
export type Priority = 1 | 2 | 3 | 4 | 5;
export type TaskComplexity = 'S' | 'M' | 'L' | 'XL';
export type TaskRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'research' | 'development' | 'ops' | 'review' | 'other';
export type TaskModelProvider = 'openrouter' | 'ollama' | 'default';
export type RunStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'retrying';
export type LastRunStatus = RunStatus | 'none';

/** Agent 類型 */
export type AgentType = 'cursor' | 'codex' | 'openclaw' | 'auto';

/** 執行模式 */
export type ExecutionMode = 'parallel' | 'sequential';

/**
 * 與 OpenClaw openclaw.json 一致的模型順序（主力 → 備援）
 * 用於 Telegram 通知與防卡關降級
 */
export const OPENCLAW_MODEL_ORDER = [
  'google/gemini-2.5-flash',      // 主力
  'anthropic/claude-haiku-4-5-20251001',
  'kimi/kimi-k2.5',
  'kimi/kimi-k2-turbo-preview',
  'ollama/qwen3:8b',
  'ollama/deepseek-r1:8b',
  'ollama/llama3.2:latest',
  'ollama/qwen2.5:14b',
] as const;

/** 模型降級策略：失敗時改用下一個備援（與 OPENCLAW_MODEL_ORDER 一致） */
export type ModelFallbackStrategy = 'primary-to-next' | 'claude-to-gemini' | 'none';

export interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  tags: string[];
  owner: string;
  priority: Priority;
  scheduleType: ScheduleType;
  scheduleExpr?: string;
  lastRunStatus?: LastRunStatus;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  /** 最近一次執行 runPath（索引級；完整內容在 RESULT.md + ARTIFACTS/） */
  runPath?: string;
  /** 冪等 key（建議：${task_id}:${run_id}） */
  idempotencyKey?: string;
  inputs?: string[];
  outputs?: string[];
  acceptance?: string[];
  taskType?: TaskType;
  complexity?: TaskComplexity;
  riskLevel?: TaskRiskLevel;
  deadline?: string | null;
  reviewer?: string;
  rollbackPlan?: string;
  acceptanceCriteria?: string[];
  evidenceLinks?: string[];
  /** 索引級摘要（避免把全量貼進 Telegram/對話） */
  summary?: string;
  /** 下一步（人類可讀/可執行） */
  nextSteps?: string[];
  reporterTarget?: string;
  /** 固定專案工作區路徑（讓 Codex/Cursor 真的落地寫檔） */
  projectPath?: string;
  /** 交付物（檔案/模組）清單 */
  deliverables?: string[];
  /** 可直接複製執行的指令（安裝/啟動/驗收） */
  runCommands?: string[];
  /** 模型政策（文字規範；後端另有強制策略） */
  modelPolicy?: string;
  /** 是否允許使用按量付費模型（預設 false） */
  allowPaid?: boolean;
  /** 執行提供者（subscription/codex-native、subscription/cursor-auto、ollama/* 等） */
  executionProvider?: string;
  modelConfig?: {
    provider: TaskModelProvider;
    primary: string;
    fallbacks?: string[];
  };
  updatedAt: string;
  createdAt: string;
  
  // === 新增欄位 ===
  /** Agent 選擇 */
  agent?: {
    type: AgentType;
    config?: Record<string, unknown>;
  };
  
  /** 工作流程依賴 */
  dependsOn?: string[];
  
  /** 執行模式 */
  executionMode?: ExecutionMode;
  
  /** 防卡關機制配置 */
  timeoutConfig?: {
    timeoutMinutes: number;  // 預設 5 分鐘
    maxRetries: number;      // 預設 2 次
    fallbackStrategy: ModelFallbackStrategy;
    notifyOnTimeout: boolean;
  };

  /** OpenClaw review linkage (for ReviewCenter -> Task creation flows) */
  fromReviewId?: string;
}

export interface RunStep {
  name: string;
  status: 'pending' | 'queued' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  endedAt?: string;
  message?: string;
  
  // === 新增欄位 ===
  /** 重試次數 */
  retryCount?: number;
  /** 使用的 Agent */
  agentType?: AgentType;
  /** 使用的模型 */
  modelUsed?: string;
}

export interface RunError {
  code: string;
  message: string;
  stack?: string;
  
  // === 新增欄位 ===
  /** 是否可重試 */
  retryable?: boolean;
  /** 降級後的錯誤 */
  fallbackError?: string;
}

export interface Run {
  id: string;
  taskId: string;
  taskName: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string | null;
  durationMs?: number | null;
  inputSummary?: Record<string, unknown> | string;
  outputSummary?: Record<string, unknown> | string;
  /** 專案落地路徑（索引級） */
  projectPath?: string;
  /** 本次執行 runPath（RESULT.md + ARTIFACTS/） */
  runPath?: string;
  /** 冪等 key（建議：${task_id}:${run_id}） */
  idempotencyKey?: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    estimated: boolean;
  };
  costUsd?: number | null;
  steps: RunStep[];
  error?: RunError;
  
  // === 新增欄位 ===
  /** 當前重試次數 */
  retryCount?: number;
  /** 最大重試次數 */
  maxRetries?: number;
  /** 使用的 Agent */
  agentType?: AgentType;
  /** 使用的模型 */
  modelUsed?: string;
  /** 降級記錄 */
  fallbackHistory?: {
    from: string;
    to: string;
    reason: string;
    timestamp: string;
  }[];
  /** 超時時間 */
  timeoutAt?: string;
}

export type AlertSeverity =
  | 'info'
  | 'warning'
  | 'critical'
  | 'low'
  | 'medium'
  | 'high';
export type AlertStatus = 'open' | 'acked' | 'snoozed';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  message: string;
  relatedTaskId?: string;
  relatedRunId?: string;
  
  // === 新增欄位 ===
  /** 通知渠道 */
  notifyChannels?: ('telegram' | 'email' | 'slack')[];
}

/** 工作流程圖節點 */
export interface WorkflowNode {
  taskId: string;
  taskName: string;
  status: TaskStatus;
  dependencies: string[];
  dependents: string[];
  level: number;  // 拓撲排序層級
}

/** 工作流程執行計畫 */
export interface WorkflowExecutionPlan {
  taskId: string;
  executionOrder: number;
  canRunInParallel: boolean;
  dependencies: string[];
  estimatedStartTime?: string;
}

/** Agent 執行器配置 */
export interface AgentExecutorConfig {
  type: AgentType;
  name: string;
  enabled: boolean;
  config: {
    timeout?: number;
    maxRetries?: number;
    workingDir?: string;
    envVars?: Record<string, string>;
  };
}

/** 超時監控項目 */
export interface TimeoutMonitor {
  runId: string;
  taskId: string;
  timeoutAt: string;
  checkInterval: NodeJS.Timeout;
}

/** Telegram 通知訊息 */
export interface TelegramNotification {
  type: 'timeout' | 'retry' | 'fallback' | 'failure' | 'success';
  runId: string;
  taskId: string;
  taskName: string;
  message: string;
  details?: Record<string, unknown>;
}
