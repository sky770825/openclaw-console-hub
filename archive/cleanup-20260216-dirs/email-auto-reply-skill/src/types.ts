/**
 * 統一郵件結構（Gmail / IMAP 共用）
 */
export interface EmailMessage {
  id: string;
  messageId?: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  bodyText: string;
  bodyHtml?: string;
  snippet?: string;
}

/**
 * 設定檔結構
 */
export interface Config {
  /** 郵件來源: "gmail" | "imap" */
  provider: "gmail" | "imap";
  gmail?: {
    /** 使用 OAuth2 時：client_id, client_secret, redirect_uri */
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    /** 或使用 service account 路徑 */
    keyFile?: string;
    /** 已存取的 token 路徑（OAuth 用） */
    tokenPath?: string;
    /** 要讀取的 Gmail 使用者 email（admin 用） */
    userEmail?: string;
  };
  imap?: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    /** 例如 INBOX */
    mailbox?: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  telegram?: {
    botToken: string;
    chatId: string;
    /** 是否啟用通知 */
    enabled: boolean;
  };
  /** 人工確認後發送 = true；自動發送 = false */
  sendAfterConfirm: boolean;
  /** 每次檢查最多處理幾封未讀 */
  maxUnread?: number;
}
