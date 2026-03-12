# 通用記憶系統 - 完整文檔

> **版本**: 1.0
> **建立時間**: 2026-02-16
> **狀態**: ✅ 已實現並測試

---

## 📋 概述

通用記憶系統確保 **所有 Autopilot 任務** 都有完整的記憶記錄，無論任務是由誰執行的（Subagent、n8n、或手動執行）。

### 核心目標

1. **統一記憶接口** - 所有任務使用相同的記錄格式
2. **多執行者支援** - Subagent、n8n、Bash 腳本等都能記錄
3. **持久化記憶** - 記錄保存在 `task-history.md`，可供智能召回使用
4. **零遺漏** - 即使使用 Telegram 通知節省 token，記憶也不會丟失

---

## 🏗️ 系統架構

```
通用記憶系統架構
│
├── 📝 記憶記錄層 (Memory Recording Layer)
│   ├── log-autopilot-task.sh           # 核心日誌腳本
│   ├── task-completion-handler.sh      # 任務完成處理器
│   └── memory-record-server.py         # HTTP 接口（供 n8n 使用）
│
├── 🔧 整合層 (Integration Layer)
│   ├── autopilot-lean.sh               # 整合任務拉取提示
│   ├── complete-current-task.sh        # 便捷完成腳本
│   └── memory-record-ctl.sh            # 服務器控制腳本
│
└── 💾 存儲層 (Storage Layer)
    ├── task-history.md                 # 所有任務的歷史記錄
    ├── indexing-history.md             # 向量索引專用記錄
    └── MEMORY.md                       # 週期性整合（未來實現）
```

---

## 📦 核心組件

### 1. log-autopilot-task.sh（核心日誌腳本）

**功能**: 基礎記憶記錄功能

**位置**: `~/.openclaw/workspace/scripts/log-autopilot-task.sh`

**使用方式**:
```bash
./log-autopilot-task.sh "任務名稱" "狀態" "摘要"
```

**範例**:
```bash
./log-autopilot-task.sh "向量索引" "成功" "檔案:223 | Chunks:3378"
./log-autopilot-task.sh "資料清理" "完成" "清除 500 個過期檔案"
./log-autopilot-task.sh "API 部署" "失敗" "連接超時"
```

**輸出位置**: `~/.openclaw/workspace/memory/autopilot-results/task-history.md`

---

### 2. task-completion-handler.sh（任務完成處理器）

**功能**: 增強版記憶記錄，支援 API 更新和執行者資訊

**位置**: `~/.openclaw/workspace/scripts/task-completion-handler.sh`

**使用方式**:
```bash
./task-completion-handler.sh "任務名稱" "狀態" "摘要" [選項]
```

**選項**:
- `--task-id <ID>` - TaskBoard 任務 ID
- `--assignee <執行者>` - 執行者標識
- `--update-api` - 更新 TaskBoard API 狀態

**範例**:
```bash
# 基本用法
./task-completion-handler.sh "向量索引" "成功" "檔案:223 | Chunks:3378"

# 完整用法
./task-completion-handler.sh "資料遷移" "完成" "遷移 1000 筆資料" \
    --task-id task-123 \
    --assignee "Gemini Flash 2.5" \
    --update-api
```

---

### 3. complete-current-task.sh（便捷完成腳本）

**功能**: 快速完成當前 Autopilot 任務並記錄

**位置**: `~/.openclaw/workspace/scripts/complete-current-task.sh`

**使用方式**:

**互動模式**（推薦）:
```bash
./complete-current-task.sh
```

會提示選擇狀態並輸入摘要。

**非互動模式**:
```bash
./complete-current-task.sh "成功" "清除了 500 個過期檔案，釋放 2.3GB 空間"
```

**適用場景**: 當 `autopilot-lean.sh` 拉取任務後，小蔡完成任務時使用。

---

### 4. memory-record-server.py（n8n HTTP 接口）

**功能**: 提供 HTTP 接口供 n8n 工作流程記錄任務完成

**位置**: `~/.openclaw/workspace/scripts/memory-record-server.py`

**啟動服務器**:
```bash
./scripts/memory-record-ctl.sh start
```

**端點**:
- `POST http://localhost:8765/record` - 記錄任務完成
- `GET http://localhost:8765/health` - 健康檢查
- `GET http://localhost:8765/` - 使用說明

