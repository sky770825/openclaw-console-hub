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
  TaskComplexity,
  TaskRiskLevel,
  TaskType,
  TaskExecutionAgent,
  TaskModelProvider,
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

export type {
  OpenClawSubTask,
  OpenClawTaskStatus,
  OpenClawTask,
  OpenClawReviewStatus,
  OpenClawReviewPriority,
  OpenClawReview,
  OpenClawAutomation,
  OpenClawEvoLog,
  OpenClawN8nFlow,
  OpenClawApiEndpoint,
  OpenClawSecurityLayer,
  OpenClawRbacRow,
  OpenClawPlugin,
  OpenClawBoardConfig,
  OpenClawApiResult,
} from './openclaw';

export type { Project, ProjectStatus, ProjectPhase } from './project';
export { PROJECT_STATUS_LABELS } from './project';

export type { SystemSchedule } from './systemSchedule';

// ---- Review（小蔡發想審核）----
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  number: number;
  title: string;
  summary: string;
  filePath: string;
  status: ReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  tags: string[];
}
