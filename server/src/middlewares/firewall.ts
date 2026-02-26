/**
 * 防火牆中介層 - postMessage 白名單過濾
 * P1 任務：防火牆 — postMessage 白名單過濾中介層
 * 
 * 功能：
 * 1. 攔截所有 WebSocket 事件
 * 2. 只允許 GATEWAY_CONFIG.allowedOutbound 清單內的事件通過
 * 3. 未授權事件記錄至 Supabase firewall_logs 表
 * 4. 發送警報通知
 */

import { createLogger } from '../logger.js';
import { hasSupabase, supabase } from '../supabase.js';
import type { Request, Response, NextFunction } from 'express';

const log = createLogger('firewall-middleware');

// 預設允許的事件類型清單（可從環境變數或配置覆蓋）
const DEFAULT_ALLOWED_EVENTS = [
  'message',
  'ping',
  'pong',
  'heartbeat',
  'status',
  'task_update',
  'notification',
];

// 從環境變數讀取允許的事件清單
const getAllowedEvents = (): string[] => {
  const config = process.env.GATEWAY_CONFIG;
  if (config) {
    try {
      const parsed = JSON.parse(config);
      if (parsed.allowedOutbound && Array.isArray(parsed.allowedOutbound)) {
        return parsed.allowedOutbound;
      }
    } catch (e) {
      log.error({ err: e }, 'Failed to parse GATEWAY_CONFIG');
    }
  }
  return DEFAULT_ALLOWED_EVENTS;
};

// 記錄未授權事件到 Supabase
const logUnauthorizedEvent = async (
  eventType: string,
  origin: string,
  details: Record<string, unknown>
): Promise<void> => {
  if (!hasSupabase() || !supabase) {
    log.warn('Supabase not available, skipping firewall log');
    return;
  }

  try {
    const { error } = await supabase.from('firewall_logs').insert({
      event_type: eventType,
      origin: origin,
      details: details,
      blocked_at: new Date().toISOString(),
      severity: 'high',
      status: 'blocked',
    });

    if (error) {
      log.error({ err: error }, 'Failed to insert firewall log');
    } else {
      log.info({ eventType, origin }, 'Unauthorized event logged to firewall_logs');
    }
  } catch (e) {
    log.error({ err: e }, 'Exception while logging to firewall_logs');
  }
};

// 發送警報通知
const sendAlert = async (eventType: string, origin: string): Promise<void> => {
  // TODO: 整合 n8n 或 Telegram 發送警報
  log.warn({ eventType, origin }, '🔥 FIREWALL ALERT: Unauthorized postMessage blocked');
  
  // 這裡可以擴展為實際的警報發送邏輯
  // 例如：呼叫 n8n webhook 或發送 Telegram 通知
};

// 防火牆中介層主函數
export const postMessageFirewall = () => {
  const allowedEvents = getAllowedEvents();
  log.info({ allowedEvents }, 'PostMessage firewall initialized');

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 只處理 WebSocket 相關請求或 postMessage 相關路由
    const isWebSocket = req.headers.upgrade === 'websocket';
    const isPostMessageRoute = req.path.includes('/postmessage') || req.path.includes('/ws');
    
    if (!isWebSocket && !isPostMessageRoute) {
      return next();
    }

    // 從請求中取得事件類型
    const eventType = req.body?.type || req.query?.type || req.headers['x-event-type'];
    const origin = req.headers.origin || req.headers.referer || 'unknown';

    if (!eventType) {
      log.warn('Missing event type in request');
      res.status(400).json({ error: 'Missing event type' });
      return;
    }

    // 檢查事件是否在白名單
    if (allowedEvents.includes(eventType)) {
      log.debug({ eventType, origin }, 'Event allowed by firewall');
      return next();
    }

    // 未授權事件：記錄並攔截
    log.warn({ eventType, origin, path: req.path }, 'Unauthorized postMessage event blocked');
    
    // 記錄到 Supabase
    await logUnauthorizedEvent(eventType, origin, {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
    });

    // 發送警報
    await sendAlert(eventType, origin);

    // 回應 403 Forbidden
    res.status(403).json({
      error: 'Unauthorized event type',
      eventType: eventType,
      message: 'This event type is not in the allowed outbound list',
    });
  };
};

// WebSocket 專用防火牆（用於 ws 庫）
export const wsFirewall = () => {
  const allowedEvents = getAllowedEvents();
  log.info({ allowedEvents }, 'WebSocket firewall initialized');

  return {
    // 驗證傳入的 WebSocket 訊息
    validateMessage: async (data: string, clientId: string): Promise<{ allowed: boolean; reason?: string }> => {
      try {
        const parsed = JSON.parse(data);
        const eventType = parsed.type;

        if (!eventType) {
          return { allowed: false, reason: 'Missing event type' };
        }

        if (allowedEvents.includes(eventType)) {
          return { allowed: true };
        }

        // 記錄未授權事件
        await logUnauthorizedEvent(eventType, `ws-client:${clientId}`, {
          clientId,
          data: parsed,
        });
        await sendAlert(eventType, `ws-client:${clientId}`);

        return { allowed: false, reason: `Event type '${eventType}' not in allowed list` };
      } catch (e) {
        log.error({ err: e }, 'Failed to parse WebSocket message');
        return { allowed: false, reason: 'Invalid JSON' };
      }
    },
  };
};
