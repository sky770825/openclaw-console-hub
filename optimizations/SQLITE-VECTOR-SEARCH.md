# SQLite Vector Search - OpenClaw 安裝與使用指南

> 安裝日期: 2026-03-13
> 系統: macOS Darwin 25.3.0 (arm64 / Apple Silicon)

---

## 1. 安裝結果

### 系統環境

| 項目 | 版本 |
|------|------|
| 架構 | arm64 (Apple Silicon) |
| Python (Xcode) | 3.9.6 (`/Library/Developer/CommandLineTools/.../python3`) |
| Python (Homebrew) | 3.14.3 (`/opt/homebrew/bin/python3`) |
| SQLite | 3.51.0 (2025-06-12) |
| sqlite-vec | v0.1.6 |

### 安裝方式

```bash
pip3 install --break-system-packages sqlite-vec
```

安裝至: `/opt/homebrew/lib/python3.14/site-packages`

**注意**: 系統預設 `python3` 指向 Xcode 的 Python 3.9，無法載入 sqlite-vec。
必須使用 Homebrew 的 Python：

```bash
/opt/homebrew/bin/python3 -c "import sqlite_vec; print('OK')"
```

### 驗證結果

```
sqlite-vec OK
sqlite-vec version: v0.1.6
Full test OK
```

---

## 2. 現有資料庫結構

### 2.1 main.sqlite (主記憶索引)

路徑: `~/.openclaw/memory/main.sqlite`

目前設定 (from `meta` table):
- **Provider**: OpenAI
- **Model**: text-embedding-3-small
- **Dimensions**: 1536
- **Chunk tokens**: 400 (overlap: 80)

統計: 648 chunks, 240 files, 638 embedding cache entries

**核心表**:

```sql
-- 檔案追蹤
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'memory',
  hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  size INTEGER NOT NULL
);

-- 文本分塊 + 嵌入
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'memory',
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  hash TEXT NOT NULL,
  model TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT NOT NULL,       -- JSON 格式的向量
  updated_at INTEGER NOT NULL
);

-- 全文搜索 (FTS5)
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  text, id UNINDEXED, path UNINDEXED,
  source UNINDEXED, model UNINDEXED,
  start_line UNINDEXED, end_line UNINDEXED
);

-- *** 向量搜索 (已存在！使用 vec0) ***
CREATE VIRTUAL TABLE chunks_vec USING vec0(
  id TEXT PRIMARY KEY,
  embedding FLOAT[1536]
);

-- 嵌入快取
CREATE TABLE embedding_cache (
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  hash TEXT NOT NULL,
  embedding TEXT NOT NULL,
  dims INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, model, provider_key, hash)
);
```

### 2.2 l2-opus.sqlite (L2 層記憶)

路徑: `~/.openclaw/memory/l2-opus.sqlite`

結構與 `main.sqlite` 完全相同。
統計: 648 chunks, 240 files

### 2.3 recall.db (對話回憶)

路徑: `~/.openclaw/memory/recall.db`

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE TABLE summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_points TEXT,
  start_time TEXT,
  end_time TEXT,
  message_count INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

統計: 1 message, 0 summaries
**此資料庫尚未有向量搜索功能**。

---

## 3. 發現：向量搜索已部分啟用

`main.sqlite` 和 `l2-opus.sqlite` 已經包含 `chunks_vec` 虛擬表（使用 `vec0` 擴充，FLOAT[1536]）。
這表示 OpenClaw 的記憶系統已具備向量搜索基礎設施。

**但 `recall.db`（對話回憶）尚無向量搜索能力。**

---

## 4. 在 recall.db 中添加向量欄位的方法

若要為 recall.db 添加語義搜索能力（不修改現有表），可使用以下 SQL：

```sql
-- 為 messages 添加向量索引
-- 假設使用 Nomic Embed v1.5 (768 維度)
CREATE VIRTUAL TABLE IF NOT EXISTS messages_vec USING vec0(
  id INTEGER PRIMARY KEY,
  embedding FLOAT[768]
);

-- 為 summaries 添加向量索引
CREATE VIRTUAL TABLE IF NOT EXISTS summaries_vec USING vec0(
  id INTEGER PRIMARY KEY,
  embedding FLOAT[768]
);
```

