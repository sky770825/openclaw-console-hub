# 達爾系統健康報告

> 本檔僅在心跳結果為 INFO / ALERT / CRITICAL 時更新。
> NORMAL 結果靜默處理，記錄至 `~/.openclaw/logs/heartbeat.jsonl`。

## 核心狀態
*   *時間*: （由心跳自動填入）
*   *整體健康*: （由心跳自動填入）
*   *最後心跳等級*: NORMAL | INFO | ALERT | CRITICAL
*   *活躍任務*:
    *   （由心跳自動填入）
*   *記憶系統*: （由心跳自動填入）
*   *任務調度*: （由心跳自動填入）
*   *工具介面*: （由心跳自動填入）

## 靜默規則

本報告遵循以下靜默機制：

| 等級 | 行為 |
|------|------|
| **NORMAL** | 靜默 — 不更新本檔、不發 Telegram、僅寫 heartbeat.jsonl |
| **INFO** | 更新本檔「近期活動」區塊，累積後批次發送 Telegram |
| **ALERT** | 完整更新本檔，立即發送 Telegram |
| **CRITICAL** | 完整更新本檔，立即發送 Telegram + @gousmaaa，自動建立修復任務 |

## 靜默統計
*   *最後靜默時間*: （NORMAL 心跳的最近時間戳）
*   *連續靜默次數*: （連續 NORMAL 的計數，遇到非 NORMAL 歸零）

## INFO 緩衝區

> 以下事件將在累積 3 筆或 4 小時後批次發送 Telegram。

（目前無待發送項目）

## 本次心跳循環活動總結

（僅在非 NORMAL 時填入）

## 心跳循環步驟

1.  **健康檢查**: `curl http://localhost:3011/api/health`
    - HTTP 200 且 <3s → NORMAL
    - HTTP 200 但 >3s → ALERT
    - 無回應 → CRITICAL
2.  **任務板檢查**: `curl http://localhost:3011/api/openclaw/tasks`
    - 無 ready 任務 → NORMAL
    - 有 pending 任務 → INFO
    - 有 ready 任務 → ALERT
    - 任務執行失敗 → CRITICAL
3.  **分級判斷**: 取所有檢查中最高等級作為本次心跳等級
4.  **寫入日誌**: 追加一行到 `~/.openclaw/logs/heartbeat.jsonl`
    ```json
    {"timestamp":"...","status":"NORMAL|INFO|ALERT|CRITICAL","details":"..."}
    ```
5.  **依等級行動**:
    - NORMAL → 結束，不產出任何回覆
    - INFO → 更新本檔「近期活動」，推入緩衝區
    - ALERT → 完整更新本檔，發送 Telegram
    - CRITICAL → 完整更新本檔，發送 Telegram + @gousmaaa，建立修復任務
6.  **（僅非 NORMAL）完成練習題**: 如有未完成練習題，挑選一題完成
7.  **（僅非 NORMAL）更新成長紀錄**: 記錄到 GROWTH.md
