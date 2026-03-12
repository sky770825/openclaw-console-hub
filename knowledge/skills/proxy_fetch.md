# OpenClaw_proxy_fetch

## 能力描述
透過 OpenClaw Server 代理呼叫外部 API，自動處理身份驗證與金鑰注入。

## 輸入參數
- url: 目標 API URL (必填)
- method: HTTP 方法 (GET/POST/PUT/DELETE)
- body: 請求主體 (JSON)

## 執行規範
- 安全性：Key 不會暴露在 Client 端，由 Server 內部注入。
- 白名單：僅限信任的服務（如 Gemini, Kimi, Anthropic）。

## 輸出預期
API 回傳的 JSON 內容。