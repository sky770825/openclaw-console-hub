/**
 * Run（執行）資料模型
 * 定義：某個 Task 的「一次執行實例」
 * @see docs/OPENCLAW-CONCEPT.md
 */

export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

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
