import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import type { Config } from "./types.js";
import type { EmailMessage } from "./types.js";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.modify"];

function getOAuth2Client(config: NonNullable<Config["gmail"]>) {
  const { clientId, clientSecret, redirectUri } = config;
  if (!clientId || !clientSecret) {
    throw new Error("Gmail 需設定 clientId 與 clientSecret（OAuth2）");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri || "http://localhost");
}

function getAuth(config: NonNullable<Config["gmail"]>) {
  const tokenPath = config.tokenPath ? path.resolve(config.tokenPath) : path.join(process.cwd(), "gmail-token.json");
  const oauth2 = getOAuth2Client(config);
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    oauth2.setCredentials(token);
    return oauth2;
  }
  if (config.keyFile && fs.existsSync(path.resolve(config.keyFile))) {
    return google.auth.fromJSON(JSON.parse(fs.readFileSync(path.resolve(config.keyFile), "utf-8"))) as any;
  }
  throw new Error(
    `尚未取得 Gmail 授權。請先執行一次授權流程並將 token 存到 ${tokenPath}，或設定 keyFile（Service Account）。`
  );
}

/**
 * 取得未讀郵件列表並回傳統一格式
 */
export async function fetchUnreadGmail(config: Config): Promise<EmailMessage[]> {
  const gmailConfig = config.gmail;
  if (!gmailConfig) throw new Error("未設定 gmail");

  const auth = getAuth(gmailConfig);
  const gmail = google.gmail({ version: "v1", auth });
  const userId = gmailConfig.userEmail || "me";

  const listRes = await gmail.users.messages.list({
    userId,
    q: "is:unread",
    maxResults: config.maxUnread ?? 20,
  });

  const messages = listRes.data.messages ?? [];
  const results: EmailMessage[] = [];

  for (const m of messages) {
    const id = m.id!;
    const full = await gmail.users.messages.get({ userId, id, format: "full" });
    const payload = full.data.payload!;
    const headers = payload.headers ?? [];
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    let bodyText = "";
    let bodyHtml: string | undefined;

    if (payload.body?.data) {
      bodyText = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const mimeType = (part.mimeType || "").toLowerCase();
        const data = part.body?.data;
        if (!data) continue;
        const decoded = Buffer.from(data, "base64url").toString("utf-8");
        if (mimeType === "text/plain") bodyText = bodyText || decoded;
        else if (mimeType === "text/html") bodyHtml = decoded;
      }
    }

    const snippet = (full.data as any).snippet as string | undefined;
    results.push({
      id,
      messageId: getHeader("Message-ID") || undefined,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: new Date(getHeader("Date") || 0),
      bodyText: bodyText || snippet || "",
      bodyHtml,
      snippet,
    });
  }

  return results;
}

/**
 * 發送郵件（Gmail API）
 */
export async function sendGmailReply(
  config: Config,
  to: string,
  subject: string,
  bodyText: string,
  rfcMessageId?: string
): Promise<void> {
  const gmailConfig = config.gmail;
  if (!gmailConfig) throw new Error("未設定 gmail");

  const auth = getAuth(gmailConfig);
  const gmail = google.gmail({ version: "v1", auth });
  const userId = gmailConfig.userEmail || "me";

  const subjectEnc = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
  const lines = [
    `To: ${to}`,
    `Subject: ${subjectEnc}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    bodyText,
  ];
  if (rfcMessageId) {
    lines.splice(2, 0, `In-Reply-To: ${rfcMessageId}`, `References: ${rfcMessageId}`);
  }
  const raw = Buffer.from(lines.join("\r\n")).toString("base64url");

  await gmail.users.messages.send({
    userId,
    requestBody: { raw },
  });
}

/**
 * 標記郵件為已讀（可選，用於避免重複處理）
 */
export async function markGmailRead(config: Config, messageId: string): Promise<void> {
  const gmailConfig = config.gmail;
  if (!gmailConfig) return;

  const auth = getAuth(gmailConfig);
  const gmail = google.gmail({ version: "v1", auth });
  const userId = gmailConfig.userEmail || "me";

  await gmail.users.messages.modify({
    userId,
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}
