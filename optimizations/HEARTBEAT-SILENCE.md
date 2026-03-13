# Heartbeat 靜默機制設計

> 影片 12 對應：無事時回傳特殊 token 被 suppress，避免無意義通知
> 建立日期：2026-03-13
> 狀態：設計建議（未套用）

---

## 1. 當前心跳行為分析

### 現行配置（from `openclaw.json`）

```json
"heartbeat": {
  "every": "60m",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "prompt": "心跳時間。1) 用 run_script 跑 curl 看任務板。2) 有 ready 任務就觸發 auto-executor。3) curl health 檢查系統健康。4) 有異常就建 create_task 修復。不要回覆 HEARTBEAT_OK。"
}
```

### 問題點

| 問題 | 描述 |
|------|------|
| **每次都產出完整報告** | 目前 HEARTBEAT.md 每次心跳都重寫完整的健康報告，即使什麼事都沒發生 |
| **無差異化通知** | 無論結果是「一切正常」還是「系統異常」，都以相同方式輸出 |
| **Telegram 噪音** | 如果心跳結果觸發 Telegram 通知，每小時一次「系統正常」訊息對主人造成干擾 |
| **Token 浪費** | Haiku 模型每次都要生成完整報告文本，即使內容無變化 |
| **無日誌累積** | 心跳結果沒有結構化日誌，無法回溯查看歷史狀態趨勢 |

---

## 2. 靜默機制設計

### 2.1 心跳結果分級

| 等級 | 代碼 | 定義 | 範例 |
|------|------|------|------|
| **NORMAL** | `0` | 無事發生，所有檢查通過 | 系統健康、無新任務、無錯誤 |
| **INFO** | `1` | 有更新但不急 | 完成了一題練習、GROWTH.md 更新了、有新的 pending 任務但不緊急 |
| **ALERT** | `2` | 需要主人注意 | 任務板有 ready 任務需要確認、某服務回應緩慢、磁碟空間 <20% |
| **CRITICAL** | `3` | 緊急事件 | 服務掛掉、API key 失效、任務執行失敗、安全警報 |

### 2.2 各等級處理方式

```
NORMAL   → 靜默處理
           - 只寫入 ~/.openclaw/logs/heartbeat.jsonl
           - 不更新 HEARTBEAT.md（保留上次有意義的報告）
           - 不發送 Telegram
           - 不產出任何回覆文本（suppress output）

INFO     → 累積到批次通知
           - 寫入 heartbeat.jsonl
           - 更新 HEARTBEAT.md 的「近期活動」區塊
           - 累積到 INFO 緩衝區
           - 每 3 次 INFO 或每 4 小時（以先到者為準）批次發送 Telegram 摘要

ALERT    → 即時通知
           - 寫入 heartbeat.jsonl
           - 完整更新 HEARTBEAT.md
           - 立即發送 Telegram 訊息
           - 格式：⚠️ [ALERT] {摘要}

CRITICAL → 緊急通知
           - 寫入 heartbeat.jsonl
           - 完整更新 HEARTBEAT.md
           - 立即發送 Telegram 訊息 + @gousmaaa 標記
           - 自動建立修復任務（create_task）
           - 格式：🚨 [CRITICAL] {摘要} @gousmaaa
```

### 2.3 靜默判斷邏輯（偽代碼）

```
function classify_heartbeat(checks):
    if any check is CRITICAL:
        return CRITICAL
    if any check is ALERT:
        return ALERT
    if any check has new_info:
        return INFO
    return NORMAL

function handle_heartbeat(level, details):
    // 一律寫日誌
    append_to_log(heartbeat.jsonl, {
        timestamp: now(),
        status: level,
        details: details
    })

    switch level:
        case NORMAL:
            // 靜默 — 不做任何輸出
            return SUPPRESS

        case INFO:
            info_buffer.push(details)
            update_heartbeat_md(partial=true)
            if info_buffer.length >= 3 or hours_since_last_batch >= 4:
                send_telegram_batch(info_buffer)
                info_buffer.clear()

        case ALERT:
            update_heartbeat_md(full=true)
            send_telegram("⚠️ [ALERT] " + details.summary)

        case CRITICAL:
            update_heartbeat_md(full=true)
            send_telegram("🚨 [CRITICAL] " + details.summary + " @gousmaaa")
            create_task(type="fix", details=details)
```

