# Notification Batching Strategy

> 參考來源：Matthew Berman 影片 9 — AI Agent 通知最佳實踐

## 目標

減少通知疲勞，依優先級分層批次發送 Telegram 訊息，確保關鍵訊息即時送達，非關鍵訊息合併摘要。

## 優先級分層

| 優先級 | 行為 | 頻率 | 範例 |
|--------|------|------|------|
| `critical` | 立即發送 | 即時 | 安全事件、服務崩潰、資料外洩警告 |
| `high` | 佇列批次 | 每小時 | 任務失敗、SLO 偏離、重要排程結果 |
| `medium` | 佇列批次 | 每 3 小時 | 任務完成通知、狀態更新 |
| `low` | 每日摘要 | 每 24 小時 | 統計報告、非關鍵日誌、建議 |

## 通知格式

### 輸入格式（JSON）

```json
{
  "priority": "critical|high|medium|low",
  "title": "通知標題",
  "body": "通知內容詳情",
  "source": "來源模組（可選）",
  "timestamp": "ISO 8601（自動填入）"
}
```

### 批次輸出格式（Telegram）

```
[批次通知] 2026-03-13 14:00

--- HIGH (3 則) ---
[14:02] 任務失敗：daily-backup
  備份至 S3 時連線逾時

[13:45] SLO 偏離：API 回應時間
  p95 = 2.3s（閾值 1.5s）

[13:30] 排程異常：cron-monitor
  連續 3 次執行失敗

--- MEDIUM (2 則) ---
[12:15] 掃描完成：security-audit
  發現 0 個新問題

[11:00] 模型切換：router
  已從 GPT-4 切換至 Claude
```

## 佇列存儲

- 檔案位置：`~/.openclaw/delivery-queue/notification-batch.jsonl`
- 格式：每行一筆 JSON（JSONL）
- 發送後清除已發送項目

## 排程建議

搭配 crontab 或 launchd 設定定時 flush：

```bash
# 每小時（整點）— flush high
0 * * * * ~/.openclaw/workspace/optimizations/notification-batcher.mjs --flush --priority high

# 每 3 小時 — flush medium
0 */3 * * * ~/.openclaw/workspace/optimizations/notification-batcher.mjs --flush --priority medium

# 每日 08:00 — flush low（每日摘要）
0 8 * * * ~/.openclaw/workspace/optimizations/notification-batcher.mjs --flush --priority low
```

## CLI 使用

```bash
# 發送通知
echo '{"priority":"critical","title":"伺服器崩潰","body":"API 主節點無回應"}' | notification-batcher.mjs

# 查看待發通知狀態
notification-batcher.mjs --status

# 手動 flush 所有待發通知
notification-batcher.mjs --flush

# 只 flush 特定優先級
notification-batcher.mjs --flush --priority high
```

## 預期效益

- 減少每日 Telegram 訊息數量約 60-80%
- 關鍵通知零延遲
- 非關鍵通知合併為可讀摘要，降低認知負荷
