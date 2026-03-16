/* eslint-disable react-refresh/only-export-components */
import { cn } from '@/lib/utils';
import type { TaskStatus, RunStatus, LastRunStatus, Priority, AlertSeverity, LogLevel } from '@/types';

// Agent 類型
export type AgentType = 'Cursor' | 'CoDEX' | 'Kimi' | 'OR-Free' | 'Ollama';

// 解析任務名稱中的 Agent 標籤
export function parseAgentTag(name: string): { agent: AgentType | null; cleanName: string } {
  const match = name.match(/^\[(\w+)\]\s*(.+)$/);
  if (match) {
    const agent = match[1] as AgentType;
    const validAgents: AgentType[] = ['Cursor', 'CoDEX', 'Kimi', 'OR-Free', 'Ollama'];
    if (validAgents.includes(agent)) {
      return { agent, cleanName: match[2] };
    }
  }
  return { agent: null, cleanName: name };
}

// Agent 顏色配置
const agentConfig: Record<AgentType, { label: string; className: string }> = {
  Cursor: { label: 'Cursor', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  CoDEX: { label: 'CoDEX', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  Kimi: { label: 'Kimi', className: 'bg-green-100 text-green-800 border-green-200' },
  'OR-Free': { label: 'OR-Free', className: 'bg-gray-100 text-gray-800 border-gray-200' },
  Ollama: { label: 'Ollama', className: 'bg-orange-100 text-orange-800 border-orange-200' },
};

interface AgentBadgeProps {
  agent: AgentType;
  className?: string;
}

export function AgentBadge({ agent, className }: AgentBadgeProps) {
  const config = agentConfig[agent];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}

interface StatusBadgeProps {
  status: TaskStatus | RunStatus | LastRunStatus;
  className?: string;
}

const statusConfig: Record<TaskStatus | RunStatus | LastRunStatus, { label: string; className: string }> = {
  // Kanban 任務狀態（繁體中文）
  draft: { label: '草稿', className: 'bg-secondary text-secondary-foreground' },
  ready: { label: '待執行', className: 'bg-info/10 text-info border-info/30' },
  running: { label: '執行中', className: 'bg-accent/10 text-accent border-accent/30 animate-pulse' },
  review: { label: '審核中', className: 'bg-warning/10 text-warning border-warning/30' },
  done: { label: '完成', className: 'bg-success/10 text-success border-success/30' },
  blocked: { label: '阻塞', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  // 執行狀態（Run）/ 上次執行
  queued: { label: '佇列中', className: 'bg-secondary text-secondary-foreground' },
  success: { label: '成功', className: 'bg-success/10 text-success border-success/30' },
  failed: { label: '失敗', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  cancelled: { label: '已取消', className: 'bg-muted text-muted-foreground' },
  none: { label: '尚未執行', className: 'bg-muted text-muted-foreground' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status ?? '未知', className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      config.className,
      className
    )}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      )}
      {config.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  showLabel?: boolean;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  1: { label: 'P1', className: 'bg-destructive text-destructive-foreground' },
  2: { label: 'P2', className: 'bg-warning text-warning-foreground' },
  3: { label: 'P3', className: 'bg-info text-info-foreground' },
  4: { label: 'P4', className: 'bg-secondary text-secondary-foreground' },
  5: { label: 'P5', className: 'bg-muted text-muted-foreground' },
};

export function PriorityBadge({ priority, showLabel = true, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? { label: `P${priority ?? '?'}`, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn(
      'inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold min-w-[24px]',
      config.className,
      className
    )}>
      {showLabel ? config.label : priority}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

const severityConfig: Record<AlertSeverity, { label: string; className: string }> = {
  info: { label: '資訊', className: 'bg-info/10 text-info border-info/30' },
  warning: { label: '警告', className: 'bg-warning/10 text-warning border-warning/30' },
  critical: { label: '嚴重', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  low: { label: '低', className: 'bg-muted text-muted-foreground' },
  medium: { label: '中', className: 'bg-warning/10 text-warning border-warning/30' },
  high: { label: '高', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}

interface LogLevelBadgeProps {
  level: LogLevel;
  className?: string;
}

const logLevelConfig: Record<LogLevel, { label: string; className: string }> = {
  debug: { label: '除錯', className: 'text-muted-foreground' },
  info: { label: '資訊', className: 'text-info' },
  warn: { label: '警告', className: 'text-warning' },
  error: { label: '錯誤', className: 'text-destructive font-semibold' },
};

export function LogLevelBadge({ level, className }: LogLevelBadgeProps) {
  const config = logLevelConfig[level];
  return (
    <span className={cn(
      'inline-flex items-center font-mono text-xs uppercase',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
