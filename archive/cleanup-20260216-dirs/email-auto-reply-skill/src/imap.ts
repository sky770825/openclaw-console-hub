import Imap from "imap";
import { simpleParser } from "mailparser";
import type { Config } from "./types.js";
import type { EmailMessage } from "./types.js";

function connect(config: NonNullable<Config["imap"]>): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
    });
    imap.once("ready", () => resolve(imap));
    imap.once("error", (err) => reject(err));
    imap.connect();
  });
}

function openBox(imap: Imap, mailbox: string): Promise<void> {
  return new Promise((resolve, reject) => {
    imap.openBox(mailbox, false, (err) => (err ? reject(err) : resolve()));
  });
}

function searchUnread(imap: Imap): Promise<number[]> {
  return new Promise((resolve, reject) => {
    imap.search(["UNSEEN"], (err, results) => (err ? reject(err) : resolve(results ?? [])));
  });
}

function fetchMessage(imap: Imap, seq: number): Promise<EmailMessage> {
  return new Promise((resolve, reject) => {
    const f = imap.fetch([seq], { bodies: "" });
    f.on("message", (msg) => {
      let buffer = "";
      msg.on("body", (stream) => {
        stream.on("data", (chunk) => (buffer += chunk.toString("utf-8")));
      });
      msg.once("end", async () => {
        try {
          const parsed = await simpleParser(buffer);
          resolve({
            id: `imap-${seq}`,
            messageId: parsed.messageId ?? undefined,
            from: parsed.from?.text ?? "",
            to: parsed.to?.text ?? "",
            subject: parsed.subject ?? "",
            date: parsed.date ?? new Date(0),
            bodyText: parsed.text ?? "",
            bodyHtml: parsed.html ?? undefined,
            snippet: (parsed.text ?? "").slice(0, 200),
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    f.once("error", reject);
  });
}

/**
 * 取得未讀郵件列表（IMAP）
 */
export async function fetchUnreadImap(config: Config): Promise<EmailMessage[]> {
  const imapConfig = config.imap;
  if (!imapConfig) throw new Error("未設定 imap");

  const imap = await connect(imapConfig);
  try {
    const mailbox = imapConfig.mailbox ?? "INBOX";
    await openBox(imap, mailbox);

    const maxUnread = config.maxUnread ?? 20;
    const seqs = await searchUnread(imap);
    const toFetch = seqs.slice(0, maxUnread);

    const results: EmailMessage[] = [];
    for (const seq of toFetch) {
      results.push(await fetchMessage(imap, seq));
    }
    return results;
  } finally {
    imap.end();
  }
}

/**
 * 發送郵件需透過 SMTP，此專案 MVP 僅實作「產生草稿」；若 provider 為 imap，可於 README 說明需另配 SMTP 或僅使用草稿。
 * 此處提供標記已讀的輔助（若 IMAP 支援）。
 */
export async function markImapRead(config: Config, _messageId: string): Promise<void> {
  const imapConfig = config.imap;
  if (!imapConfig) return;
  // MVP: 可選實作 IMAP STORE 標記 \Seen，暫略
}
