# MemGPT-Style Layered Memory System

OpenClaw 的分層記憶系統，實現 MemGPT 風格的三層記憶架構。

## 架構概述

```
┌─────────────────────────────────────────┐
│  Core Memory - 核心記憶（總是存在）      │
│  ├── SOUL.md (Persona/人設)             │
│  ├── USER.md (用戶資訊)                 │
│  └── MEMORY.md (擴展記憶)               │
├─────────────────────────────────────────┤
│  Recall Memory - 召回記憶（對話歷史）    │
│  └── SQLite 存儲的完整交互記錄           │
├─────────────────────────────────────────┤
│  Archival Memory - 存檔記憶（長期知識）  │
│  └── LanceDB 向量數據庫                  │
└─────────────────────────────────────────┘
```

## 核心概念對應

| MemGPT | OpenClaw 實現 | 檔案 |
|--------|--------------|------|
| Core Memory (Persona) | SOUL.md | 核心人設 |
| Core Memory (Human) | USER.md + MEMORY.md | 用戶資訊 |
| Recall Memory | recall_memory.py | 對話歷史 |
| Archival Memory | archival_memory.py | 向量存儲 |
| Self-Editing | auto_summarize.py | 自動摘要 |

## 快速開始

### 基本使用

```python
from skills.memory import create_memory_manager

# 創建記憶管理器
manager = create_memory_manager(workspace_path="/path/to/workspace")

# 獲取完整上下文
context = manager.get_full_context(
    session_id="session-001",
    query="用戶上次說了什麼關於 Python 的"
)

# 格式化為 LLM 消息
messages = manager.format_context_for_llm(context)

# 添加新消息
manager.add_message(
    session_id="session-001",
    role="user",
    content="我想學習 Python"
)
```

### 獨立使用各層記憶

```python
# 核心記憶
from skills.memory import CoreMemory
core = CoreMemory().load()
print(core.get_context_prompt())

# 召回記憶
from skills.memory import RecallMemory
recall = RecallMemory()
recall.add_message("session-1", "user", "Hello")
messages = recall.get_recent_messages("session-1")

# 存檔記憶
from skills.memory import ArchivalMemory
archival = ArchivalMemory()
archival.insert("用戶喜歡 Python", memory_type="preference")
results = archival.search("用戶喜歡什麼語言")
```

## 組件說明

### 1. Core Memory (`core_memory.py`)

固定載入的核心記憶檔案：
- **SOUL.md**: Agent 人設和個性
- **USER.md**: 用戶基本資訊
- **MEMORY.md**: 擴展記憶和偏好

特性：
- 總是存在於 LLM 上下文
- 固定載入，不會被洗掉
- 支持唯讀或 Agent 管理

### 2. Recall Memory (`recall_memory.py`)

對話歷史存儲：
- 基於 SQLite 的輕量存儲
- 支持按 session 查詢
- 自動壓縮舊對話
- 關鍵字搜索

配置：
```python
recall = RecallMemory(
    db_path="~/.openclaw/memory/recall.db",
    max_context_messages=20,      # 最大上下文消息數
    auto_compress_threshold=50    # 自動壓縮閾值
)
```

### 3. Archival Memory (`archival_memory.py`)

長期知識存儲：
- 基於 LanceDB 的向量存儲
- 支持向量搜索
- 混合檢索（向量 + 關鍵詞）
- 多種記憶類型（fact/preference/event/summary）

配置：
```python
archival = ArchivalMemory(
    db_path="~/.openclaw/memory/archival.lance",
    embedding_provider="simple",  # 或 "openai"
    embedding_dim=384
)
```

### 4. Auto Summarize (`auto_summarize.py`)

自動摘要功能：
- 對話結束時生成摘要
- 提取關鍵信息點
- 識別用戶偏好和事實
- 自動存儲到 Archival Memory

### 5. Memory Manager (`memory_manager.py`)

統一管理器：
- 協調三層記憶
- 智能組合上下文
- 統一搜索接口
- 會話管理

## 數據存儲

### 默認路徑

```
~/.openclaw/memory/
├── recall.db          # SQLite 對話歷史
└── archival.lance/    # LanceDB 向量數據
```

### 核心記憶檔案

```
/workspace/
├── SOUL.md            # Agent 人設
├── USER.md            # 用戶資訊
└── MEMORY.md          # 擴展記憶
```

## 記憶寫入流程

```
新消息
   ↓
Recall Memory (SQLite)
   ↓
會話結束 / 達到閾值
   ↓
Auto Summarize
   ↓
Archival Memory (LanceDB) + 更新 Core Memory
```

## API 參考

### MemoryManager

```python
class MemoryManager:
    def get_full_context(session_id, query=None) -> MemoryContext
    def format_context_for_llm(context) -> List[Dict]
    def add_message(session_id, role, content, metadata=None) -> int
    def search_all_memories(query, session_id=None, limit=5) -> Dict
    def end_session(session_id, generate_summary=True)
```

### 記憶類型

```python
memory_type: "fact" | "preference" | "event" | "summary" | "key_point"
```

## 與現有系統整合

此記憶系統與現有 `git-notes-memory` 並存：
- `skills/memory/` - 新的分層記憶系統
- `skills/git-notes-memory/` - 現有的 Git Notes 記憶（保留）

兩者可根據場景選擇使用：
- 新系統：適合長期對話、智能召回
- 舊系統：適合項目相關、分支感知記憶

## 依賴

```
# 必需
- Python 3.8+

# 可選（增強功能）
- lancedb       # 向量存儲
- pyarrow       # 數據處理
- openai        # OpenAI 嵌入
```

## 許可證

MIT
