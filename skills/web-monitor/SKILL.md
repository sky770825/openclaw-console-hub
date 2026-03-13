---
name: web-monitor
description: |
  定時監控網頁內容變更，檢測差異並發送通知。
  
  使用時機：
  1. 當需要追蹤網站更新（如價格變動、新聞發布、內容修改）
  2. 當需要定時檢查特定網頁狀態
  3. 當希望在網頁內容變化時收到通知
  4. 當需要監控競爭對手網站、產品頁面、新聞來源
---

# Web Monitor - 網頁內容監控技能

定時抓取網頁內容、比對差異、有更新時觸發通知（Telegram/Discord/Slack）。

## 快速開始

### 1. 新增監控項目

```bash
python3 scripts/monitor.py add "https://example.com/news" "新聞頁面" --interval 30
```

### 2. 設置通知

**Telegram：**
```bash
# 創建 Bot: 找 @BotFather 取得 Token
# 取得 Chat ID: 發訊息給 @userinfobot

export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

**Discord：**
```bash
# 頻道設定 → 整合 → Webhook → 複製 URL

export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

### 3. 啟用定時監控

```bash
# 每 30 分鐘檢查一次
./scripts/scheduler.sh enable 30
```

### 4. 立即測試

```bash
./scripts/scheduler.sh run
```

## 指令參考

### monitor.py - 核心監控

```bash
# 新增監控
python3 scripts/monitor.py add <URL> <名稱> [--selector <CSS選擇器>] [--interval <分鐘>]

# 列出所有監控
python3 scripts/monitor.py list

# 執行檢查
python3 scripts/monitor.py check [--id <監控ID>] [--notify]

# 啟用/停用
python3 scripts/monitor.py enable <ID>
python3 scripts/monitor.py disable <ID>

# 移除監控
python3 scripts/monitor.py remove <ID>
```

### scheduler.sh - 定時任務

```bash
# 啟用定時監控（每 N 分鐘）
./scripts/scheduler.sh enable <分鐘>

# 停用定時監控
./scripts/scheduler.sh disable

# 查看狀態
./scripts/scheduler.sh status

# 立即執行一次
./scripts/scheduler.sh run

# 設置通知
./scripts/scheduler.sh setup-telegram
./scripts/scheduler.sh setup-discord
./scripts/scheduler.sh setup-slack
```

### notify.py - 發送通知

```bash
# 發送 Telegram 通知
python3 scripts/notify.py --telegram --message "內容已更新"

# 格式化通知（監控變化）
python3 scripts/notify.py --telegram --url "..." --diff "..." --monitor-name "..."
```

## 進階用法

### 監控特定區域

使用 CSS 選擇器只監控頁面的特定部分：

```bash
python3 scripts/monitor.py add \
  "https://example.com/product" \
  "產品價格" \
  --selector ".price-container" \
  --interval 60
```

### 多個監控項目

```bash
# 監控不同頁面
python3 scripts/monitor.py add "https://site-a.com/news" "A站新聞" --interval 30
python3 scripts/monitor.py add "https://site-b.com/blog" "B站部落格" --interval 60
python3 scripts/monitor.py add "https://site-c.com/price" "C站價格" --interval 15

# 查看所有項目
python3 scripts/monitor.py list
```

### 手動 Cron 設置

如果不想使用 scheduler.sh，可以直接編輯 crontab：

```bash
# 編輯定時任務
crontab -e

# 添加行（每小時執行）
0 * * * * /path/to/web-monitor/scripts/run-check.sh >> ~/.web-monitor/cron.log 2>&1
```

## 通知格式

當檢測到變化時，通知會包含：

```
🚨 網頁內容變化檢測

📌 監控項目: 產品價格
🔗 網址: https://example.com/product
🕐 時間: 2026-02-14 15:30:00

📊 變化摘要:
內容增加 125 字符 (1024 → 1149)
快照已保存: ~/.web-monitor/snapshots/abc123_20260214_153000.html

---
由 Web Monitor 自動發送
```

## 資料存儲

所有資料存儲在 `~/.web-monitor/`：

```
~/.web-monitor/
├── monitors.json          # 監控配置
├── snapshots/             # 網頁快照
│   ├── abc123_20260214_143000.html
│   └── abc123_20260214_153000.html
├── scheduler.log          # 定時任務日誌
├── telegram.env           # Telegram 配置
├── discord.env            # Discord 配置
└── slack.env              # Slack 配置
```

## 故障排除

### 無法收到通知

1. 檢查環境變數是否設置
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   ```

2. 手動測試通知
   ```bash
   python3 scripts/notify.py --telegram --message "測試"
   ```

3. 檢查日誌
   ```bash
   tail -f ~/.web-monitor/scheduler.log
   ```

### 檢查失敗

1. 測試單個監控
   ```bash
   python3 scripts/monitor.py check --id <監控ID>
   ```

2. 檢查網址可訪問性
   ```bash
   curl -I <網址>
   ```

### 定時任務未執行

1. 檢查 cron 服務
   ```bash
   crontab -l | grep web-monitor
   ```

2. 檢查腳本權限
   ```bash
   ls -la scripts/*.sh scripts/*.py
   ```

## 限制與注意

- 使用 `curl` 抓取，不執行 JavaScript（靜態內容為主）
- 預設抓取超時 30 秒
- 保留最近 10 個快照
- 哈希比對基於完整 HTML，微小變化也會觸發

## 完整流程範例

```bash
# 1. 進入技能目錄
cd skills/web-monitor

# 2. 設置 Telegram（假設已有 Token 和 Chat ID）
export TELEGRAM_BOT_TOKEN="123456:ABC-DEF..."
export TELEGRAM_CHAT_ID="123456789"

# 3. 新增監控
python3 scripts/monitor.py add \
  "https://news.ycombinator.com/" \
  "Hacker News 首頁" \
  --interval 30

# 4. 啟用定時監控
./scripts/scheduler.sh enable 30

# 5. 立即測試
./scripts/scheduler.sh run

# 6. 查看狀態
./scripts/scheduler.sh status
```

現在每 30 分鐘會自動檢查，如有變化會發送 Telegram 通知！
