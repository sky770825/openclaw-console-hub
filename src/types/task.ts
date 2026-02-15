/**
 * Task（任務）資料模型
 * 定義：可被 OpenClaw 排程或觸發的「工作單位」
 * @see docs/OPENCLAW-CONCEPT.md
 */

import type { RunStatus } from './run';

/** Kanban 欄位（固定，不另增） */
export type TaskStatus = 'draft' | 'ready' | 'running' | 'review' | 'done' | 'blocked';

export type ScheduleType = 'cron' | 'interval' | 'webhook' | 'manual';

export type Priority = 1 | 2 | 3 | 4 | 5;
export type TaskComplexity = 'S' | 'M' | 'L' | 'XL';
export type TaskRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'research' | 'development' | 'ops' | 'review' | 'other';
export type TaskExecutionAgent = 'cursor' | 'codex' | 'openclaw' | 'auto';
export type TaskModelProvider = 'openrouter' | 'ollama' | 'default';

/** 最後一次執行的狀態（含「尚未執行」） */
export type LastRunStatus = RunStatus | 'none';

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
  /** 任務卡標準模板：輸入／前置 */
  inputs?: string[];
  /** 任務卡標準模板：產出 */
  outputs?: string[];
  /** 任務卡標準模板：驗收條件 */
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
  /**
   * 固定專案工作區路徑（讓 Codex/Cursor 真的落地寫檔）
   * 例：projects/zhushang-leads/line-bot
   */
  projectPath?: string;
  /** 最近一次執行 runPath（索引級；完整內容在 RESULT.md + ARTIFACTS/） */
  runPath?: string;
  /** 冪等 key（建議：${task_id}:${run_id}） */
  idempotencyKey?: string;
  /** 交付物（檔案/模組）清單 */
  deliverables?: string[];
  /** 可直接複製執行的指令（安裝/啟動/驗收） */
  runCommands?: string[];
  /**
   * 模型政策（文字規範；後端另有強制策略）
   * 例：subscription+ollama-only
   */
  modelPolicy?: string;
  /** 是否允許使用按量付費模型（預設 false） */
  allowPaid?: boolean;
  /** 執行提供者（subscription/codex-native、subscription/cursor-auto、ollama/* 等） */
  executionProvider?: string;
  agent?: {
    type: TaskExecutionAgent;
    config?: Record<string, unknown>;
  };
  modelConfig?: {
    provider: TaskModelProvider;
    primary: string;
    fallbacks?: string[];
  };
  updatedAt: string;
  createdAt: string;
  /** 來源發想審核 ID（由「通過+轉任務」產生） */
  fromReviewId?: string;
}
