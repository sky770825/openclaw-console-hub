/**
 * WebSocket Hook - 即時進度推播
 * 提供任務執行時的即時進度更新
 * 具備自動重連（指數退避）、與 API 同源
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { dataConfig } from '@/services/config';

// 從 API base 推導 WebSocket URL
function getWsUrl(): string {
  const base = dataConfig.apiBaseUrl.replace(/\/$/, '');
  if (!base) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  try {
    const u = new URL(base);
    const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${u.host}/ws`;
  } catch {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
}

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
  isReconnecting: boolean;
  logs: ExecutionLog[];
  progress: ProgressInfo | null;
  subscribe: (runId: string) => void;
  unsubscribe: (runId: string) => void;
  clearLogs: () => void;
}

const MAX_LOG_ENTRIES = 200;

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  const logIdRef = useRef(0);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

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
          setLogs((prev) => {
            const next = [
              ...prev,
              {
                id: `log-${++logIdRef.current}`,
                level: message.log!.level,
                message: message.log!.message,
                timestamp: message.log!.timestamp || new Date().toISOString(),
              },
            ];
            if (next.length <= MAX_LOG_ENTRIES) return next;
            return next.slice(next.length - MAX_LOG_ENTRIES);
          });
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

  // 連接 WebSocket（含指數退避重連）
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!shouldReconnectRef.current) return;

    const wsUrl = getWsUrl();
    console.log('[WebSocket] 正在連接...', wsUrl);
    const ws = new WebSocket(wsUrl);

    // If the connection doesn't open quickly, force-close to trigger retry logic.
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    }, 8000);

    ws.onopen = () => {
      console.log('[WebSocket] 連線成功');
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptRef.current = 0;
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
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
      setIsReconnecting(true);
      wsRef.current = null;
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }

      if (!shouldReconnectRef.current) return;

      // 自動重連（指數退避 + jitter：2s, 4s, 8s... 最多 30s）
      const baseDelay = Math.min(2000 * 2 ** reconnectAttemptRef.current, 30000);
      const jitter = 0.7 + Math.random() * 0.6; // 0.7x ~ 1.3x
      const delay = Math.round(baseDelay * jitter);
      reconnectAttemptRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WebSocket] 嘗試重連 #' + reconnectAttemptRef.current + '...');
        connect();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] 錯誤:', error);
    };

    wsRef.current = ws;
  }, [handleMessage]);

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
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // When the tab becomes visible again, reconnect quickly.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        shouldReconnectRef.current = true;
        if (!wsRef.current) connect();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
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

  return useMemo(
    () => ({
      isConnected,
      isReconnecting,
      logs,
      progress,
      subscribe,
      unsubscribe,
      clearLogs,
    }),
    [isConnected, isReconnecting, logs, progress, subscribe, unsubscribe, clearLogs]
  );
}

export default useWebSocket;
