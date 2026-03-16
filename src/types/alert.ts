/**
 * Alert（警報）資料模型
 * 定義：需要人工或系統關注的「異常或重要事件」
 * @see docs/OPENCLAW-CONCEPT.md
 */

export type AlertType =
  | 'webhook_fail'
  | 'queue_backlog'
  | 'auth_issue'
  | 'rate_limit'
  | 'db_connection'
  | 'task_run_failed'
  | 'runner_streaming';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'low' | 'medium' | 'high';

export type AlertStatus = 'open' | 'acked' | 'snoozed';

export interface Alert {
  id: string;
  type: AlertType | string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  message: string;
  relatedTaskId?: string;
  relatedRunId?: string;
}