**請求格式**:
```json
{
  "taskName": "每日摘要生成",
  "status": "成功",
  "summary": "生成摘要並發送到 Telegram",
  "taskId": "task-123",           // 可選
  "assignee": "n8n Daily Summary" // 可選
}
```

**n8n 使用範例**:

在 n8n 工作流程最後添加 HTTP Request 節點：
- Method: `POST`
- URL: `http://localhost:8765/record`
- Body:
  ```json
  {
    "taskName": "{{ $('Task Name').item.json.name }}",
    "status": "成功",
    "summary": "{{ $('Result').item.json.summary }}",
    "assignee": "n8n Daily Summary Workflow"
  }
  ```

---

### 5. memory-record-ctl.sh（服務器控制腳本）

**功能**: 管理記憶記錄服務器

**位置**: `~/.openclaw/workspace/scripts/memory-record-ctl.sh`

**指令**:
```bash
./memory-record-ctl.sh start     # 啟動服務器
./memory-record-ctl.sh stop      # 停止服務器
./memory-record-ctl.sh restart   # 重啟服務器
./memory-record-ctl.sh status    # 查看狀態
./memory-record-ctl.sh logs      # 查看日誌（最近 20 行）
./memory-record-ctl.sh logs 50   # 查看日誌（最近 50 行）
./memory-record-ctl.sh test      # 測試端點
```

---

## 🔄 使用流程

### 場景 1: Autopilot 拉取任務（小蔡手動執行）

```bash
# 1. Autopilot 拉取任務
./scripts/autopilot-lean.sh
# 輸出: Picked task: 資料清理 (task-123)
#      💡 完成後請執行: scripts/complete-current-task.sh

# 2. 小蔡執行任務...
# （執行實際工作）

# 3. 完成後記錄
./scripts/complete-current-task.sh
# 選擇狀態、輸入摘要 → 自動記錄到 task-history.md
```

---

### 場景 2: Subagent 執行任務（Gemini Flash 2.5）

```bash
# 在 subagent 腳本中，任務完成後調用
./scripts/task-completion-handler.sh \
    "向量索引" \
    "成功" \
    "檔案:223 | Chunks:3378 | 耗時:45s" \
    --assignee "Gemini Flash 2.5"
```

