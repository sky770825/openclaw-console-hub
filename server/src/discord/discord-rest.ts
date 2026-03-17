/**
 * Discord REST API 工具
 * 用原生 fetch，不依賴 discord.js
 */

import { createLogger } from '../logger.js';
import { DISCORD_BOT_TOKEN } from './discord-config.js';

const log = createLogger('discord-rest');

const DISCORD_API = 'https://discord.com/api/v10';
const CHUNK_LIMIT = 1900;  // Discord 上限 2000，留 buffer

/** 訊息分段（同 Telegram chunker 邏輯） */
function chunkMessage(text: string): string[] {
  if (text.length <= CHUNK_LIMIT) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_LIMIT) { chunks.push(remaining); break; }
    let splitAt = remaining.lastIndexOf('\n\n', CHUNK_LIMIT);
    if (splitAt < CHUNK_LIMIT * 0.3) splitAt = remaining.lastIndexOf('\n', CHUNK_LIMIT);
    if (splitAt < CHUNK_LIMIT * 0.3) splitAt = remaining.lastIndexOf(' ', CHUNK_LIMIT);
    if (splitAt < CHUNK_LIMIT * 0.3) splitAt = CHUNK_LIMIT;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

/** 簡易限速佇列（每頻道 5 msg / 5s） */
const channelTimestamps = new Map<string, number[]>();

async function waitForRateLimit(channelId: string): Promise<void> {
  const now = Date.now();
  const timestamps = channelTimestamps.get(channelId) || [];
  const recent = timestamps.filter(t => now - t < 5000);
  if (recent.length >= 4) {
    const waitMs = 5000 - (now - recent[0]);
    if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
  }
  recent.push(Date.now());
  channelTimestamps.set(channelId, recent.slice(-5));
}

/** 發送 Discord 訊息（自動分段 + 限速） */
export async function sendDiscordMessage(
  channelId: string,
  content: string,
  options?: { prefix?: string }
): Promise<boolean> {
  if (!DISCORD_BOT_TOKEN) return false;

  const text = options?.prefix ? `${options.prefix}\n${content}` : content;
  const chunks = chunkMessage(text);

  for (let i = 0; i < chunks.length; i++) {
    await waitForRateLimit(channelId);

    const chunk = chunks.length > 1
      ? `${chunks[i]}\n\n📄 (${i + 1}/${chunks.length})`
      : chunks[i];

    try {
      const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: chunk }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        log.error({ status: res.status, detail: detail.slice(0, 300) }, '[Discord] send failed');
        return false;
      }
    } catch (err) {
      log.error({ err }, '[Discord] send error');
      return false;
    }

    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return true;
}
