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
export type RunStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled';
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
  inputs?: string[];
  outputs?: string[];
  acceptance?: string[];
  updatedAt: string;
  createdAt: string;
}

export interface RunStep {
  name: string;
  status: 'pending' | 'queued' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  endedAt?: string;
  message?: string;
}

export interface RunError {
  code: string;
  message: string;
  stack?: string;
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
  steps: RunStep[];
  error?: RunError;
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
}
