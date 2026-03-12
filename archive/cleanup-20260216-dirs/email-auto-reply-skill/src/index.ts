#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { fetchUnreadGmail } from "./gmail.js";
import { fetchUnreadImap } from "./imap.js";
import { processOneEmail } from "./draft.js";

async function main(): Promise<void> {
  const configPath = process.env.CONFIG_PATH || process.argv[2];
  const config = loadConfig(configPath);

  console.log("正在取得未讀郵件…");
  const emails =
    config.provider === "gmail" ? await fetchUnreadGmail(config) : await fetchUnreadImap(config);

  if (emails.length === 0) {
    console.log("沒有未讀郵件。");
    return;
  }

  console.log(`找到 ${emails.length} 封未讀郵件。`);
  const sendNow = process.env.AUTO_SEND === "1" || process.env.AUTO_SEND === "true";

  for (const email of emails) {
    try {
      console.log(`處理：${email.subject} (${email.from})`);
      const result = await processOneEmail(config, email, { sendNow });
      console.log("  AI 分析：", result.analysis.slice(0, 100) + (result.analysis.length > 100 ? "…" : ""));
      console.log("  回覆草稿長度：", result.draft.length, "字元");
      if (result.sent) console.log("  已發送。");
      else console.log("  未發送（sendAfterConfirm=true 或非 Gmail）。請手動複製草稿或設定 AUTO_SEND=1。");
    } catch (err) {
      console.error("  處理失敗：", err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