**已整合的腳本**:
- [auto-index-trigger.sh:168](../scripts/auto-index-trigger.sh#L168) - 向量索引完成後自動調用

---

### 場景 3: n8n 工作流程執行任務

```bash
# 1. 啟動記憶記錄服務器（如果未啟動）
./scripts/memory-record-ctl.sh start

# 2. n8n 工作流程最後添加 HTTP Request 節點
#    POST http://localhost:8765/record
#    Body:
{
  "taskName": "每日摘要生成",
  "status": "成功",
  "summary": "生成 5 條摘要並發送到 @gousmaaa",
  "assignee": "n8n Daily Summary Workflow"
}

# 3. 自動記錄到 task-history.md
```

---

### 場景 4: 手動記錄（任何情況）

```bash
# 直接調用核心日誌腳本
./scripts/log-autopilot-task.sh \
    "資料庫備份" \
    "成功" \
    "備份了 PostgreSQL 和 Qdrant 資料"
```

---

## 📊 記憶記錄格式

### task-history.md 格式

```markdown
# Autopilot 任務歷史

> 自動維護 - 記錄所有 Autopilot 執行的任務

## 最近任務

### 2026-02-16 01:37:10 - 向量索引
- ✅ 狀態：成功
- 📝 摘要：檔案:223 | Chunks:3378 | 耗時:45s | 執行者:Gemini Flash 2.5

### 2026-02-16 00:15:30 - 每日摘要生成
- ✅ 狀態：成功
- 📝 摘要：生成 5 條摘要並發送到 @gousmaaa | 執行者:n8n Daily Summary Workflow

### 2026-02-15 23:45:00 - 資料清理
- ✅ 狀態：完成
- 📝 摘要：清除 500 個過期檔案，釋放 2.3GB 空間 | 執行者:Claude
```

### 狀態 Emoji 映射

| 狀態   | Emoji |
|--------|-------|
| 成功   | ✅    |
| 完成   | ✅    |
| 失敗   | ❌    |
| 警告   | ⚠️    |
| 其他   | ℹ️    |

---

## 🔧 維護與監控

### 查看最近任務記錄

```bash
# 查看所有任務歷史
cat ~/.openclaw/workspace/memory/autopilot-results/task-history.md

# 查看最近 10 筆記錄
head -n 50 ~/.openclaw/workspace/memory/autopilot-results/task-history.md
```

### 監控記憶記錄服務器

```bash
# 查看狀態
./scripts/memory-record-ctl.sh status

# 查看日誌
./scripts/memory-record-ctl.sh logs 50

# 測試端點
./scripts/memory-record-ctl.sh test
```

### 自動啟動服務器（可選）

**方法 1: 添加到 cron**

```bash
# 每次重啟後 5 分鐘啟動
@reboot sleep 300 && ~/.openclaw/workspace/scripts/memory-record-ctl.sh start
```

**方法 2: 添加到 LaunchAgent**（macOS）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.memory-record-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/caijunchang/.openclaw/workspace/scripts/memory-record-server.py</string>
        <string>8765</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/caijunchang/.openclaw/logs/memory-record-server.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/caijunchang/.openclaw/logs/memory-record-server.err.log</string>
</dict>
</plist>
```

保存為 `~/Library/LaunchAgents/ai.openclaw.memory-record-server.plist`

啟動:
```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.memory-record-server.plist
```

---

## 📈 效益分析

### 記憶覆蓋率

| 執行者類型 | 舊系統 | 新系統 | 改善 |
|-----------|--------|--------|------|
| 小蔡手動執行 | ❌ 0% | ✅ 100% | +100% |
| Subagent (Gemini) | ⚠️ 部分 | ✅ 100% | +50% |
| n8n 工作流程 | ❌ 0% | ✅ 100% | +100% |
| Bash 腳本 | ❌ 0% | ✅ 100% | +100% |

### Token 節省 + 記憶完整

- **舊方式**: Subagent 詳細輸出給小蔡 → 花費大量 token，但有記憶
- **n8n 通知**: Telegram 簡短通知 → 節省 token，**但無記憶**
- **新方式**: Telegram 簡短通知 + HTTP 記錄 → **節省 token + 有記憶** ✅

---

## ⚠️ 注意事項

### 1. 記憶記錄服務器需要運行

如果使用 n8n 記錄，確保服務器正在運行：

```bash
./scripts/memory-record-ctl.sh status
```

如果未運行，啟動它：

```bash
./scripts/memory-record-ctl.sh start
```

### 2. n8n 網路訪問

如果 n8n 在 Docker 中運行，確保可以訪問 `http://host.docker.internal:8765/record`。

### 3. 記憶檔案大小

`task-history.md` 會隨時間增長，建議定期歸檔：

```bash
# 手動歸檔（保留最近 100 筆）
tail -n 500 task-history.md > task-history-recent.md
mv task-history.md task-history-archive-$(date +%Y%m%d).md
mv task-history-recent.md task-history.md
```

或使用 `weekly-memory-checkpoint.sh` 自動整合。

---

## 🎯 未來擴展

### 已規劃

1. **週期性整合到 MEMORY.md** (`weekly-memory-checkpoint.sh`)
   - 每週日凌晨 3 點執行
   - 整合本週 Autopilot 活動摘要到 MEMORY.md

2. **智能摘要生成**
   - 使用 Ollama 自動生成週報
   - 統計執行次數、成功率等指標

3. **任務關聯性分析**
   - 識別任務之間的依賴關係
   - 優化任務執行順序

### 可能擴展

- 記憶搜尋 API（供 Subagent 查詢歷史任務）
- Grafana 儀表板（視覺化任務執行趨勢）
- 錯誤模式分析（自動識別重複錯誤）

---

## 📚 相關文檔

- [智能召回快速開始](../QUICK-START-智能召回.md)
- [P0 優化技術報告](../P0-OPTIMIZATION-REPORT.md)
- [Telegram Bot 修復文檔](./TELEGRAM-BOT-RECOVERY-2026-02-16.md)

---

**建立時間**: 2026-02-16
**維護者**: 小蔡（Claude）
**狀態**: ✅ 已實現並測試
**版本**: 1.0

🦞 **OpenClaw Powered** | 智能 · 高效 · 零成本
