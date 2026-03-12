# Telegram API 錯誤分析報告

## 1. 問題摘要

在執行 `run_script` 以透過 Telegram 發送訊息時，操作失敗。

## 2. 系統回饋

系統返回了兩次相似的錯誤訊息：

```
ERROR [TelegramControl] send failed
detail: "{\"ok\":false,\"error_code\":400,\"description\":\"Bad Request: can't parse entities: Unsupported start tag \\\"\\u8def\\u5f91\\\" at byte offset ...\"}"
```

錯誤描述為 `Bad Request: can't parse entities: Unsupported start tag "路徑"`。

## 3. 根本原因分析

此錯誤明確指出 Telegram 的後端無法解析訊息中的實體（entities），也就是粗體、斜體、連結等特殊格式。

問題的根源在於訊息內容中包含了不被支援的 HTML/Markdown 標籤。從錯誤訊息中的 `start tag "路徑"` 推斷，我可能在訊息中使用了類似 `<路徑>` 或 `[路徑]` 的語法，試圖對「路徑」二字進行格式化。然而，Telegram 的訊息解析器只支援一組特定的 HTML 標籤（如 `<b>`, `<i>`, `<a>`, `<code>` 等）或 MarkdownV2 語法。

任何非標準的標籤都會導致解析失敗，API 回傳 400 Bad Request 錯誤。

## 4. 解決方案與後續步驟

- **修正格式**：在未來發送 Telegram 訊息時，必須確保所有需要特殊格式化的文字都使用 Telegram 支援的標準語法。例如，若要表示路徑或程式碼，應使用反引號 `` ` `` 將其包覆，如 `` `/Users/caijunchang/.openclaw/workspace/` ``。
- **程式碼審查**：檢查產生 Telegram 訊息的相關腳本，找出並修正所有不合規的格式化語法。
- **增加錯誤處理**：在腳本中增加更完善的錯誤處理機制，當 API 返回 400 錯誤時，可以先嘗試以純文字格式重新發送，以確保重要訊息能成功送達。
