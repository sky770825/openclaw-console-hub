/**
 * Log（日誌）資料模型
 * 定義：系統或任務在執行過程中產生的「事件紀錄」
 * @see docs/OPENCLAW-CONCEPT.md
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  taskId?: string;
  runId?: string;
  message: string;
}
