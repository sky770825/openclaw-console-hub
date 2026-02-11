/**
 * 任務執行 Hook - 整合 WebSocket 即時進度
 */

import { useState, useCallback } from 'react';
import { runTask } from '@/services/openclawBoardApi';
import { useWebSocket } from './useWebSocket';

interface ExecutionState {
  isExecuting: boolean;
  currentRunId: string | null;
  currentTaskId: string | null;
  taskName: string;
}

interface UseTaskExecutionReturn extends ExecutionState {
  executeTask: (taskId: string, taskName: string) => Promise<void>;
  reset: () => void;
  ws: ReturnType<typeof useWebSocket>;
}

export function useTaskExecution(): UseTaskExecutionReturn {
  const [state, setState] = useState<ExecutionState>({
    isExecuting: false,
    currentRunId: null,
    currentTaskId: null,
    taskName: '',
  });

  const ws = useWebSocket();

  const executeTask = useCallback(async (taskId: string, taskName: string) => {
    setState({
      isExecuting: true,
      currentRunId: null,
      currentTaskId: taskId,
      taskName,
    });

    try {
      const response = await runTask(taskId);
      
      if (!response.ok) {
        throw new Error(response.data?.message || '執行任務失敗');
      }

      // runTask 回傳的是 { id: string }
      const runId = response.data?.id;
      
      if (runId) {
        setState((prev) => ({
          ...prev,
          currentRunId: runId,
        }));
        
        // 訂閱該 run 的更新
        ws.subscribe(runId);
      }
    } catch (error) {
      console.error('[TaskExecution] 執行失敗:', error);
      setState((prev) => ({
        ...prev,
        isExecuting: false,
      }));
      throw error;
    }
  }, [ws]);

  const reset = useCallback(() => {
    if (state.currentRunId) {
      ws.unsubscribe(state.currentRunId);
    }
    ws.clearLogs();
    setState({
      isExecuting: false,
      currentRunId: null,
      currentTaskId: null,
      taskName: '',
    });
  }, [state.currentRunId, ws]);

  return {
    ...state,
    executeTask,
    reset,
    ws,
  };
}

export default useTaskExecution;
