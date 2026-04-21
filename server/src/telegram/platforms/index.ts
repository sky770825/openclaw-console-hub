/**
 * PlatformAdapter barrel export
 *
 * 上層 import 範例：
 *   import { TelegramAdapter, type PlatformAdapter, type PlatformMessage } from '../platforms/index.js';
 */

export type {
  PlatformName,
  PlatformMessage,
  SendOptions,
  MessageHandler,
  PlatformAdapter,
} from './base.js';

export { TelegramAdapter } from './telegram-adapter.js';
export type { TelegramAdapterOptions } from './telegram-adapter.js';