**插入向量**:

```sql
INSERT INTO messages_vec (id, embedding)
VALUES (123, X'...binary float32 data...');
```

**Python 方式插入**:

```python
import struct
import sqlite3
import sqlite_vec

db = sqlite3.connect('recall.db')
db.enable_load_extension(True)
sqlite_vec.load(db)

# embedding 為 Python list of floats
embedding = [0.1, 0.2, ...]  # 768 維
blob = struct.pack(f'{len(embedding)}f', *embedding)

db.execute(
    'INSERT INTO messages_vec (id, embedding) VALUES (?, ?)',
    (msg_id, blob)
)
db.commit()
```

---

## 5. 搭配 Nomic Embeddings 的使用範例

### 5.1 生成 Nomic Embeddings

```python
import requests

def get_nomic_embedding(text: str, api_key: str) -> list[float]:
    """使用 Nomic Embed v1.5 API 生成嵌入向量 (768 維)"""
    resp = requests.post(
        'https://api-atlas.nomic.ai/v1/embedding/text',
        headers={'Authorization': f'Bearer {api_key}'},
        json={
            'model': 'nomic-embed-text-v1.5',
            'texts': [text],
            'task_type': 'search_document',  # 或 'search_query' 用於查詢
            'dimensionality': 768
        }
    )
    return resp.json()['embeddings'][0]
```

### 5.2 使用 Ollama 本地 Nomic Embeddings (推薦)

```python
import requests

def get_nomic_embedding_local(text: str) -> list[float]:
    """使用 Ollama 本地 Nomic 模型 (免費、離線)"""
    resp = requests.post(
        'http://localhost:11434/api/embed',
        json={
            'model': 'nomic-embed-text',
            'input': text
        }
    )
    return resp.json()['embeddings'][0]
```

### 5.3 完整範例：索引與搜索

```python
import sqlite3
import struct
import sqlite_vec
import requests

DB_PATH = '~/.openclaw/memory/recall.db'
DIMS = 768

def init_vec_table(db):
    """初始化向量表"""
    db.execute(f'''
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_vec
        USING vec0(id INTEGER PRIMARY KEY, embedding FLOAT[{DIMS}])
    ''')

def embed(text: str) -> bytes:
    """取得文本嵌入向量並轉為 bytes"""
    resp = requests.post(
        'http://localhost:11434/api/embed',
        json={'model': 'nomic-embed-text', 'input': text}
    )
    vec = resp.json()['embeddings'][0]
    return struct.pack(f'{len(vec)}f', *vec)

def index_message(db, msg_id: int, content: str):
    """為訊息建立向量索引"""
    vec_blob = embed(content)
    db.execute(
        'INSERT OR REPLACE INTO messages_vec (id, embedding) VALUES (?, ?)',
        (msg_id, vec_blob)
    )
    db.commit()

def semantic_search(db, query: str, top_k: int = 5):
    """語義搜索：根據查詢找出最相關的訊息"""
    query_vec = embed(query)
    results = db.execute('''
        SELECT
            mv.id,
            mv.distance,
            m.role,
            m.content,
            m.timestamp
        FROM messages_vec mv
        JOIN messages m ON m.id = mv.id
        WHERE mv.embedding MATCH ?
            AND k = ?
        ORDER BY mv.distance
    ''', (query_vec, top_k)).fetchall()
    return results

# --- 使用範例 ---
if __name__ == '__main__':
    import os
    db = sqlite3.connect(os.path.expanduser(DB_PATH))
    db.enable_load_extension(True)
    sqlite_vec.load(db)

    init_vec_table(db)

    # 索引所有現有訊息
    messages = db.execute('SELECT id, content FROM messages').fetchall()
    for msg_id, content in messages:
        index_message(db, msg_id, content)
        print(f'Indexed message {msg_id}')

    # 語義搜索
    results = semantic_search(db, '如何部署 Docker 容器？')
    for r in results:
        print(f'[距離: {r[1]:.4f}] [{r[2]}] {r[3][:100]}...')
```

