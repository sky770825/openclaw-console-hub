# NEUXA 永久記憶引擎

## 快速開始

### 1. 一鍵完整同步
```bash
cd ~/.openclaw/workspace/knowledge_base/memory_engine
./sync-state.sh --full
```

這將：
- 從 `MEMORY.md` 生成精簡記憶 (`COMPACT_MEMORY.md`)
- 創建狀態快照 (JSON)
- 啟動狀態快照 API 伺服器 (port 8766)

### 2. 檢查系統狀態
```bash
./sync-state.sh --status
```

### 3. 僅生成記憶（不啟動服務）
```bash
./sync-state.sh --generate
```

## API 端點

| 端點 | 說明 |
|------|------|
| `GET /health` | 健康檢查 |
| `GET /api/snapshot/latest` | 讀取最新狀態快照 |
| `GET /api/memory/compact` | 讀取精簡記憶 |

## 檔案結構

```
knowledge_base/memory_engine/
├── whitepaper.md         # 技術白皮書
├── sync-state.sh         # 一鍵同步腳本
├── COMPACT_MEMORY.md     # 精簡記憶（自動生成）
├── snapshots/            # 狀態快照
│   └── latest.json       # 最新快照
└── scripts/
    └── snapshot-server.py # API 伺服器
```

## 整合建議

### 在新 Session 中恢復記憶

手動方式：
```bash
# L1 指揮官啟動後，執行：
cat knowledge_base/memory_engine/COMPACT_MEMORY.md
```

API 方式：
```bash
curl -s http://localhost:8766/api/memory/compact
```

### 定期同步

建議加入 crontab，每 30 分鐘自動同步：
```cron
*/30 * * * * cd ~/.openclaw/workspace/knowledge_base/memory_engine && ./sync-state.sh --generate
```

## Token 節約效果

| 檔案 | 大小 | 用途 |
|------|------|------|
| MEMORY.md | ~300 行 | 完整記憶 |
| COMPACT_MEMORY.md | ~20 行 | 快速恢復 |

精簡記憶約節約 **90%+** 的初始 Context tokens。

## 注意事項

1. 狀態快照伺服器需要 Python 3
2. 預設端口 8766（可修改 sync-state.sh 中的 SERVER_PORT）
3. 與現有 `memory-record-server.py` (port 8765) 互補，非取代

---
*NEUXA Eternal Memory Engine v1.0*
