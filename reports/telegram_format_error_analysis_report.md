# Telegram 訊息發送失敗分析報告

## 1. 問題摘要

前一步驟中，自動化腳本在嘗試透過 Telegram API 發送通知訊息時，操作失敗。

## 2. 錯誤日誌

關鍵錯誤訊息如下：
```log
ERROR [TelegramControl] send failed
detail: "{\"ok\":false,\"error_code\":400,\"description\":\"Bad Request: can't parse entities: Unsupported start tag \\\"\u8def\u5f91\\\" at byte offset ...\"}"
```

## 3. 根本原因分析

錯誤訊息 `can't parse entities: Unsupported start tag "路徑"` 明確指出，問題出在發送給 Telegram 的訊息本文格式。訊息中包含了自訂的 `<路徑>` 標籤，但 Telegram 的訊息解析模式（ParseMode=HTML）不支援此標籤，導致 API 請求被拒絕。

## 4. 解決方案與後續步驟

**解決方案：**
修改訊息產生的腳本，停止使用 `<路徑>` 標籤。將改用以下其中一種 Telegram 支援的格式來呈現路徑：

1.  **使用 `<code>` 標籤**：將路徑包在 `<code>` 與 `</code>` 之間，例如 `<code>/path/to/file</code>`。
2.  **使用純文字**：直接以「路徑：/path/to/file」的形式呈現。

**下一步行動：**

*   定位並修改產生 Telegram 訊息的相關腳本。
*   將 `<路徑>` 標籤替換為 `<code>` 標籤。
*   重新執行發送任務以驗證修正是否成功。
