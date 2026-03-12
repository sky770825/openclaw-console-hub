import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Gateway Configuration (Firewall Rules)
// ============================================================================
const GATEWAY_CONFIG = {
  allowedOutbound: [
    'task:update',
    'system:status',
    'community:heartbeat',
    'community:stats',
    'community:auth:verify'
  ]
};

/**
 * Initialize WebSocket Server with Firewall Middleware
 * @param server HTTP Server instance
 */
export const initializeWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req) => {
    const ip = req.socket.remoteAddress;
    logger.info({ category: 'websocket', ip }, 'Client connected');

    ws.on('message', async (message: Buffer) => {
      try {
        const msgStr = message.toString();
        const data = JSON.parse(msgStr);

        // 1. Validate Message Structure
        if (!data.type || !data.payload) {
          ws.send(JSON.stringify({ error: 'Invalid message format', code: 400 }));
          return;
        }

        // 2. Firewall Check (Whitelist)
        if (!GATEWAY_CONFIG.allowedOutbound.includes(data.type)) {
          const blockedEvent = {
            event_type: data.type,
            payload: data.payload,
            ip: ip || 'unknown',
            status: 'blocked',
            severity: 'low',
            created_at: new Date().toISOString()
          };

          logger.warn({ category: 'firewall', event: blockedEvent }, 'Blocked unauthorized WebSocket message');

          // Async Log to Supabase (Fire & Forget to avoid blocking)
          supabase.from('firewall_logs').insert(blockedEvent).then(({ error }) => {
            if (error) logger.error({ category: 'firewall', error }, 'Failed to log blocked event to Supabase');
          });

          ws.send(JSON.stringify({ error: 'Unauthorized message type', code: 403 }));
          return;
        }

        // 3. Process Authorized Message
        logger.info({ category: 'websocket', type: data.type }, 'Authorized message processed');

        // 4. Broadcast to other clients (Basic Communication Deck logic)
        // In a real scenario, we might want to route specific types differently
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(msgStr);
          }
        });

      } catch (err) {
        logger.error({ category: 'websocket', error: err }, 'WebSocket message processing error');
        ws.send(JSON.stringify({ error: 'Internal server error', code: 500 }));
      }
    });

    ws.on('close', () => {
      logger.info({ category: 'websocket', ip }, 'Client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ category: 'websocket', error: err }, 'WebSocket connection error');
    });
  });

  return wss;
};
