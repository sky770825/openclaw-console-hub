/**
 * Agent Bridge — m5 達爾 ↔ 其他 AI agent (m3 等) 的 HTTP 通道
 *
 * 為什麼存在：Telegram bot 平台不讓 bot 看到其他 bot 的訊息，
 * agent 之間要協作必須走 HTTP，群組只當「人類觀眾的鏡射畫面」。
 *
 * 接收端：POST /api/agent-bridge/inbound  — 對方 agent 送訊息來
 * 主動端：POST /api/agent-bridge/outbound — m5 主動找對方（呼叫對方 endpoint）
 * 設定端：GET/PUT /api/agent-bridge/peers — 列出/設定已知的 peer agent
 */

import { Router, type Request, type Response } from 'express';
import { createLogger } from '../logger.js';
import { sendTelegramMessageToChat } from '../utils/telegram.js';
import { xiaocaiThink } from '../telegram/xiaocai-think.js';

const log = createLogger('agent-bridge');
const router = Router();

const BRIDGE_TOKEN = process.env.AGENT_BRIDGE_TOKEN?.trim() || '';
const MIRROR_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID?.trim() || '';
const XIAOCAI_TOKEN = process.env.TELEGRAM_XIAOCAI_BOT_TOKEN?.trim() || '';

type Peer = {
  name: string;
  endpoint: string;
  token?: string;
};
const peers = new Map<string, Peer>();

const bridgeHistory = new Map<string, Array<{ role: string; text: string }>>();

function authOk(req: Request): boolean {
  if (!BRIDGE_TOKEN) return true;
  const header = req.header('x-bridge-token') || req.header('authorization')?.replace(/^Bearer\s+/i, '') || '';
  return header === BRIDGE_TOKEN;
}

async function mirrorToGroup(line: string): Promise<void> {
  if (!MIRROR_CHAT_ID || !XIAOCAI_TOKEN) return;
  try {
    await sendTelegramMessageToChat(Number(MIRROR_CHAT_ID), line, { token: XIAOCAI_TOKEN });
  } catch (e) {
    log.warn(`mirror failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

router.post('/inbound', async (req: Request, res: Response) => {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const from = String(req.body?.from || 'unknown').slice(0, 32);
  const text = String(req.body?.text || '').trim();
  const conversationId = String(req.body?.conversationId || from).slice(0, 64);

  if (!text) return res.status(400).json({ ok: false, error: 'text required' });

  log.info(`[inbound] from=${from} conv=${conversationId} text=${text.slice(0, 80)}`);

  await mirrorToGroup(`💬 <b>[${from}]</b> ${text}`);

  const histKey = `bridge:${conversationId}`;
  const histMap = new Map<number, Array<{ role: string; text: string }>>();
  const fakeChatId = -999_000_000 - (Math.abs(hashCode(conversationId)) % 1_000_000);
  histMap.set(fakeChatId, bridgeHistory.get(histKey) || []);

  let reply = '';
  try {
    reply = await xiaocaiThink(fakeChatId, `[${from}] ${text}`, 'gemini-2.5-flash', histMap);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`xiaocaiThink failed: ${msg}`);
    return res.status(500).json({ ok: false, error: `think failed: ${msg}` });
  }

  bridgeHistory.set(histKey, histMap.get(fakeChatId) || []);

  await mirrorToGroup(`🐱 <b>[m5]</b> ${reply}`);

  return res.json({ ok: true, from: 'm5', text: reply, conversationId });
});

router.post('/outbound', async (req: Request, res: Response) => {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const peerName = String(req.body?.peer || '').trim();
  const text = String(req.body?.text || '').trim();
  const conversationId = String(req.body?.conversationId || peerName).slice(0, 64);

  if (!peerName || !text) return res.status(400).json({ ok: false, error: 'peer and text required' });

  const peer = peers.get(peerName);
  if (!peer) return res.status(404).json({ ok: false, error: `unknown peer: ${peerName}` });

  log.info(`[outbound] peer=${peerName} text=${text.slice(0, 80)}`);

  await mirrorToGroup(`🐱 <b>[m5 → ${peerName}]</b> ${text}`);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (peer.token) headers['x-bridge-token'] = peer.token;
    const r = await fetch(peer.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ from: 'm5', text, conversationId }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      log.warn(`peer ${peerName} returned ${r.status}`);
      return res.status(502).json({ ok: false, error: `peer ${r.status}`, peerResponse: data });
    }
    return res.json({ ok: true, peer: peerName, peerResponse: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`outbound to ${peerName} failed: ${msg}`);
    return res.status(502).json({ ok: false, error: msg });
  }
});

router.get('/peers', (req: Request, res: Response) => {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const list = Array.from(peers.values()).map(p => ({ name: p.name, endpoint: p.endpoint, hasToken: !!p.token }));
  return res.json({ ok: true, peers: list });
});

router.put('/peers/:name', (req: Request, res: Response) => {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const name = req.params.name;
  const endpoint = String(req.body?.endpoint || '').trim();
  const token = req.body?.token ? String(req.body.token).trim() : undefined;
  if (!endpoint) return res.status(400).json({ ok: false, error: 'endpoint required' });
  peers.set(name, { name, endpoint, token });
  log.info(`peer registered: ${name} → ${endpoint}`);
  return res.json({ ok: true, peer: { name, endpoint, hasToken: !!token } });
});

router.delete('/peers/:name', (req: Request, res: Response) => {
  if (!authOk(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  const name = req.params.name;
  const existed = peers.delete(name);
  return res.json({ ok: true, removed: existed });
});

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export default router;
