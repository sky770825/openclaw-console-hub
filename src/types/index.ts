/**
 * OpenClaw 型別統一入口
 * 所有頁面僅使用此處匯出之型別（來源：task / run / alert / log）
 * @see docs/OPENCLAW-CONCEPT.md
 */

export type {
  Task,
  TaskStatus,
  ScheduleType,
  Priority,
  LastRunStatus,
} from './task';

export type {
  Run,
  RunStatus,
  RunStep,
  RunError,
} from './run';

export type {
  Alert,
  AlertType,
  AlertSeverity,
  AlertStatus,
} from './alert';

export type { LogEntry, LogLevel } from './log';

// 共用（未納入 T-02 獨立檔，沿用此處）
export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  target: string;
  details?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'operator' | 'viewer';
}
