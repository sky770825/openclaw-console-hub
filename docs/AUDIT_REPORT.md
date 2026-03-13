# 中控台系統 Bug 檢查報告

**任務 ID**: audit-dashboard-bugs-v1  
**執行 ID**: codex-audit-001  
**檢查時間**: 2026-02-14 17:40  
**執行者**: 達爾

---

## 檢查項目總覽

| 項目 | 狀態 | 問題數 |
|------|------|--------|
| Autoexecutor | ⚠️ 異常 | 2 |
| Task Board API (3011) | ✅ 正常 | 0 |
| Subagent 通知 (Telegram) | ✅ 正常 | 0 |
| Cron Jobs | ⚠️ 異常 | 2 |
| 資料庫連線 | ⚠️ 異常 | 1 |

---

## 1. Autoexecutor 檢查

### 狀態: ⚠️ 異常

**發現問題:**

1. **狀態檔案遺失**
   - 預期檔案: `~/.openclaw/.autoexecutor-status`
   - 實際狀態: 檔案不存在
   - 影響: 無法正確判斷執行器狀態

2. **任務執行邏輯錯誤**
   - 目前邏輯: 掃描 `TASK-*.md` 檔案
   - 實際資料: 儲存在 `~/.openclaw/automation/tasks.json`
   - 影響: Autoexecutor 無法正確取得 ready 任務

3. **與 Task Board API 脫節**
   - API 有 46 個 ready 任務
   - Autoexecutor 無法讀取這些任務
   - 影響: 任務不會自動被 spawn 執行

**當前狀態:**
- 進程運行中 (PID: 79493)
- 但無法正確執行任務

---

## 2. Task Board API (Port 3011)

### 狀態: ✅ 正常

**檢查結果:**
- Health Check: `{"ok":true,"service":"openclaw-server"}`
- Tasks API: 正常回傳 489 個任務
- Telegram API: 正常運作

**任務統計:**
```json
[
  { "status": "done", "count": 442 },
  { "status": "ready", "count": 46 },
  { "status": "running", "count": 1 }
]
```

---

## 3. Subagent 通知 (Telegram)

### 狀態: ✅ 正常

**檢查結果:**
- API Endpoint: `POST /api/telegram/force-test`
- 測試結果: `{"ok":true,"chat_id":5819565005,"message_id":1185}`
- 通知功能運作正常

---

## 4. Cron Jobs

### 狀態: ⚠️ 異常

**發現問題:**

1. **5 個重要 Cron Jobs 被禁用**

| Cron ID | 名稱 | 狀態 | 影響 |
|---------|------|------|------|
| 5b0d27ac-34cc-44f2-a61a-1d04acb87f83 | dashboard-monitor | ❌ 禁用 | 儀表板無法自動監控 |
| c7d19f7c-b4bb-4f49-b25e-1fe5b5cc65ba | unified-monitor-quick | ❌ 禁用 | 快速監控停止 |
| 6738545e-6c96-40a8-8b8c-b3ea543b7904 | autopilot-lean | ❌ 禁用 | 自動駕駛功能停止 |
| 0acbca26-f920-4cf5-863d-a4e336450693 | auto-mode-watchdog | ❌ 禁用 | 自動模式監控停止 |
| 2441421b-aa38-4dad-80a4-137ce3993970 | context-watchdog | ❌ 禁用 | Context 監控停止 |

2. **缺少統一 Cron API**
   - `/api/crons` 端點不存在
   - 無法透過 API 管理 cron jobs

3. **Crontab 與 Cron JSON 不同步**
   - Crontab 有 4 個任務
   - crons.json 有 31 個任務 (僅 7 個啟用)

**啟用的 Cron Jobs (7個):**
- task-gen-internal (15分鐘)
- task-gen-business (30分鐘)
- task-gen-external (60分鐘)
- context-auto-summarizer (10分鐘)
- unified-monitor-detailed (60分鐘)
- budget-tracker-hourly

---

## 5. 資料庫連線

### 狀態: ⚠️ 異常

**發現問題:**

1. **沒有專用 Memory DB 服務**
   - `/api/db/status` 端點不存在
   - 資料儲存在 JSON 檔案 (tasks.json, crons.json)

2. **資料儲存位置分散**
   - Tasks: `~/.openclaw/automation/tasks.json`
   - Crons: `~/.openclaw/automation/crons.json`
   - 沒有統一的資料庫管理

---

## 問題列表總結

| 優先級 | 問題 | 影響 | 修復難度 |
|--------|------|------|----------|
| P0 | Autoexecutor 無法讀取 ready 任務 | 任務不會自動執行 | 中 |
| P1 | 5 個重要 cron jobs 被禁用 | 監控系統部分停止 | 低 |
| P1 | Autoexecutor 狀態檔遺失 | 無法判斷執行器狀態 | 低 |
| P2 | 缺少統一 Cron API | 無法透過 API 管理 | 中 |
| P2 | 資料庫分散儲存 | 資料管理困難 | 高 |

---

## 修復建議

### 立即修復 (P0)

1. **修復 Autoexecutor**
   ```bash
   # 方案 A: 修改 autoexecutor.sh 使用 API 讀取任務
   curl -s http://127.0.0.1:3011/api/tasks?status=ready
   
   # 方案 B: 重建狀態檔案
   echo "enabled" > ~/.openclaw/.autoexecutor-status
   ```

### 短期修復 (P1)

2. **重新啟用禁用的 Cron Jobs**
   ```bash
   # 啟用 dashboard-monitor
   # 啟用 unified-monitor-quick
   # 啟用 autopilot-lean
   # 啟用 auto-mode-watchdog
   # 啟用 context-watchdog
   ```

3. **建立 Autoexecutor 狀態監控**
   - 檢查 PID 檔案存在性
   - 檢查狀態檔案內容
   - 自動重建遺失檔案

### 中期修復 (P2)

4. **建立統一 Cron API**
   - 實作 `/api/crons` 端點
   - 支援 CRUD 操作
   - 與 crons.json 同步

5. **資料庫整合**
   - 評估引入 SQLite/JSON DB
   - 統一資料存取層
   - 建立資料備份機制

---

## 下一步行動

1. 等待 Cursor 完成相關修復
2. 監控 Autoexecutor 修復後的任務執行情況
3. 重新啟用禁用的 cron jobs 並觀察
4. 評估是否需要建立統一資料庫層

---

*報告產生時間: 2026-02-14 17:40*  
*檢查工具: 達爾中控台 Bug 檢查腳本*
