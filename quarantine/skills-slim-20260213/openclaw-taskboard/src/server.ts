/**
 * TaskBoard Server - 任務板伺服器入口
 * 
 * 快速啟動完整的任務板後端服務
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createTaskBoardRoutes } from './api-routes';
import { getCenter } from './taskboard-center';

export interface ServerConfig {
  port: number;
  cors?: boolean;
  apiPrefix?: string;
  telegram?: {
    enabled: boolean;
    botToken?: string;
    chatId?: string;
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 3011,
  cors: true,
  apiPrefix: '/api/openclaw'
};

/**
 * 創建並啟動任務板伺服器
 */
export async function startTaskBoardServer(
  config: Partial<ServerConfig> = {}
): Promise<Application> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('🚀 [TaskBoardServer] 啟動中...');
  console.log(`  端口: ${finalConfig.port}`);
  console.log(`  API 前綴: ${finalConfig.apiPrefix}`);

  const app = express();

  // 中介軟體
  if (finalConfig.cors) {
    app.use(cors());
  }
  app.use(express.json());

  // 初始化中控台
  const center = getCenter({
    telegram: finalConfig.telegram?.enabled ? {
      enabled: true,
      sendMessage: async (message: string) => {
        if (finalConfig.telegram?.botToken && finalConfig.telegram?.chatId) {
          // 實際發送 Telegram 通知
          await sendTelegramNotification(
            finalConfig.telegram.botToken,
            finalConfig.telegram.chatId,
            message
          );
        }
      }
    } : undefined,
    antiStuck: {
      circuitBreaker: true,
      watchdog: true,
      parallelExecutor: true
    }
  });

  // 啟動中控台
  center.initialize();

  // 掛載路由
  const routes = createTaskBoardRoutes();
  app.use(finalConfig.apiPrefix!, routes);

  // 根路徑
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'OpenClaw TaskBoard Server',
      version: '2.0.0',
      status: 'running',
      endpoints: {
        health: `${finalConfig.apiPrefix}/health`,
        tasks: `${finalConfig.apiPrefix}/tasks`,
        workflows: `${finalConfig.apiPrefix}/workflows`,
        agents: `${finalConfig.apiPrefix}/agents/health`,
        circuitBreaker: `${finalConfig.apiPrefix}/circuit-breaker/status`,
        watchdog: `${finalConfig.apiPrefix}/watchdog/status`
      }
    });
  });

  // 錯誤處理
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[Server] 錯誤:', err);
    res.status(500).json({
      error: '伺服器錯誤',
      message: err.message
    });
  });

  // 啟動伺服器
  return new Promise((resolve) => {
    app.listen(finalConfig.port, () => {
      console.log('\n✅ [TaskBoardServer] 已啟動！');
      console.log(`  🌐 http://localhost:${finalConfig.port}`);
      console.log(`  📊 Health: http://localhost:${finalConfig.port}${finalConfig.apiPrefix}/health`);
      console.log('');
      resolve(app);
    });
  });
}

/**
 * 發送 Telegram 通知
 */
async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );
    
    if (!response.ok) {
      console.error('[Telegram] 發送失敗:', await response.text());
    }
  } catch (error) {
    console.error('[Telegram] 發送錯誤:', error);
  }
}

// 如果直接執行此檔案
if (require.main === module) {
  const port = parseInt(process.env.TASKBOARD_PORT || '3011');
  
  startTaskBoardServer({
    port,
    telegram: {
      enabled: process.env.TELEGRAM_ENABLED === 'true',
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID
    }
  }).catch(console.error);
}

export default startTaskBoardServer;
