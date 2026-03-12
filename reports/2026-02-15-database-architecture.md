# OpenClaw 資料庫架構設計決策

**日期**: 2026-02-15
**決策者**: 小蔡（設計）
**狀態**: ✅ 設計完成，待實施

---

## 決策內容

### 六層架構設計
```
┌─────────────────────────────────────┐
│  🔐 AUTH LAYER (認證層)              │
│  users, user_profiles, api_keys     │
├─────────────────────────────────────┤
│  🤖 AGENT LAYER (Agent層)           │
│  agents, agent_configs, sessions    │
├─────────────────────────────────────┤
│  📋 TASK LAYER (任務層)              │
│  tasks, task_deps, workflows        │
│  ★ 支援 I/O 閉環模式                 │
├─────────────────────────────────────┤
│  🧠 MEMORY LAYER (記憶層)            │
│  memories, contexts, checkpoints    │
│  ★ Hot/Warm/Cold 分層策略           │
├─────────────────────────────────────┤
│  ⚡ EXECUTION LAYER (執行層)         │
│  executions, logs, evolution_log    │
├─────────────────────────────────────┤
│  🚀 PRODUCT LAYER (產品層)           │
│  products, deployments, configs     │
└─────────────────────────────────────┘
```

---

## 核心特性

### 1. I/O 閉環模式支援（Codex/Cursor 相容）

**tasks 表核心欄位**:
```sql
project_path TEXT          -- 專案根目錄
run_path TEXT              -- 執行工作目錄
idempotency_key VARCHAR    -- 冪等性金鑰（防重複執行）
parent_task_id UUID        -- 支援任務樹
input_spec JSONB           -- 輸入規範
output_spec JSONB          -- 輸出規範
context_files JSONB        -- 上下文檔案
output_artifacts JSONB     -- 輸出產物
```

**範例**:
```json
{
  "project_path": "/Users/caijunchang/workspace/my-app",
  "run_path": "/Users/caijunchang/workspace/my-app/src",
  "idempotency_key": "task:code_generation:a1b2c3d4e5",
  "input_spec": {
    "type": "file",
    "path": "src/components/",
    "pattern": "*.tsx"
  },
  "output_spec": {
    "type": "file",
    "path": "src/components/UserProfile.tsx",
    "format": "typescript"
  }
}
```

### 2. 分層記憶策略（Hot/Warm/Cold）

**memories 表核心欄位**:
```sql
memory_tier VARCHAR(10)     -- 'hot', 'warm', 'cold'
access_count INTEGER        -- 訪問次數
last_accessed_at TIMESTAMPTZ
importance_score DECIMAL    -- 重要性分數（0-1）
embedding vector(1536)      -- 向量嵌入（pgvector）
is_compressed BOOLEAN       -- 是否已壓縮
```

**自動分層規則**:
- **Hot**: 近期頻繁訪問（7天內 access_count > 10）
- **Warm**: 中度訪問（30天內有訪問）
- **Cold**: 低頻訪問（>30天未訪問）

### 3. 向量搜尋支援（pgvector）

**啟用擴展**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**索引建立**:
```sql
CREATE INDEX idx_memories_embedding ON memories
    USING hnsw (embedding vector_cosine_ops);
```

**相似度查詢**:
```sql
SELECT * FROM memories
WHERE user_id = $1
ORDER BY embedding <=> $2
LIMIT 5;
```

---

## 數據流設計

```
┌─────────┐   auth   ┌─────────┐
│  User   │─────────▶│  Agent  │
└─────────┘          └────┬────┘
                          │
                          ▼
                     ┌─────────┐
                     │  Task   │
                     └────┬────┘
                          │
                          ▼
     ┌─────────┐    ┌─────────┐
     │ Memory  │◀───│Execution│
     └────┬────┘    └────┬────┘
          │              │
          └──────────────▶
                      ┌─────────┐
                      │ Product │
                      └─────────┘
```

---

## 主要表格說明

