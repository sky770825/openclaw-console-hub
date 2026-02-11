/**
 * WebSocket Hook - 即時進度推播
 * 提供任務執行時的即時進度更新
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// WebSocket 訊息類型
interface WebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'runUpdate' | 'taskUpdate' | 'progress' | 'log' | 'error' | 'pong';
  runId?: string;
  taskId?: string;
  data?: unknown;
  progress?: {
    status: string;
    step: number;
    totalSteps: number;
    message: string;
    detail?: string;
  };
  log?: {
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    timestamp: string;
  };
  message?: string;
  timestamp?: string;
}

// 執行日誌項目
interface ExecutionLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

// 進度資訊
interface ProgressInfo {
  runId: string;
  status: string;
  step: number;
  totalSteps: number;
  message: string;
  detail?: string;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  logs: ExecutionLog[];
  progress: ProgressInfo | null;
  subscribe: (runId: string) => void;
  unsubscribe: (runId: string) => void;
  clearLogs: () => void;
}

const WS_URL = `ws://${window.location.hostname}:3011/ws`;

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logIdRef = useRef(0);

  // 連接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log('[WebSocket] 正在連接...', WS_URL);
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WebSocket] 連線成功');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('[WebSocket] 解析訊息失敗:', error);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] 連線關閉');
      setIsConnected(false);
      wsRef.current = null;

      // 自動重連
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WebSocket] 嘗試重連...');
        connect();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] 錯誤:', error);
    };

    wsRef.current = ws;
  }, []);

  // 處理訊息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('[WebSocket] 已連接:', message.message);
        break;

      case 'progress':
        if (message.progress && message.runId) {
          setProgress({
            runId: message.runId,
            ...message.progress,
            timestamp: message.timestamp || new Date().toISOString(),
          });
        }
        break;

      case 'log':
        if (message.log) {
          setLogs((prev) => [
            ...prev,
            {
              id: `log-${++logIdRef.current}`,
              level: message.log!.level,
              message: message.log!.message,
              timestamp: message.log!.timestamp || new Date().toISOString(),
            },
          ]);
        }
        break;

      case 'runUpdate':
        console.log('[WebSocket] Run 更新:', message.runId, message.data);
        break;

      case 'taskUpdate':
        console.log('[WebSocket] Task 更新:', message.taskId, message.data);
        break;

      case 'error':
        console.error('[WebSocket] 錯誤:', message.message);
        break;

      case 'pong':
        // 心跳回應，不需要處理
        break;

      default:
        console.log('[WebSocket] 收到訊息:', message);
    }
  }, []);

  // 訂閱 run 更新
  const subscribe = useCallback((runId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'subscribe',
          payload: { runId },
        })
      );
      console.log('[WebSocket] 訂閱 run:', runId);
    }
  }, []);

  // 取消訂閱
  const unsubscribe = useCallback((runId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action: 'unsubscribe',
          payload: { runId },
        })
      );
    }
  }, []);

  // 清除日誌
  const clearLogs = useCallback(() => {
    setLogs([]);
    logIdRef.current = 0;
  }, []);

  // 初始化連接
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // 定時發送心跳
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    isConnected,
    logs,
    progress,
    subscribe,
    unsubscribe,
    clearLogs,
  };
}

export default useWebSocket;
