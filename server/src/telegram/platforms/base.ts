/**
 * PlatformAdapter — 跨通訊平台的統一抽象層
 *
 * 設計參考：Hermes Agent 的 gateway/platforms/base.py
 * 目的：把 Telegram / Discord / LINE / Slack 等不同平台的 API 差異封裝在 adapter 內，
 *      上層（bot 主邏輯、crew-think、action-handlers）只面對 PlatformMessage + adapter 介面。
 *
 * 本檔只定義型別與介面，不含任何平台專屬實作。
 */

/** 目前支援（或計畫支援）的通訊平台 */
export type PlatformName = 'telegram' | 'discord' | 'line' | 'slack';

/** 跨平台的使用者訊息（由 adapter 從平台原生 payload 正規化而來） */
export type PlatformMessage = {
  /** 來源平台 */
  platform: PlatformName;
  /** 對話 ID（Telegram chat_id / Discord channel_id / LINE roomId 等） */
  chatId: string;
  /** 使用者 ID（Telegram from.id / Discord author.id 等） */
  userId: string;
  /** 使用者顯示名稱（可選） */
  userName?: string;
  /** 文字內容（若原訊息無文字則為空字串） */
  text: string;
  /** 圖片附件（若有） */
  image?: { url: string; mimeType?: string };
  /** 語音附件（若有） */
  voice?: { url: string };
  /** 回覆目標訊息 ID（若此訊息是 reply） */
  replyToId?: string;
  /** 原始平台 payload，保留給需要存取 platform-specific 欄位的場景 */
  raw: unknown;
};

/** 傳送訊息時的選項 */
export type SendOptions = {
  /** 回覆哪則訊息（Telegram reply_to_message_id / Discord reference 等） */
  replyToId?: string;
  /**
   * 解析模式：
   * - 'HTML'        → Telegram HTML / Discord markdown（由 adapter 映射）
   * - 'MarkdownV2'  → Telegram MarkdownV2
   * - 'none'        → 純文字
   */
  parseMode?: 'HTML' | 'MarkdownV2' | 'none';
  /** 是否關閉網址預覽（Telegram disable_web_page_preview） */
  disableWebPagePreview?: boolean;
};

/** 訊息事件 handler 簽章 */
export type MessageHandler = (msg: PlatformMessage) => Promise<void>;

/**
 * PlatformAdapter — 所有通訊平台 adapter 必須實作的介面
 *
 * 生命週期：
 *   1. `connect()`       — 建立連線 / 啟動 polling / webhook 訂閱
 *   2. `onMessage(h)`    — 註冊訊息 handler（可多個）
 *   3. `send / sendTyping / sendImage` — 對外發訊
 *   4. `disconnect()`    — 停止連線（server shutdown 時呼叫）
 */
export interface PlatformAdapter {
  /** 平台名稱（用於 log / metrics / 路由） */
  readonly name: PlatformName;

  /** 連線 / 啟動 polling 或 webhook */
  connect(): Promise<void>;

  /** 斷線 / 停止 polling，清理資源 */
  disconnect(): Promise<void>;

  /**
   * 發送文字訊息
   * @returns 平台分配的訊息 ID（供後續 edit / reply 使用）
   */
  send(chatId: string, text: string, opts?: SendOptions): Promise<{ messageId: string }>;

  /** 送出「輸入中」狀態（讓使用者看到 bot 在打字） */
  sendTyping(chatId: string): Promise<void>;

  /** 發送圖片（含選用文字 caption） */
  sendImage(chatId: string, imageUrl: string, caption?: string): Promise<void>;

  /**
   * 註冊訊息 handler
   * - adapter 收到平台事件後，轉成 PlatformMessage 並呼叫所有已註冊 handler
   * - handler 應 async，adapter 不保證等待全部完成才處理下一則
   */
  onMessage(handler: MessageHandler): void;
}
