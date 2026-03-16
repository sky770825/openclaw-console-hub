/**
 * 任務執行對話框 - 顯示 WebSocket 即時進度
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LiveExecutionPanel } from './LiveExecutionPanel';
import { useTaskExecution } from '@/hooks/useTaskExecution';
import { Play, X } from 'lucide-react';

interface TaskExecutionDialogProps {
  taskId: string;
  taskName: string;
  trigger?: React.ReactNode;
  onExecute?: () => void;
}

export const TaskExecutionDialog: React.FC<TaskExecutionDialogProps> = ({
  taskId,
  taskName,
  trigger,
  onExecute,
}) => {
  const [open, setOpen] = React.useState(false);
  const { isExecuting, currentRunId, taskName: executingTaskName, executeTask, reset, ws } = useTaskExecution();

  const handleOpen = async () => {
    setOpen(true);
    onExecute?.();
    try {
      await executeTask(taskId, taskName);
    } catch (error) {
      // 錯誤已在 hook 中處理
    }
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const isComplete = ws.progress?.status === 'success' || ws.progress?.status === 'failed';

  return (
    <>
      {trigger ? (
        <div onClick={handleOpen}>{trigger}</div>
      ) : (
        <Button
          size="sm"
          onClick={handleOpen}
          disabled={isExecuting}
          className="gap-1"
        >
          <Play className="h-3.5 w-3.5" />
          執行
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isComplete ? (
                ws.progress?.status === 'success' ? '✅ 執行完成' : '❌ 執行失敗'
              ) : (
                '🚀 任務執行中'
              )}
            </DialogTitle>
            <DialogDescription>
              {executingTaskName || taskName}
            </DialogDescription>
          </DialogHeader>

          <LiveExecutionPanel
            runId={currentRunId || ''}
            taskName={executingTaskName || taskName}
            onComplete={() => {
              // 執行完成時的自動操作
            }}
          />

          <div className="flex justify-end gap-2 mt-4">
            {isComplete ? (
              <Button onClick={handleClose}>
                關閉
              </Button>
            ) : (
              <Button variant="outline" onClick={handleClose} className="gap-1">
                <X className="h-4 w-4" />
                隱藏
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskExecutionDialog;
