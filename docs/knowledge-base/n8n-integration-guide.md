# n8n 整合架構規劃與實作指南

> 最契合的技術棧整合 + 完整設定步驟  
> 規劃日期：2026-02-15

---

## 1. 核心技術棧整合圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                        整合架構總覽                                 │
└─────────────────────────────────────────────────────────────────────┘

[OpenClaw / Telegram / Discord]  ←→  [n8n Workflow Engine]
                                              ↓
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
            [AI Agent Layer]          [Cache Layer]           [Memory Layer]
                    ↓                         ↓                         ↓
            [OpenAI/Groq]            [PostgreSQL]              [Qdrant]
            [Claude/Gemini]          [Redis]                   [Vector DB]
                    ↓                         ↓                         ↓
            [Tools Execution]       [Response Cache]          [Long-term Memory]
                    ↓                                              ↓
            [APIs / Database]                            [Embeddings]
```

---

## 2. 最契合的技術組合

### 2.1 必備組合（核心）

| 組件 | 用途 | 為什麼契合 |
|------|------|-----------|
| **Qdrant** | Vector Database | 開源、高效能、n8n 原生支援 |
| **PostgreSQL + pgvector** | 快取 + 結構化資料 | 穩定、可擴展、支援向量搜尋 |
| **Redis** | 短期快取 | 超快讀寫、n8n 內建支援 |
| **OpenAI API** | LLM + Embeddings | 生態完整、n8n 節點完善 |

### 2.2 推薦組合（進階）

| 組件 | 用途 | 整合價值 |
|------|------|----------|
| **Ollama (本地)** | 免費 LLM | 零成本、隱私、n8n 可呼叫 |
| **MinIO / S3** | 檔案儲存 | 便宜、相容 AWS |
| **Grafana + Prometheus** | 監控 | 視覺化 n8n 效能 |

---

## 3. Docker Compose 完整設定

```yaml
version: "3.8"

services:
  # ========== n8n 主服務 ==========
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      # 基礎設定
      - N8N_HOST=${N8N_HOST:-localhost}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - GENERIC_TIMEZONE=Asia/Taipei
      - TZ=Asia/Taipei
      
      # 資料庫
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-n8n_password}
      
      # 安全性
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER:-admin}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD:-changeme}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY:-min16charskey!}
      
      # 執行設定
      - N8N_RUNNERS_ENABLED=true
      - EXECUTIONS_MODE=regular
      - EXECUTIONS_TIMEOUT=300
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=30
      
    volumes:
      - n8n_data:/home/node/.n8n
      - ./local-files:/files
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      qdrant:
        condition: service_healthy

  # ========== PostgreSQL + pgvector ==========
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-n8n_password}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U n8n -d n8n']
      interval: 5s
      timeout: 5s
      retries: 10

  # ========== Redis 快取 ==========
  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 10

  # ========== Qdrant Vector DB ==========
  qdrant:
    image: qdrant/qdrant:latest
    restart: always
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY:-}
    healthcheck:
      test: ['CMD-SHELL', 'bash -c ":> /dev/tcp/127.0.0.1/6333" || exit 1']
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  n8n_data:
  postgres_data:
  redis_data:
  qdrant_data:
```

---

## 4. 資料庫初始化腳本

### 4.1 PostgreSQL 快取表 (init-scripts/01-cache.sql)

```sql
-- 啟用 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- AI 回應快取表
CREATE TABLE ai_response_cache (
    id SERIAL PRIMARY KEY,
    request_hash VARCHAR(32) UNIQUE NOT NULL,
    request_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    embedding VECTOR(1024),
    session_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hit_count INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX idx_cache_hash ON ai_response_cache(request_hash);
CREATE INDEX idx_cache_embedding ON ai_response_cache 
USING ivfflat (embedding vector_cosine_ops);

-- 對話記憶表
CREATE TABLE conversation_memory (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    user_message TEXT,
    ai_response TEXT,
    embedding VECTOR(1024),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conv_session ON conversation_memory(session_id);
CREATE INDEX idx_conv_embedding ON conversation_memory 
USING ivfflat (embedding vector_cosine_ops);
```

### 4.2 Qdrant Collection 建立

```bash
#!/bin/bash
curl -X PUT 'http://localhost:6333/collections/ltm' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1024,
      "distance": "Cosine"
    }
  }'
