/**
 * TelegramAdapter — PlatformAdapter 的 Telegram 實作骨架
 *
 * ⚠️ 目前只是 thin wrapper 範例：
 *   - `send` / `sendImage` / `sendTyping` 委託給現有 utils/telegram.ts
 *   - `onMessage` 用 EventEmitter 發射事件
 *   - `connect` / `disconnect` 只做狀態管理，**不啟動** polling（避免和
 *     bot-polling.ts 衝突）
 *
 * TODO: 未來從 bot-polling.ts 漸進搬入：
 *   - getUpdates long-polling loop
 *   - update → PlatformMessage 正規化（含 photo / voice / reply_to_message）
 *   - callback_query / inline keyboard 事件
 *   - 多 bot token 路由（主控 bot / crew bots）
 *   - message 去重（update_id 快取）
 */

import { EventEmitter } from 'node:events';
import { createLogger } from '../../logger.js';
import {
  sendTelegramMessageToChat,
  sendTelegramMessageAndGetId,
} from '../../utils/telegram.js';
import type {
  MessageHandler,
  PlatformAdapter,
  PlatformMessage,
  SendOptions,
} from './base.js';

const log = createLogger('telegram-adapter');

/** TelegramAdapter 設定 */
export type TelegramAdapterOptions = {
  /** Bot token；預設讀 TELEGRAM_BOT_TOKEN */
  token?: string;
  /** Adapter 名稱（多 bot 部署時用於區分 log） */
  label?: string;
};

export class TelegramAdapter implements PlatformAdapter {
  readonly name = 'telegram' as const;

  private readonly emitter = new EventEmitter();
  private readonly token?: string;
  private readonly label: string;
  private connected = false;

  constructor(opts: TelegramAdapterOptions = {}) {
    this.token = opts.token?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();
    this.label = opts.label || 'telegram';
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    if (!this.token) {
      log.warn({ label: this.label }, '[TelegramAdapter] 未設定 token，connect 跳過');
      return;
    }
    // TODO: 未來從 bot-polling.ts 搬入 getUpdates 迴圈，並把每筆 update
    //       轉成 PlatformMessage 後呼叫 this.emit('message', ...)
    this.connected = true;
    log.info({ label: this.label }, '[TelegramAdapter] connected (skeleton, no polling)');
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    // TODO: 停止 polling loop、清空 EventEmitter、flush pending queue
    this.emitter.removeAllListeners();
    this.connected = false;
    log.info({ label: this.label }, '[TelegramAdapter] disconnected');
  }

  async send(
    chatId: string,
    text: string,
    opts: SendOptions = {}
  ): Promise<{ messageId: string }> {
    const parseMode = this.mapParseMode(opts.parseMode);
    // sendTelegramMessageAndGetId 會回傳 message_id；失敗時為 null
    // TODO: disableWebPagePreview / replyToId 目前 utils 尚未支援，
    //       後續擴充 sendTelegramMessageToChat 參數時一併打通
    const messageId = await sendTelegramMessageAndGetId(chatId, text, {
      token: this.token,
      ...(parseMode ? { parseMode } : {}),
    });
    if (messageId === null) {
      // 退回到 fire-and-forget（長訊息 / 分段）
      await sendTelegramMessageToChat(chatId, text, {
        token: this.token,
        ...(parseMode ? { parseMode } : {}),
      });
      return { messageId: '' };
    }
    return { messageId: String(messageId) };
  }

  async sendTyping(chatId: string): Promise<void> {
    if (!this.token) return;
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      });
    } catch (err) {
      log.warn({ err, chatId }, '[TelegramAdapter] sendTyping failed');
    }
  }

  async sendImage(chatId: string, imageUrl: string, caption?: string): Promise<void> {
    if (!this.token) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          ...(caption ? { caption } : {}),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        log.warn({ status: res.status, detail: detail.slice(0, 300) }, '[TelegramAdapter] sendImage failed');
      }
    } catch (err) {
      log.warn({ err, chatId }, '[TelegramAdapter] sendImage error');
    }
  }

  onMessage(handler: MessageHandler): void {
    this.emitter.on('message', (msg: PlatformMessage) => {
      handler(msg).catch((err) => {
        log.error({ err }, '[TelegramAdapter] message handler threw');
      });
    });
  }

  /**
   * 內部使用：把平台無關的 parseMode 對應到 utils/telegram.ts 接受的格式
   * TODO: 搬入 bot-polling.ts 正規化邏輯後，這裡可直接接 update 事件源
   */
  protected emitMessage(msg: PlatformMessage): void {
    this.emitter.emit('message', msg);
  }

  private mapParseMode(mode?: SendOptions['parseMode']): 'HTML' | 'MarkdownV2' | undefined {
    if (!mode || mode === 'none') return undefined;
    return mode;
  }
}
