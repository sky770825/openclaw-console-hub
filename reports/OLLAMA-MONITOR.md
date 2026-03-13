# 🤖 Ollama 任務監控系統 v2

無成本、主動通知的任務板監控方案。

## 系統架構

```
任務板 (Port 3011)
    ↓
Ollama 本地監控 (免費) — 每 10 分鐘檢查
    ↓ 有異常
Telegram「AI指揮中心」群組
    ↓ @達爾
達爾 (按量計費) — 只在需要時介入
```

## 快速開始

### 1. 確認群組設定
- 群組名稱：AI指揮中心
- 成員：主人、@ollama168bot (Ollama監控)、OpenClaw Bot (達爾)
- 已取得群組 Chat ID 並寫入 `~/.openclaw/config/telegram.env`

### 2. 測試通知

```bash
cd ~/.openclaw/workspace
./scripts/ollama-task-monitor.sh test
```

### 3. 啟動監控

**方式 A：背景守護進程**
```bash
nohup ./scripts/ollama-task-monitor.sh daemon > /tmp/ollama-monitor.log 2>&1 &
```

**方式 B：Cron 定時執行（推薦）**
```bash
# 編輯 crontab
crontab -e

# 加入（每 10 分鐘檢查一次）
*/10 * * * * cd ~/.openclaw/workspace && ./scripts/ollama-task-monitor.sh monitor
```

## 查詢指令

在群組中，@ollama168bot 可以執行以下指令：

| 指令 | 說明 |
|------|------|
| `status` | 查詢任務板整體狀態 |
| `failed` | 列出所有失敗任務 |
| `running` | 列出執行中任務 |

執行方式：
```bash
./scripts/ollama-task-monitor.sh status   # 發送狀態到群組
./scripts/ollama-task-monitor.sh failed   # 發送失敗任務列表
./scripts/ollama-task-monitor.sh running  # 發送執行中任務
```

## 通知類型

### 🔴 緊急通知（需立即處理）
- 任務執行失敗
- 任務卡住超過 1 小時
- 任務板離線

### 🟡 重要通知（有空時處理）
- 發現新任務
- 累積多個失敗任務

### 📊 定期摘要（每小時）
- 任務統計總覽
- 最近執行記錄

## 工作流程

```
1. Ollama 檢測到任務失敗
   ↓
2. 發送 Telegram 通知：
   "🚨 需立即處理
   
   任務執行失敗: 資料備份 (ID: task-001)
   
   建議操作:
   1. 檢查錯誤日誌
   2. 修復問題後重跑
   3. 或標記為手動處理
   
   @達爾 請查看"
   ↓
3. 達爾收到 @ 通知
4. 達爾進入對話，自主處理：
   - 查詢詳細日誌
   - 診斷問題
   - 執行修復
   - 重跑任務
5. Ollama 確認任務完成，不再通知
```

## 成本優化

| 組件 | 成本 | 用途 |
|------|------|------|
| Ollama 監控 | $0 | 24/7 監控、查詢、通知 |
| 達爾介入 | 按量計費 | 只在被 @ 時處理問題 |

**Token 優化原則：**
- 每次通知都是獨立新訊息，無歷史上下文
- 簡短格式，只含必要資訊
- 使用 HTML parse_mode，減少字元數

## 狀態檔案

監控系統會在以下位置存儲狀態：

```
~/.openclaw/state/
├── failed-cache.txt      # 已通知的失敗任務
├── running-cache.txt     # 執行中任務快取
├── pending-cache.txt     # 待執行任務快取
└── last-summary.txt      # 上次摘要時間
```

## 故障排除

### 通知沒有發送
1. 檢查 Telegram 配置：
   ```bash
   cat ~/.openclaw/config/telegram.env
   ```
2. 測試連線：
   ```bash
   ./scripts/ollama-task-monitor.sh test
   ```

### 任務板離線
```bash
# 檢查任務板狀態
curl http://localhost:3011/health

# 重啟任務板
openclaw taskboard start  # 或使用你的啟動命令
```

### 清除快取重置
```bash
rm -rf ~/.openclaw/state/*.txt
```

## 進階配置

編輯腳本頂部的配置區塊：

```bash
CHECK_INTERVAL_MINUTES=10    # 檢查間隔
OLLAMA_MODEL=llama3.2        # Ollama 模型
XIAO_CAI_ID=@達爾            # @標記的用戶名
```

## 相關文件

- 任務板位置：`openclaw-taskboard` skill
- 緊急停止：`./scripts/emergency-stop.sh`
- Opus 任務管理：`./scripts/opus-task.sh`