### AUTH LAYER
- **users**: 用戶主表（支援OAuth + 密碼登入）
- **user_profiles**: 用戶資料、偏好設定
- **api_keys**: API金鑰管理（支援scope、IP白名單、rate limiting）

### AGENT LAYER
- **agents**: Agent定義（類型、模型、system prompt、工具）
- **agent_configs**: 配置模板（支援版本管理、JSON Schema驗證）
- **agent_sessions**: 運行會話（上下文窗口、記憶引用）

### TASK LAYER
- **tasks**: 任務核心表 ★ I/O閉環支援
- **task_dependencies**: 任務依賴關係（支援required/optional/parallel）
- **workflows**: 工作流定義（DAG結構）
- **workflow_runs**: 工作流執行實例

### MEMORY LAYER
- **memories**: 長期記憶 ★ 分層策略 + 向量搜尋
- **contexts**: 上下文窗口
- **checkpoints**: 檢查點

### EXECUTION LAYER
- **executions**: 執行記錄
- **execution_logs**: 詳細日誌
- **evolution_log**: 進化追蹤

### PRODUCT LAYER
- **products**: 產品定義
- **deployments**: 部署記錄
- **platform_configs**: 平台配置

---

## 索引策略

### 核心索引
```sql
-- 用戶查詢
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_agents_user_id ON agents(user_id);

-- I/O閉環
CREATE INDEX idx_tasks_project_path ON tasks(project_path);
CREATE INDEX idx_tasks_idempotency ON tasks(idempotency_key);

-- 記憶分層
CREATE INDEX idx_memories_tier ON memories(memory_tier);
CREATE INDEX idx_memories_access ON memories(last_accessed_at);

-- JSONB查詢
CREATE INDEX idx_tasks_context_files ON tasks USING gin(context_files);
CREATE INDEX idx_memories_meta ON memories USING gin(meta);

-- 全文搜尋
CREATE INDEX idx_agents_search ON agents
    USING gin(to_tsvector('simple', name || ' ' || COALESCE(description, '')));
```

---

## 效能優化

### 1. 分區表（未來）
- **tasks**: 按 created_at 月度分區
- **executions**: 按 started_at 月度分區
- **memories**: 按 memory_tier 分區

### 2. 物化視圖
- 用戶統計（total_tasks, success_rate）
- Agent效能指標
- 記憶訪問熱度

### 3. 連接池
- pgBouncer 配置
- 最大連接數: 100
- 閒置超時: 60s

---

## 安全設計

### Row-Level Security (RLS)
```sql
-- 用戶只能訪問自己的資料
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_user_policy ON tasks
    FOR ALL USING (user_id = current_user_id());
```

### API Key權限控制
```sql
-- scopes JSONB: ["read", "write", "admin"]
-- allowed_ips INET[]: IP白名單
-- rate_limit_per_minute: 速率限制
```

### 密碼安全
- bcrypt hash（cost=12）
- 強制密碼複雜度
- 支援2FA（未來）

---

## 實施計劃

### Phase 1: 核心表建立
- [x] 設計完成（2026-02-15）
- [ ] Schema SQL生成
- [ ] 本地測試（PostgreSQL 16）
- [ ] Migration腳本編寫

### Phase 2: 功能驗證
- [ ] I/O閉環模式測試
- [ ] 分層記憶自動調度測試
- [ ] 向量搜尋效能測試

### Phase 3: 整合
- [ ] OpenClaw API整合
- [ ] Dashboard前端整合
- [ ] n8n workflow整合

---

## 技術棧

- **資料庫**: PostgreSQL 16
- **擴展**: pgvector, pg_trgm, uuid-ossp
- **ORM**: Prisma（建議）或 TypeORM
- **遷移工具**: Prisma Migrate 或 node-pg-migrate

---

## 參考文件
- 完整SQL Schema: `memory/2026-02-15-database-schema-v1.md`（29KB）
- I/O閉環設計: `memory/2026-02-14-codex-cursor-io-loop.md`
- 分層記憶設計: 本對話中討論（Hot/Warm/Cold架構）

---
**記錄者**: Claude
**記錄時間**: 2026-02-15 22:00
