# Daily Report Agent 🤖

每日監控報告自動生成器。讀取監控日誌，用 Ollama AI 整理重點，發送 Telegram 通知。

## 功能

✅ 讀取監控日誌（從 `dashboard-monitor.sh` 或本地日誌檔案）  
✅ 使用 Ollama (qwen3:8b) 生成中文摘要  
✅ 發送 Telegram 通知  
✅ 儲存報告到 `logs/daily-reports/`  

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置（可選）

如果自動檢測不到 Telegram Token，請手動設定：

```bash
cp .env.example .env
# 編輯 .env，設定 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID
```

或使用現有配置：
- Bot Token 會自動從 `~/.openclaw/config/telegram.env` 讀取
- Chat ID 預設為 `5819565005`（老蔡的 Telegram ID）

### 3. 運行

```bash
# 開發模式（使用 ts-node）
npm run dev

# 編譯並運行
npm run build
npm start

# 一行命令測試
npx ts-node src/index.ts
```

## 輸出示例

```
🚀 Daily Report Agent started...
📖 Reading logs...
🤖 Generating summary with Ollama...
📤 Sending to Telegram...
💾 Saving report...
✅ Daily report generation completed!
```

## 報告保存位置

報告保存在 `logs/daily-reports/report-YYYY-MM-DD.json`

格式：
```json
{
  "timestamp": "2026-02-12T...",
  "logs": "original log content...",
  "summary": "AI generated summary in Chinese"
}
```

## 依賴項

- **axios**: HTTP 客戶端，用於調用 Ollama API 和 Telegram API
- **dotenv**: 環境變數管理
- **winston**: 日誌記錄（可選，目前未使用）
- **TypeScript**: 型別安全開發

## 前置要求

- ✅ Ollama 本地運行中（http://localhost:11434）
- ✅ Ollama 安裝了 qwen3:8b 模型
- ✅ Telegram Bot Token（可選，沒有時會跳過通知）
- ✅ Node.js 18+

## 整合到 Cron 排程

定時運行（每日早上 8 點）：

```bash
# 編輯 crontab
crontab -e

# 加入以下行
0 8 * * * cd /path/to/daily-report-agent && npm run start >> logs/cron.log 2>&1
```

## 架構

```
daily-report-agent/
├── src/
│   └── index.ts          # 核心 Agent 邏輯
├── dist/                 # 編譯後的 JavaScript
├── logs/
│   └── daily-reports/    # 生成的報告
├── package.json
├── tsconfig.json
└── README.md
```

## 下一步

1. ✅ 本地測試（執行 `npm run dev`）
2. 🔄 驗證 Ollama 能正常回應
3. 🔄 驗證 Telegram 通知能發送
4. 📦 包裝成 Skill 上架到 ClawHub
5. ⏰ 設定 Cron 任務定時運行

## 疑難排解

**Q: 連不到 Ollama**  
A: 確保 Ollama 已啟動 (`ollama serve`)

**Q: qwen3:8b 模型沒裝**  
A: 執行 `ollama pull qwen3:8b`

**Q: Telegram 沒收到通知**  
A: 檢查 Bot Token 和 Chat ID 是否正確

---

**開發者**: CoDEX Agent  
**製作日期**: 2026-02-12
