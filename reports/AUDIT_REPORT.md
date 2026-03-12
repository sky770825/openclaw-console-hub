# 【小蔡執行-AUDIT_FORCE_TEST_CONFIG】調查報告

## 執行時間
2026-02-14 17:55:00

## 調查結果

### 來源確認
**FORCE TEST 訊息來源已確認：**
- **檔案位置**: `/Users/caijunchang/openclaw任務面版設計/server/src/index.ts`
- **API Endpoint**: `/api/telegram/force-test` (第 2832 行)
- **伺服器**: OpenClaw TaskBoard Server (port 3011)

### 端點程式碼
```typescript
app.all('/api/telegram/force-test', async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  // ... 發送訊息邏輯
  const text =
    `🧪 <b>OpenClaw FORCE TEST</b>\n\n` +
    `<b>time:</b> <code>${ts}</code>\n` +
    `<b>nonce:</b> <code>${nonce}</code>\n\n` +
    `若你看不到這則，但 API 回 ok=true，通常是 Telegram 客戶端/帳號/封存/ thread 視角問題。`;
  // ...
});
```

### 檢查項目結果

| 優先級 | 檢查項目 | 結果 |
|--------|----------|------|
| P0 | Cron Jobs | ✅ 無相關 force-test 任務 |
| P1 | 自動化腳本 | ✅ 無相關呼叫 |
| P2 | 設定檔 | ✅ 無相關設定 |
| P3 | Task Board API 原始碼 | ✅ 找到端點，但為被動式 |
| P4 | 系統進程 | ✅ Port 3011 由 OpenClaw Server 使用 |

### 觸發方式分析

1. **Dashboard Web UI**: 有「🧪 強制測試」按鈕（手動觸發）
2. **直接 API 呼叫**: 任何 HTTP 請求到 `http://127.0.0.1:3011/api/telegram/force-test` 都會觸發
3. **無自動觸發機制**: 未發現 cron job、腳本或 server 端自動觸發

### 結論

**問題根因**: 有某個「外部程式」在定期呼叫 `/api/telegram/force-test` API endpoint。

可能的外部來源：
- 瀏覽器擴充功能
- 自動化工具 (如 Selenium, Puppeteer)
- 其他背景程式
- 某個未知的 health check 機制

## 關閉方法

### 方法一：暫時停用 Endpoint（推薦）
```bash
# 1. 編輯 server 原始碼
nano ~/openclaw任務面版設計/server/src/index.ts

# 2. 找到第 2832 行，註解掉或刪除整個 endpoint
# 將：
# app.all('/api/telegram/force-test', async (_req, res) => {
#   ...
# });
# 改為註解或刪除

# 3. 重新編譯並重啟 server
cd ~/openclaw任務面版設計/server
npm run build
pkill -f "server/dist/index.js"
node dist/index.js &
```

### 方法二：找出並停止外部呼叫來源
```bash
# 監控誰在呼叫此 API
# 在 server log 中加入請求來源記錄
# 或使用 tcpdump/network monitor
```

### 方法三：加入認證機制
修改 endpoint 需要 API key 才能呼叫（需要修改程式碼）。

## 驗證結果

- [x] 確認 endpoint 位置
- [x] 確認無 cron job 自動觸發
- [x] 確認無 server 端自動觸發
- [ ] 找出外部呼叫來源（需要額外監控）

## 建議

1. **立即**: 使用方法一暫時停用 endpoint，停止騷擾
2. **後續**: 在 server 中加入請求來源記錄，找出是哪個外部程式在呼叫
3. **長期**: 為此 endpoint 加入認證機制

---
任務 ID: audit-force-test-config-v1
執行 ID: codex-audit-force-001
