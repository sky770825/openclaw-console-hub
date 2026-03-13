# 中控台 Bug 檢查報告

**檢查時間**: 2026-02-14 17:45  
**檢查範圍**: scripts/、projects/dashboard/、Autoexecutor、Task-Board-API、Subagent 通知機制  
**檢查者**: 達爾

---

## 執行摘要

整體系統運作正常，發現 **3 個輕微問題** 和 **2 個建議改進項目**。沒有發現會阻塞任務執行的嚴重 bug。

---

## 發現的問題

### 🔶 問題 1: Task-Board-API 重複任務

**狀態**: 低風險  
**位置**: `http://127.0.0.1:3011/api/tasks`

**現象**: 
- 存在大量重複或相似名稱的任務
- 例如：「普特斯防霾biz_window_screen - 電商平台與供應鏈預測」出現多次
- 「OpenClaw 問題排除（交給 Codex）」任務重複建立 6 次以上

**影響**: 
- 任務列表混亂，難以追蹤真正待執行項目
- 可能導致重複執行相同任務

**建議修復**:
```bash
# 1. 清理重複任務（保留最新的一個）
curl -X DELETE http://127.0.0.1:3011/api/tasks/{重複任務ID}

# 2. 建立任務去重機制（在建立前檢查相似名稱）
```

---

### 🔶 問題 2: Autoexecutor 腳本功能不完整

**狀態**: 中等風險  
**位置**: `scripts/autoexecutor.sh`、`scripts/auto-executor-lean.sh`

**現象**:
- `autoexecutor.sh` 嘗試呼叫 `openclaw sessions_spawn`，但實際上只是建立 trigger 檔案
- `auto-executor-lean.sh` 只會通知用戶，不會真正執行任務
- 兩個腳本都無法自動啟動 Cursor/Codex 執行任務

**程式碼片段** (autoexecutor.sh:75-82):
```bash
# 目前只是建立觸發檔案，沒有真正執行
local trigger_file="${WORKSPACE}/.autoexecutor-queue/${task_name}.trigger"
echo "agent: $agent" > "$trigger_file"
```

**影響**:
- 任務狀態無法自動更新
- 需要人工介入才能真正執行任務
- 自動化流程不完整

**建議修復**:
1. 整合 OpenClaw CLI 真正執行任務
2. 或改為使用 webhook 通知外部系統
3. 更新任務狀態（pending → running → done）

---

### 🔶 問題 3: Subagent 通知機制可能遺漏

**狀態**: 低風險  
**位置**: `docs/SUBAGENT-IO-QUICK-REFERENCE.md`

**現象**:
- 文件規定需要 `task_id` 和 `run_id`，但沒有檢查機制確保 Subagent 確實帶上
- 沒有自動驗證回報格式的機制
- 文件提到 `processed_tasks.log`，但沒有自動清理機制

**影響**:
- 可能收到格式不正確的回報
- 日誌檔案可能無限增長

**建議修復**:
```bash
# 1. 建立回報格式驗證腳本
# 2. 設定 processed_tasks.log 輪替
logrotate -s /var/log/logrotate.status ~/.openclaw/automation/processed_tasks.log
```

---

## 建議改進項目

### 💡 建議 1: 建立統一健康檢查端點

**說明**: 目前各腳本各自檢查，建議建立統一健康檢查機制

**實作**:
```bash
# scripts/health-check.sh
#!/bin/bash
check_api() { curl -sf http://127.0.0.1:3011/health; }
check_gateway() { openclaw gateway status; }
check_disk() { df -h | awk '$5 > 80 {print}'; }
```

---

### 💡 建議 2: Dashboard Web UI 手機版修復追蹤

**說明**: 根據指示，Cursor 正在修復手機版問題

**建議**:
1. 完成後驗證以下功能：
   - 手機端任務列表顯示正常
   - 新增/編輯任務表單可用
   - 通知功能正常

2. 更新文件：
   - `projects/dashboard/modules/web-ui/README.md`
   - `TOOLS.md` 中的中控台狀態

---

## 優先處理順序

| 優先級 | 項目 | 原因 |
|--------|------|------|
| P1 | 問題 2: Autoexecutor 功能不完整 | 影響自動化流程 |
| P2 | 建議 2: 手機版修復驗證 | 主人指示 |
| P3 | 問題 1: 清理重複任務 | 整理任務列表 |
| P4 | 問題 3: 通知機制改進 | 長期維護 |
| P5 | 建議 1: 健康檢查 | 預防性改進 |

---

## 結論

**沒有發現會阻塞任務執行的嚴重 bug**。系統整體運作正常，主要問題是自動化流程不完整（需要人工介入）和任務資料需要整理。

等待 Cursor 完成手機版修復後，即可接手其他工作。

---

**報告產生時間**: 2026-02-14 17:45:00  
**下一步**: 待命，等待主人進一步指示
