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
  updatedAt: string;
  createdAt: string;
}