---

## 6. 語義搜索查詢範例

### 6.1 基本向量搜索 (KNN)

```sql
-- 找出與查詢向量最接近的 5 個 chunks
SELECT
    cv.id,
    cv.distance,
    c.text,
    c.path
FROM chunks_vec cv
JOIN chunks c ON c.id = cv.id
WHERE cv.embedding MATCH ?   -- ? = 查詢向量 (binary float32)
    AND k = 5
ORDER BY cv.distance;
```

### 6.2 混合搜索 (FTS + 向量)

```sql
-- 先用 FTS5 縮小範圍，再用向量排序
WITH fts_matches AS (
    SELECT id, path, text
    FROM chunks_fts
    WHERE chunks_fts MATCH 'docker OR 容器'
    LIMIT 50
)
SELECT
    fm.id,
    cv.distance,
    fm.text,
    fm.path
FROM fts_matches fm
JOIN chunks_vec cv ON cv.id = fm.id
WHERE cv.embedding MATCH ?
    AND k = 10
ORDER BY cv.distance
LIMIT 5;
```

### 6.3 帶元數據過濾的搜索

```sql
-- 只搜索特定路徑下的內容
SELECT
    cv.id,
    cv.distance,
    c.text,
    c.path
FROM chunks_vec cv
JOIN chunks c ON c.id = cv.id
WHERE cv.embedding MATCH ?
    AND k = 20
    AND c.path LIKE '%/daily-logs/%'
ORDER BY cv.distance
LIMIT 5;
```

### 6.4 Python 完整查詢範例

```python
import sqlite3, struct, sqlite_vec

db = sqlite3.connect('~/.openclaw/memory/main.sqlite')
db.enable_load_extension(True)
sqlite_vec.load(db)

# 假設 query_embedding 是 1536 維的 float list (OpenAI text-embedding-3-small)
query_blob = struct.pack(f'{len(query_embedding)}f', *query_embedding)

results = db.execute('''
    SELECT cv.id, cv.distance, c.text, c.path
    FROM chunks_vec cv
    JOIN chunks c ON c.id = cv.id
    WHERE cv.embedding MATCH ?
        AND k = 5
    ORDER BY cv.distance
''', (query_blob,)).fetchall()

for chunk_id, distance, text, path in results:
    print(f'[{distance:.4f}] {path}: {text[:80]}...')
```

---

## 7. 切換至 Nomic Embeddings 的遷移計畫

現有系統使用 OpenAI `text-embedding-3-small` (1536 維)。若要切換至 Nomic (768 維)：

1. **新建向量表** (不影響現有的):
   ```sql
   CREATE VIRTUAL TABLE chunks_vec_nomic USING vec0(
     id TEXT PRIMARY KEY,
     embedding FLOAT[768]
   );
   ```

2. **重新嵌入所有 chunks**: 用 Nomic 模型重新生成所有 648 個 chunk 的嵌入向量

3. **更新 meta 表**: 記錄新的模型資訊

4. **驗證後切換**: 確認搜索品質後再替換

**優勢**:
- Nomic 可通過 Ollama 本地運行，無需 API 費用
- 768 維 vs 1536 維，儲存空間減半
- 離線可用，隱私更好

---

## 8. 注意事項

- `python3`（系統預設）指向 Xcode Python 3.9，**無法**使用 sqlite-vec
- 必須使用 `/opt/homebrew/bin/python3`（Python 3.14）才能載入 sqlite-vec
- 建議在 OpenClaw 的腳本中明確指定 Python 路徑或建立 virtualenv
- sqlite-vec 使用餘弦距離時，向量必須先正規化
- `vec0` 虛擬表的 `MATCH` 語法使用二進位 float32 格式，不是 JSON 陣列
