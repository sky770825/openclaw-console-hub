/**
 * Discord Gateway WebSocket 客戶端
 * 輕量實作，不依賴 discord.js
 */

import WebSocket from 'ws';
import { createLogger } from '../logger.js';
import { DISCORD_BOT_TOKEN } from './discord-config.js';

const log = createLogger('discord-gw');

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

// Intents: GUILD_MESSAGES (1 << 9) + MESSAGE_CONTENT (1 << 15)
const INTENTS = (1 << 9) | (1 << 15);

export interface DiscordMessage {
  id: string;
  channelId: string;
  guildId: string;
  content: string;
  author: { id: string; username: string; bot: boolean };
  timestamp: string;
}

export interface DiscordInteraction {
  id: string;
  token: string;
  channelId: string;
  guildId: string;
  commandName: string;
  options: Record<string, string>;
  user: { id: string; username: string };
}

type MessageHandler = (msg: DiscordMessage) => void;
type InteractionHandler = (interaction: DiscordInteraction) => void;

let ws: WebSocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let sequence: number | null = null;
let sessionId: string | null = null;
let messageHandler: MessageHandler | null = null;
let interactionHandler: InteractionHandler | null = null;
let reconnectAttempts = 0;
let stopped = false;

function sendPayload(op: number, d: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ op, d }));
  }
}

function startHeartbeat(intervalMs: number) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    sendPayload(1, sequence);
  }, intervalMs);
}

function identify() {
  sendPayload(2, {
    token: DISCORD_BOT_TOKEN,
    intents: INTENTS,
    properties: {
      os: 'darwin',
      browser: 'openclaw',
      device: 'openclaw',
    },
  });
}

function resume() {
  if (!sessionId) { identify(); return; }
  sendPayload(6, {
    token: DISCORD_BOT_TOKEN,
    session_id: sessionId,
    seq: sequence,
  });
}

function handleDispatch(t: string, d: Record<string, unknown>) {
  if (t === 'READY') {
    sessionId = d.session_id as string;
    log.info(`[Discord] Gateway READY, session=${sessionId}`);
    reconnectAttempts = 0;
    return;
  }

  if (t === 'INTERACTION_CREATE' && interactionHandler) {
    const interactionData = d.data as { name: string; options?: Array<{ name: string; value: string }> } | undefined;
    const user = (d.member as { user?: { id: string; username: string } })?.user || d.user as { id: string; username: string } | undefined;
    if (interactionData && user) {
      const options: Record<string, string> = {};
      for (const opt of interactionData.options || []) {
        options[opt.name] = opt.value;
      }
      interactionHandler({
        id: d.id as string,
        token: d.token as string,
        channelId: d.channel_id as string,
        guildId: (d.guild_id as string) || '',
        commandName: interactionData.name,
        options,
        user: { id: user.id, username: user.username },
      });
    }
    return;
  }

  if (t === 'MESSAGE_CREATE' && messageHandler) {
    const author = d.author as { id: string; username: string; bot?: boolean } | undefined;
    if (!author) return;

    messageHandler({
      id: d.id as string,
      channelId: d.channel_id as string,
      guildId: (d.guild_id as string) || '',
      content: (d.content as string) || '',
      author: {
        id: author.id,
        username: author.username,
        bot: author.bot ?? false,
      },
      timestamp: d.timestamp as string,
    });
  }
}

function connect() {
  if (stopped) return;
  if (!DISCORD_BOT_TOKEN) {
    log.warn('[Discord] No DISCORD_BOT_TOKEN, gateway disabled');
    return;
  }

  try {
    ws = new WebSocket(GATEWAY_URL);
  } catch (err) {
    log.error({ err }, '[Discord] WebSocket create failed');
    scheduleReconnect();
    return;
  }

  ws.on('open', () => {
    log.info('[Discord] Gateway connected');
  });

  ws.on('message', (raw: Buffer) => {
    try {
      const payload = JSON.parse(raw.toString()) as {
        op: number;
        d: Record<string, unknown>;
        s: number | null;
        t: string | null;
      };

      if (payload.s !== null) sequence = payload.s;

      switch (payload.op) {
        case 10: // HELLO
          startHeartbeat((payload.d as { heartbeat_interval: number }).heartbeat_interval);
          if (sessionId) { resume(); } else { identify(); }
          break;
        case 11: // HEARTBEAT ACK
          break;
        case 0:  // DISPATCH
          if (payload.t) handleDispatch(payload.t, payload.d);
          break;
        case 7:  // RECONNECT
          log.info('[Discord] Server requested reconnect');
          ws?.close();
          break;
        case 9:  // INVALID SESSION
          log.warn('[Discord] Invalid session, re-identifying');
          sessionId = null;
          setTimeout(identify, 2000);
          break;
      }
    } catch (err) {
      log.error({ err }, '[Discord] Failed to parse gateway message');
    }
  });

  ws.on('close', (code) => {
    log.info(`[Discord] Gateway closed, code=${code}`);
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    if (!stopped) scheduleReconnect();
  });

  ws.on('error', (err) => {
    log.error({ err }, '[Discord] Gateway error');
  });
}

function scheduleReconnect() {
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
  log.info(`[Discord] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(connect, delay);
}

/** 啟動 Discord Gateway */
export function startDiscordGateway(onMessage: MessageHandler, onInteraction?: InteractionHandler): void {
  stopped = false;
  messageHandler = onMessage;
  interactionHandler = onInteraction || null;
  connect();
}

/** 停止 Discord Gateway */
export function stopDiscordGateway(): void {
  stopped = true;
  messageHandler = null;
  if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  if (ws) { ws.close(); ws = null; }
}
