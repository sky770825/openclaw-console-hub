# task-board-api.sh - 任務板 API 文檔

## 概述
本地 JSON 版本的任務管理 API，無需外部伺服器。

## 快速開始
```bash
./task-board-api.sh list-tasks                      # 列出任務
./task-board-api.sh add-task "任務名稱" "描述"      # 新增任務
./task-board-api.sh get-task 1                      # 獲取任務
```

## 數據存儲
默認存儲在 `~/.openclaw/automation/tasks.json`

---
