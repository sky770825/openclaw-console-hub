/**
 * WebSocket 管理器
 * 提供即時進度推播功能
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

// 連線類型
interface ClientConnection {
  ws: WebSocket;
  subscriptions: Set<string>; // 訂閱的任務/run ID
  isAlive: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化 WebSocket 伺服器
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      console.log('[WebSocket] 新客戶端連線');
      
      const client: ClientConnection = {
        ws,
        subscriptions: new Set(),
        isAlive: true,
      };
      this.clients.set(ws, client);

      // 發送歡迎訊息
      this.sendToClient(ws, {
        type: 'connected',
        message: 'WebSocket 連線成功',
        timestamp: new Date().toISOString(),
      });

      // 處理訊息
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, client, message);
        } catch (error) {
          this.sendToClient(ws, {
            type: 'error',
            message: '無效的 JSON 格式',
          });
        }
      });

      // 處理 pong（心跳回應）
      ws.on('pong', () => {
        client.isAlive = true;
      });

      // 處理關閉
      ws.on('close', () => {
        console.log('[WebSocket] 客戶端斷線');
        this.clients.delete(ws);
      });

      // 處理錯誤
      ws.on('error', (error) => {
        console.error('[WebSocket] 錯誤:', error);
        this.clients.delete(ws);
      });
    });

    // 啟動心跳檢查
    this.startHeartbeat();

    console.log('[WebSocket] 伺服器已啟動於 /ws');
  }

  /**
   * 處理客戶端訊息
   */
  private handleMessage(
    ws: WebSocket,
    client: ClientConnection,
    message: { action: string; payload?: unknown }
  ): void {
    switch (message.action) {
      case 'subscribe': {
        // 訂閱特定任務/run 的更新
        const { runId, taskId } = (message.payload as { runId?: string; taskId?: string }) || {};
        if (runId) {
          client.subscriptions.add(`run:${runId}`);
          this.sendToClient(ws, {
            type: 'subscribed',
            runId,
            message: `已訂閱 run ${runId} 的更新`,
          });
        }
        if (taskId) {
          client.subscriptions.add(`task:${taskId}`);
          this.sendToClient(ws, {
            type: 'subscribed',
            taskId,
            message: `已訂閱 task ${taskId} 的更新`,
          });
        }
        break;
      }

      case 'unsubscribe': {
        const { runId, taskId } = (message.payload as { runId?: string; taskId?: string }) || {};
        if (runId) {
          client.subscriptions.delete(`run:${runId}`);
        }
        if (taskId) {
          client.subscriptions.delete(`task:${taskId}`);
        }
        this.sendToClient(ws, {
          type: 'unsubscribed',
          runId,
          taskId,
        });
        break;
      }

      case 'ping': {
        this.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      default:
        this.sendToClient(ws, {
          type: 'error',
          message: `未知的 action: ${message.action}`,
        });
    }
  }

  /**
   * 發送訊息給單一客戶端
   */
  private sendToClient(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * 啟動心跳檢查
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          // 客戶端沒有回應，關閉連線
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        
        // 標記為待確認，發送 ping
        client.isAlive = false;
        ws.ping();
      });
    }, 30000); // 每 30 秒檢查一次
  }

  /**
   * 廣播訊息給所有客戶端
   */
  broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    this.clients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * 推送 run 更新給訂閱的客戶端
   */
  broadcastRunUpdate(runId: string, data: unknown): void {
    const message = JSON.stringify({
      type: 'runUpdate',
      runId,
      data,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach(({ ws, subscriptions }) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        (subscriptions.has(`run:${runId}`) || subscriptions.has('run:*'))
      ) {
        ws.send(message);
      }
    });
  }

  /**
   * 推送任務更新給訂閱的客戶端
   */
  broadcastTaskUpdate(taskId: string, data: unknown): void {
    const message = JSON.stringify({
      type: 'taskUpdate',
      taskId,
      data,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach(({ ws, subscriptions }) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        (subscriptions.has(`task:${taskId}`) || subscriptions.has('task:*'))
      ) {
        ws.send(message);
      }
    });
  }

  /**
   * 推送執行進度
   */
  broadcastProgress(
    runId: string,
    progress: {
      status: string;
      step: number;
      totalSteps: number;
      message: string;
      detail?: string;
    }
  ): void {
    const message = JSON.stringify({
      type: 'progress',
      runId,
      progress,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach(({ ws, subscriptions }) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        (subscriptions.has(`run:${runId}`) || subscriptions.has('run:*'))
      ) {
        ws.send(message);
      }
    });
  }

  /**
   * 推送執行日誌
   */
  broadcastLog(
    runId: string,
    log: {
      level: 'info' | 'warn' | 'error' | 'success';
      message: string;
      timestamp?: string;
    }
  ): void {
    const message = JSON.stringify({
      type: 'log',
      runId,
      log: {
        ...log,
        timestamp: log.timestamp || new Date().toISOString(),
      },
    });

    this.clients.forEach(({ ws, subscriptions }) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        (subscriptions.has(`run:${runId}`) || subscriptions.has('run:*'))
      ) {
        ws.send(message);
      }
    });
  }

  /**
   * 關閉 WebSocket 伺服器
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.forEach(({ ws }) => {
      ws.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('[WebSocket] 伺服器已關閉');
  }

  /**
   * 取得連線統計
   */
  getStats(): { totalConnections: number; totalSubscriptions: number } {
    let totalSubscriptions = 0;
    this.clients.forEach((client) => {
      totalSubscriptions += client.subscriptions.size;
    });

    return {
      totalConnections: this.clients.size,
      totalSubscriptions,
    };
  }
}

// 建立單例
export const wsManager = new WebSocketManager();

export default WebSocketManager;
