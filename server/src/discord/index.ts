/**
 * Discord 模組入口
 * 啟動 Gateway + Bridge
 */

import { createLogger } from '../logger.js';
import { DISCORD_BOT_TOKEN } from './discord-config.js';
import { startDiscordGateway, stopDiscordGateway } from './discord-gateway.js';
import { handleDiscordMessage, registerThinkFn } from './discord-bridge.js';

const log = createLogger('discord');

export { bridgeToDiscord } from './discord-bridge.js';
export { sendDiscordMessage } from './discord-rest.js';
export { DISCORD_ALERT, DISCORD_TASK_REPORT, DISCORD_COMMAND_CENTER } from './discord-config.js';

/**
 * 啟動 Discord 橋接
 * @param thinkFn AI 思考函數（從 crew-think 注入）
 */
export function startDiscordBridge(thinkFn?: (botId: string, text: string, senderName: string) => Promise<string>): void {
  if (!DISCORD_BOT_TOKEN) {
    log.info('[Discord] No DISCORD_BOT_TOKEN, bridge disabled');
    return;
  }

  if (thinkFn) {
    registerThinkFn(thinkFn);
  }

  startDiscordGateway(handleDiscordMessage);
  log.info('[Discord] Bridge started — Telegram ↔ Discord sync enabled');
}

/** 停止 Discord 橋接 */
export function stopDiscordBridge(): void {
  stopDiscordGateway();
  log.info('[Discord] Bridge stopped');
}
