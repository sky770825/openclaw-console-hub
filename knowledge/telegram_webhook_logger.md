# Telegram Webhook Logger 知識文件

## 1. 用途 (Description)
`telegram_logger_webhook.py` 是一個基於 Python 的工具，旨在接收 Telegram Bot API 的 Webhook 回調。它的核心功能是攔截傳入的訊息 JSON Payload，並將其記錄到日誌系統中，這對於調試機器人行為、監控通訊流以及分析用戶交互非常有用。

## 2. 配置 (Configuration)
根據原始碼分析，該工具通常涉及以下配置項：
```python
  BOT_TOKEN = "8316840422:AAH3jcMMGB552XQEdlhyU2j0BPNXVAn57hE"  # 群組即時通知Bot @HOMEeeee168bot
  LOG_FILE_PATH = "/Users/sky770825/.openclaw/workspace/reports/group_chat_log.md"
          log_directory = os.path.dirname(LOG_FILE_PATH)
          with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
```

## 3. 部署指南 (Deployment)
### 環境需求
- Python 3.x
- Flask 或其它依賴庫 (視實作而定)

### 執行方式
```bash
python3 /Users/sky770825/.openclaw/workspace/scripts/telegram_logger_webhook.py
```

## 4. 使用說明 (Usage)
1. **設定 Webhook**: 您需要將機器人的 Webhook URL 指向此腳本運行的伺服器位址。
   - API: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_SERVER_URL>`
2. **日誌查閱**: 腳本會將接收到的訊息輸出至標準輸出 (stdout) 或指定的日誌檔案。

---
## 檔案資訊
- **原始路徑**: `/Users/sky770825/.openclaw/workspace/scripts/telegram_logger_webhook.py`
- **建立日期**: 2026-03-04 12:30:01
