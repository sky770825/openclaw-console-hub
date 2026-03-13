# NEUXA 即時同步狀態

## 同步架構

```
L1 達爾 (Kimi/OpenClaw) <---> 同步橋接 <---> L2 Claude (Claude Code)
         |                                        |
         +----> ~/.openclaw/workspace/.sync-bridge/ <----+
                                              |
                                       shared-state/
                                       ├── current-state.json
                                       ├── l1-to-l2/
                                       └── l2-to-l1/
```

## 即時同步機制

### 1. 檔案監測 (File Watch)
- **工具**: fswatch (macOS) 或 inotify (Linux)
- **監測範圍**: `~/.openclaw/workspace/`
- **排除**: `.git/`, `node_modules/`, `.sync-bridge/`
- **觸發**: 任何檔案變更即時通知雙方

### 2. 共享狀態檔案
```json
{
  "timestamp": "2026-02-26T05:40:00Z",
  "l1_agent": "NEUXA-L1",
  "l2_agent": "Claude-Opus",
  "workspace_version": "83c2e01",
  "last_sync": "2026-02-26 05:40:00",
  "active_project": "CauseLaw",
  "sync_status": "active"
}
```

### 3. Git 自動同步
- **Hook**: post-commit 觸發通知
- **Mirror**: 自動同步到達爾 repo
- **Backup**: 雙向備份

### 4. 記憶同步
- **MEMORY.md**: 版本對齊檢查
- **HANDOFF-LATEST.md**: 交接狀態更新
- **Context**: 決策歸檔同步

## 使用方式

### 啟動同步監測
```bash
bash scripts/sync-bridge.sh start
```

### 檢查同步狀態
```bash
bash scripts/sync-bridge.sh status
```

### 手動觸發同步
```bash
bash scripts/sync-bridge.sh notify
```

## 衝突解決

當雙方同時修改同一檔案時：
1. Git merge conflict 機制介入
2. 手動解決後標記 SYNC-STATUS.md
3. 通知對方衝突已解決

## 當前狀態
- ✅ 同步橋接腳本已建立
- ✅ 共享狀態目錄已初始化
- ⏳ 等待 fswatch 安裝啟動即時監測
- ⏳ 等待 Claude 端配置讀取權限

---
* NEUXA Sync Bridge v1.0 | 2026-02-26