```

---

## 5. n8n 工作流實作程式碼

### 5.1 快取檢查 Function Node

```javascript
// Check Cache - Function Node
const crypto = require('crypto');

const requestData = $input.first().json;
const message = requestData.message || '';

// 生成請求指紋
const hash = crypto
  .createHash('md5')
  .update(message)
  .digest('hex');

// 回傳檢查結果
return [{
  json: {
    cached: false,
    hash: hash,
    originalData: requestData,
    timestamp: new Date().toISOString()
  }
}];
```

### 5.2 PostgreSQL 快取查詢

```javascript
// 查詢相似快取
const similarityThreshold = 0.92;

const query = `
  SELECT response_text, 1 - (embedding <=> $1::vector) as similarity
  FROM ai_response_cache
  WHERE 1 - (embedding <=> $1::vector) > $2
  ORDER BY similarity DESC
  LIMIT 1
`;

// 這裡需要實際的 PostgreSQL 節點執行
return $input.all();
```

### 5.3 AI Agent System Prompt

```text
你是 AI 助手，使用 RAG_MEMORY 維持長期記憶。

## 核心原則
1. 每次回應前先查詢 RAG_MEMORY 工具
2. 基於檢索到的上下文回應
3. 不使用 session 記憶體儲存資訊

## 查詢策略
- 使用當前話題關鍵字搜尋
- 優先相關性而非數量
- 如無相關記憶，正常回應

## 目標
透過智能檢索提供連續的對話體驗
```

---

## 6. 設定步驟總覽

### Step 1: 啟動基礎設施

```bash
# 建立專案目錄
mkdir ~/n8n-production && cd ~/n8n-production

# 建立必要檔案
touch docker-compose.yml .env
mkdir -p init-scripts local-files

# 啟動服務
docker compose up -d

# 檢查狀態
docker compose ps
```

### Step 2: 初始化資料庫

```bash
# 等待 PostgreSQL 啟動
sleep 10

# 執行 SQL 初始化
docker exec -i n8n-postgres-1 psql -U n8n -d n8n < init-scripts/01-cache.sql

# 建立 Qdrant Collection
curl -X PUT 'http://localhost:6333/collections/ltm' \
  -H 'Content-Type: application/json' \
  -d '{"vectors": {"size": 1024, "distance": "Cosine"}}'
```

### Step 3: 配置 n8n Credentials

在 http://localhost:5678 設定：

1. **OpenAI API Key**
2. **PostgreSQL** (host: postgres, db: n8n)
3. **Redis** (host: redis)
4. **Qdrant** (host: qdrant, port: 6333)

---

## 7. 與 OpenClaw 整合架構

```
[OpenClaw] → [Webhook: /openclaw-task]
                 ↓
         [n8n Cache Gateway]
                 ↓
    ┌────────────┼────────────┐
    ↓            ↓            ↓
[命中快取]   [AI Agent]   [記憶儲存]
    ↓            ↓            ↓
[直接返回]   [生成回應]   [Vector DB]
    └────────────┴────────────┘
                 ↓
           [返回 OpenClaw]
```

---

## 8. 監控與維護

### 8.1 健康檢查命令

```bash
# 檢查所有服務
docker compose ps

# 查看 n8n 日誌
docker compose logs -f n8n

# 檢查資料庫連線
docker exec n8n-postgres-1 pg_isready -U n8n

# 檢查 Qdrant
curl http://localhost:6333/healthz
```

### 8.2 備份腳本

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p $BACKUP_DIR

# 備份 PostgreSQL
docker exec n8n-postgres-1 pg_dump -U n8n n8n > $BACKUP_DIR/postgres.sql

# 備份 n8n 工作流
docker exec n8n n8n export:workflow --all --output=/backup/workflows.json
docker cp n8n:/backup/workflows.json $BACKUP_DIR/

# 備份 Qdrant
docker run --rm -v n8n_qdrant_data:/source -v $(pwd)/$BACKUP_DIR:/backup alpine tar czf /backup/qdrant.tar.gz -C /source .

echo "Backup completed: $BACKUP_DIR"
```

---

*最後更新：2026-02-15*
