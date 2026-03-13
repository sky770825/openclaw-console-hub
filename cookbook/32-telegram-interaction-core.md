# 32 — Telegram 互動核心 (Telegram Interaction Core)

> 基於 server/src/telegram/bot-polling.ts 與 action-handlers.ts 的實作解析。這是 NEUXA 與主人溝通的嘴與耳。

---

## 一、Long-Polling 機制

由於本地開發環境無法直接接收 Telegram Webhook，我們採用主動輪詢 (Long-Polling) 模式。

### 1. 核心參數

- POLL_INTERVAL_MS: 1500ms (輪詢間隔)
- GET_UPDATES_TIMEOUT_SEC: 20s (長連線超時)
- offset: 記錄已處理訊息 ID，重啟時從 runtime-checkpoints/telegram-control.json 讀取，確保訊息不遺漏。

### 2. 輪詢流程

``typescript
async function poll() {
  // 1. 讀取 offset
  // 2. 呼叫 getUpdates API
  // 3. 處理新訊息 (handleUpdate)
  // 4. 更新 offset 並存檔
  // 5. 等待 POLL_INTERVAL_MS 後遞迴呼叫
}
`

---

## 二、指令路由與處理

所有訊息進入 handleUpdate 後，會經過以下判斷：

1.  權限檢查：確認 chat_id 是否在允許清單內，或 TELEGRAM_ALLOW_ANY_CHAT 是否開啟。
2.  指令識別：
    - /start: 顯示主選單 (Dashboard, TaskBoard, Models, Status)
    - /recover: 執行自救巡檢
    - /codex-triage: 進入分類診斷模式
    - /new / /reset: 重置對話 Session
3.  一般對話：如果不是指令，則進入 AI 對話流程 (darThink)。

---

## 三、Action Handlers (我的手)

當 AI 決定採取行動（輸出 JSON Action）時，action-handlers.ts 負責執行。

### 1. 安全封裝

所有檔案操作都經過 isPathSafe 檢查，禁止存取 .env 或系統敏感目錄。

### 2. 支援的 Actions

- read_file / write_file: 檔案讀寫
- run_script: 執行 Bash 指令 (30s timeout)
- create_task: 建立新任務
- ask_ai: 呼叫子代理
- query_supabase: 資料庫查詢
- proxy_fetch: 安全 API 請求

### 3. Chain Hints (連續行動引擎)

這是讓 NEUXA 能連續思考的關鍵。每個 Action 執行完後，系統會附帶一個 hint，引導模型進行下一步。

`typescript
const CHAIN_HINTS = {
  read_file: '💡 讀完了 → 現在一口氣：(1) write_file 寫分析 + index_file 索引...',
  // ...其他提示
};
`

---

## 四、擴充指南

若要新增 Telegram 指令：
1. 在 bot-polling.ts 的 handleUpdate 中新增 case。
2. 實作對應的邏輯函數。

若要新增 Action 能力：
1. 在 action-handlers.ts 的 executeNEUXAAction 中新增 case`。
2. 實作具體的執行邏輯與安全檢查。