### 2.4 各檢查項目的預設等級對照

| 檢查項目 | NORMAL 條件 | INFO 條件 | ALERT 條件 | CRITICAL 條件 |
|----------|-------------|-----------|------------|---------------|
| 系統健康 (health API) | HTTP 200 | — | 回應 >3s | 無回應 / 非 200 |
| 任務板 | 無 ready 任務 | 有 pending 任務 | 有 ready 任務待確認 | 任務執行失敗 |
| 練習題 | 無需執行 | 完成一題 | — | — |
| GROWTH.md | 無更新 | 有更新 | — | 寫入失敗 |
| 磁碟空間 | >30% | <30% | <20% | <10% |
| API 連線 | 全部正常 | — | 某 provider 失敗 | 主要 provider 全部失敗 |

---

## 3. 心跳日誌格式

### 檔案位置

```
~/.openclaw/logs/heartbeat.jsonl
```

### 每行格式（JSON Lines）

```json
{"timestamp":"2026-03-13T18:30:15+08:00","status":"NORMAL","details":"health=ok, tasks=0, growth=unchanged"}
{"timestamp":"2026-03-13T19:30:22+08:00","status":"INFO","details":"completed exercise 14-路徑與檔案系統.md, growth updated"}
{"timestamp":"2026-03-13T20:30:05+08:00","status":"ALERT","details":"task board has 2 ready tasks pending confirmation"}
{"timestamp":"2026-03-13T21:30:18+08:00","status":"CRITICAL","details":"health endpoint unreachable after 3 retries, localhost:3011 down"}
```

### 日誌輪替建議

- 單檔上限：10MB
- 輪替策略：超過上限時重命名為 `heartbeat-{date}.jsonl` 並建立新檔
- 保留期限：30 天

---

## 4. 建議的 openclaw.json heartbeat 配置修改

```json
"heartbeat": {
  "every": "60m",
  "model": "anthropic/claude-haiku-4-5-20251001",
  "prompt": "心跳時間。1) curl 任務板。2) 有 ready 任務就觸發 auto-executor。3) curl health 檢查健康。4) 有異常就 create_task。根據結果分級：NORMAL/INFO/ALERT/CRITICAL。NORMAL 時靜默，只寫 heartbeat.jsonl。",
  "silence": {
    "enabled": true,
    "logPath": "~/.openclaw/logs/heartbeat.jsonl",
    "suppressLevel": "NORMAL",
    "batchInfo": {
      "threshold": 3,
      "maxIntervalMinutes": 240
    },
    "alertMention": "@gousmaaa",
    "logRotate": {
      "maxSizeMb": 10,
      "retainDays": 30
    }
  }
}
```

---

## 5. 建議的 HEARTBEAT.md 修改版本

建議版本已產出至同目錄下的 `HEARTBEAT-SUGGESTED.md`，主要變更：

1. 增加「靜默規則」區塊，說明何時不更新本檔
2. 增加「最後靜默時間」欄位，記錄最近一次 NORMAL 靜默的時間
3. 增加「INFO 緩衝區」區塊，列出待批次發送的 INFO 級事件
4. 調整「心跳循環步驟」加入分級判斷邏輯

---

## 6. 預期效益

| 指標 | 改善前 | 改善後 |
|------|--------|--------|
| Telegram 通知頻率（無事時） | 每 60 分鐘 1 則 | 0 則 |
| Telegram 通知頻率（有 INFO） | 每 60 分鐘 1 則 | 每 3-4 小時 1 則批次摘要 |
| HEARTBEAT.md 寫入頻率 | 每 60 分鐘 | 僅在 INFO/ALERT/CRITICAL 時 |
| Token 消耗（NORMAL 時） | 完整報告生成 ~500 tokens | 日誌行 ~50 tokens |
| 歷史可追溯性 | 無（每次覆蓋） | 完整 JSONL 日誌 |
