/**
 * 即時執行進度組件
 * 顯示 WebSocket 即時推播的任務執行進度
 */

import React, { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  RotateCw,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveExecutionPanelProps {
  runId: string;
  taskName: string;
  onComplete?: () => void;
  className?: string;
}

const levelIcons = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warn: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const levelColors = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warn: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-green-50 text-green-700 border-green-200',
};

const statusConfig = {
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500', label: '執行中' },
  retrying: { icon: RotateCw, color: 'text-yellow-500', bg: 'bg-yellow-500', label: '重試中' },
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500', label: '完成' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500', label: '失敗' },
  pending: { icon: Loader2, color: 'text-gray-400', bg: 'bg-gray-400', label: '等待中' },
};

export const LiveExecutionPanel: React.FC<LiveExecutionPanelProps> = ({
  runId,
  taskName,
  onComplete,
  className,
}) => {
  const { isConnected, isReconnecting, logs, progress, subscribe, unsubscribe, clearLogs } = useWebSocket();

  // 訂閱 run 更新
  useEffect(() => {
    if (runId) {
      clearLogs();
      subscribe(runId);
      return () => unsubscribe(runId);
    }
  }, [runId, subscribe, unsubscribe, clearLogs]);

  // 監聽完成狀態
  useEffect(() => {
    if (progress?.status === 'success' || progress?.status === 'failed') {
      onComplete?.();
    }
  }, [progress?.status, onComplete]);

  const currentStatus = progress?.status || 'pending';
  const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  if (isReconnecting) {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <div className="flex items-center gap-2 text-amber-600">
          <RotateCw className="h-4 w-4 animate-spin" />
          <span>連線中斷，正在自動重連...</span>
        </div>
      </div>
    );
  }

  const progressPercent = progress
    ? Math.round((progress.step / progress.totalSteps) * 100)
    : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 連線狀態 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {taskName}
        </span>
        <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
          {isConnected ? '🟢 即時連線' : '🟡 未連線'}
        </Badge>
      </div>

      {/* 進度條 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', statusInfo.color, currentStatus === 'running' && 'animate-spin')} />
            <span className={statusInfo.color}>
              {progress?.message || statusInfo.label}
            </span>
          </div>
          <span className="text-muted-foreground">
            {progress?.step || 0} / {progress?.totalSteps || 3}
          </span>
        </div>
        <Progress 
          value={progressPercent} 
          className="h-2"
        />
        {progress?.detail && (
          <p className="text-xs text-muted-foreground">
            {progress.detail}
          </p>
        )}
      </div>

      {/* 執行日誌 */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">執行日誌</h4>
          <ScrollArea className="h-48 rounded-md border bg-muted/30">
            <div className="space-y-1 p-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-start gap-2 rounded px-2 py-1.5 text-xs',
                    levelColors[log.level]
                  )}
                >
                  {levelIcons[log.level]}
                  <div className="flex-1 min-w-0">
                    <p className="break-words">{log.message}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString('zh-TW')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default LiveExecutionPanel;
