# BrowserService 實作指南

## 核心邏輯
使用 Playwright 的 chromium 啟動 headless 瀏覽器。

## 預期 API
1. screenshot(url: string): Promise<Buffer>
2. getContent(url: string): Promise<string>
3. getPDF(url: string): Promise<Buffer>

## 注意事項
- 必須包含 try-catch 處理超時與無效 URL
- 每次執行完後確保 browser.close() 被呼叫以免內存洩漏
- 儲存路徑建議放在 .openclaw/artifacts/