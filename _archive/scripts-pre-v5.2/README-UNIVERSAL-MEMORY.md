# 通用記憶系統 - 快速參考

> **版本**: 1.0 | **狀態**: ✅ 已實現

---

## 🚀 快速開始

### 我剛完成了一個 Autopilot 任務，怎麼記錄？

```bash
# 方法 1: 互動模式（推薦）
./scripts/complete-current-task.sh

# 方法 2: 直接指定
./scripts/complete-current-task.sh "成功" "清除了 500 個過期檔案"
```

---

### 我是 n8n 工作流程，怎麼記錄？

**前提**: 確保記憶記錄服務器正在運行
```bash
./scripts/memory-record-ctl.sh start
```

**在 n8n 中添加 HTTP Request 節點**:
- Method: `POST`
- URL: `http://localhost:8765/record`
- Body:
```json
{
  "taskName": "我的任務名稱",
  "status": "成功",
  "summary": "執行結果摘要",
  "assignee": "n8n workflow 名稱"
}
```

---

### 我是 Subagent 腳本，怎麼記錄？

在腳本完成後添加:
```bash
./scripts/task-completion-handler.sh \
    "任務名稱" \
    "成功" \
    "執行摘要" \
    --assignee "Gemini Flash 2.5"
```

---

## 📖 常用指令

### 記憶記錄服務器

```bash
./scripts/memory-record-ctl.sh start   # 啟動
./scripts/memory-record-ctl.sh stop    # 停止
./scripts/memory-record-ctl.sh status  # 狀態
./scripts/memory-record-ctl.sh test    # 測試
./scripts/memory-record-ctl.sh logs    # 日誌
```

### 查看任務歷史

```bash
# 查看所有任務
cat ~/.openclaw/workspace/memory/autopilot-results/task-history.md

# 查看最近 20 筆
head -n 100 ~/.openclaw/workspace/memory/autopilot-results/task-history.md
```

---

## 🔧 核心腳本

| 腳本 | 用途 | 使用者 |
|------|------|--------|
| `log-autopilot-task.sh` | 基礎記憶記錄 | 所有 |
| `task-completion-handler.sh` | 增強記憶記錄 | Subagent、腳本 |
| `complete-current-task.sh` | 便捷完成腳本 | 達爾手動 |
| `memory-record-server.py` | HTTP 接口 | n8n |
| `memory-record-ctl.sh` | 服務器管理 | 維護 |

---

## 📊 記憶存儲位置

```
~/.openclaw/workspace/memory/autopilot-results/
├── task-history.md          # 所有任務歷史 ⭐ 主要
├── indexing-history.md      # 向量索引專用
└── current-task.json        # 當前任務（臨時）
```

---

## ⚠️ 重要提醒

### 使用 n8n 記錄？記得啟動服務器！

```bash
./scripts/memory-record-ctl.sh start
```

### 完成任務後不要忘記記錄！

看到這個提示時記得執行:
```
📝 任務已拉取，請達爾執行
💡 完成後請執行: scripts/complete-current-task.sh
```

---

## 📚 完整文檔

詳細使用說明請參考:
[UNIVERSAL-MEMORY-SYSTEM.md](../memory/UNIVERSAL-MEMORY-SYSTEM.md)

---

**建立時間**: 2026-02-16
**維護者**: 達爾（Claude）

🦞 **OpenClaw Powered**
