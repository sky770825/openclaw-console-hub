# Memory System Runbook

記憶系統運維指南

## 目錄

- [日常檢查](#日常檢查)
- [故障排查](#故障排查)
- [備份恢復](#備份恢復)
- [性能優化](#性能優化)
- [升級維護](#升級維護)

## 日常檢查

### 檢查記憶系統狀態

```python
from skills.memory import create_memory_manager

manager = create_memory_manager()
stats = manager.get_stats()

print("=== 記憶系統狀態 ===")
print(f"核心記憶區塊: {stats['core']['total_sections']}")
print(f"核心記憶字符: {stats['core']['total_chars']}")
print(f"存檔記憶條目: {stats['archival']['total_entries']}")
print(f"存檔類型: {stats['archival']['db_type']}")
```

### 檢查數據庫大小

```bash
# 召回記憶數據庫
ls -lh ~/.openclaw/memory/recall.db

# 存檔記憶數據庫
du -sh ~/.openclaw/memory/archival.lance
```

### 列出活躍會話

```python
from skills.memory import RecallMemory

recall = RecallMemory()
sessions = recall.list_sessions(limit=10)

for s in sessions:
    print(f"{s['session_id']}: {s['message_count']} messages")
```

## 故障排查

### 問題：記憶無法載入

**症狀**: `CoreMemory.load()` 失敗或返回空

**排查步驟**:

1. 檢查檔案權限
```bash
ls -la SOUL.md USER.md MEMORY.md
```

2. 驗證檔案格式
```bash
head -20 SOUL.md
```

3. 確認路徑正確
```python
from pathlib import Path
print(Path.cwd())
```

**解決方案**:
- 檔案不存在時會自動創建預設模板
- 檢查 workspace_path 參數

### 問題：向量搜索無結果

**症狀**: `archival.search()` 返回空列表

**排查步驟**:

1. 檢查 LanceDB 是否安裝
```python
import lancedb
print(lancedb.__version__)
```

2. 檢查數據是否存在
```python
from skills.memory import ArchivalMemory
archival = ArchivalMemory()
print(archival.get_stats())
```

3. 驗證嵌入生成
```python
results = archival.list_all(limit=5)
print(results)
```

**解決方案**:
- 未安裝 LanceDB 時會回退到內存存儲
- 使用 `embedding_provider="simple"` 作為後備

### 問題：對話歷史丟失

**症狀**: 無法獲取之前的對話

**排查步驟**:

1. 確認 session_id 正確
```python
sessions = recall.list_sessions()
print([s['session_id'] for s in sessions])
```

2. 檢查數據庫連接
```bash
sqlite3 ~/.openclaw/memory/recall.db "SELECT COUNT(*) FROM messages;"
```

**解決方案**:
- session_id 區分大小寫
- 檢查數據庫文件權限

### 問題：內存占用過高

**症狀**: 程序內存使用持續增長

**排查步驟**:

1. 檢查 Archival Memory 規模
```python
stats = archival.get_stats()
print(f"總條目: {stats['total_entries']}")
```

2. 檢查會話數量
```python
sessions = recall.list_sessions(limit=1000)
print(f"總會話數: {len(sessions)}")
```

**解決方案**:
- 定期清理舊會話
- 使用 `recall.clear_session(session_id)`
- 限制存檔記憶大小

## 備份恢復

### 備份記憶數據

```bash
#!/bin/bash
# backup_memory.sh

BACKUP_DIR="$HOME/.openclaw/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 備份 Recall Memory
cp ~/.openclaw/memory/recall.db "$BACKUP_DIR/"

# 備份 Archival Memory
cp -r ~/.openclaw/memory/archival.lance "$BACKUP_DIR/"

# 備份核心記憶檔案
cp SOUL.md USER.md MEMORY.md "$BACKUP_DIR/" 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR"
```

### 恢復記憶數據

```bash
#!/bin/bash
# restore_memory.sh

BACKUP_DIR="$1"

# 停止相關服務
# systemctl stop openclaw || true

# 恢復數據
cp "$BACKUP_DIR/recall.db" ~/.openclaw/memory/
cp -r "$BACKUP_DIR/archival.lance" ~/.openclaw/memory/
cp "$BACKUP_DIR"/SOUL.md "$BACKUP_DIR"/USER.md "$BACKUP_DIR"/MEMORY.md . 2>/dev/null || true

echo "Restore completed from: $BACKUP_DIR"
```

### 導出記憶為 JSON

```python
from skills.memory import RecallMemory, ArchivalMemory
import json

# 導出對話歷史
recall = RecallMemory()
with open('recall_export.json', 'w') as f:
    sessions = recall.list_sessions(limit=1000)
    json.dump(sessions, f, indent=2)

# 導出存檔記憶
archival = ArchivalMemory()
with open('archival_export.json', 'w') as f:
    memories = archival.list_all(limit=1000)
    json.dump(memories, f, indent=2)
```

## 性能優化

### 優化向量搜索

```python
# 使用更高效的嵌入模型
archival = ArchivalMemory(
    embedding_provider="openai",  # 比 simple 更準確
    embedding_dim=1536            # OpenAI 維度
)

# 限制返回結果
results = archival.search(query, limit=3)  # 而非 10
```

### 優化對話歷史

```python
recall = RecallMemory(
    max_context_messages=10,      # 減少上下文消息數
    auto_compress_threshold=30    # 更早壓縮
)
```

### 清理舊數據

```python
# 清理舊會話（30天前）
from datetime import datetime, timedelta

cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()

# 在 SQLite 中執行
import sqlite3
conn = sqlite3.connect('~/.openclaw/memory/recall.db')
conn.execute("DELETE FROM messages WHERE timestamp < ?", (cutoff,))
conn.commit()
```

## 升級維護

### 升級 LanceDB

```bash
pip install --upgrade lancedb pyarrow

# 驗證
python -c "import lancedb; print(lancedb.__version__)"
```

### 遷移數據格式

```python
# 版本升級時可能需要遷移
from skills.memory import ArchivalMemory

archival = ArchivalMemory()

# 備份舊表
# 創建新表
# 遷移數據
```

### 添加新記憶類型

1. 更新 `archival_memory.py` 中的 `memory_type` 驗證
2. 更新文檔
3. 遷移現有數據（如果需要）

## 監控告警

### 關鍵指標

```python
def check_memory_health():
    from skills.memory import create_memory_manager
    
    manager = create_memory_manager()
    stats = manager.get_stats()
    
    alerts = []
    
    # 檢查存檔記憶大小
    if stats['archival']['total_entries'] > 10000:
        alerts.append("Archival memory too large")
    
    # 檢查核心記憶大小
    if stats['core']['total_chars'] > 10000:
        alerts.append("Core memory may exceed context limit")
    
    return alerts
```

## 聯繫支持

- 問題反饋：在專案中創建 Issue
- 文檔更新：提交 PR 到 docs/

---

*最後更新: 2026-02-14*
