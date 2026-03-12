# OpenClaw 資料庫架構設計文件 v1.0

> 文件版本：2026-02-15-database-schema-v1  
> 適用系統：OpenClaw Agent Management System  
> 設計原則：Codex/Cursor I/O 閉環模式相容

---

## 1. 架構總覽

### 1.1 六層架構圖

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           🔐 AUTH LAYER (認證層)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │    users    │  │user_profiles│  │   api_keys  │  │  sessions   │          │
│  │  (用戶主表)  │  │  (用戶資料)  │  │  (API金鑰)  │  │  (會話管理)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│                           🤖 AGENT LAYER (Agent層)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                           │
│  │    agents   │  │agent_configs│  │agent_sessions│                          │
│  │ (Agent定義) │  │ (配置模板)  │  │ (運行會話)  │                           │
│  └─────────────┘  └─────────────┘  └─────────────┘                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                           📋 TASK LAYER (任務層)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │    tasks    │  │task_deps    │  │  workflows  │  │workflow_runs│          │
│  │ (任務核心)  │  │ (依賴關係)  │  │ (工作流定義)│  │ (工作流執行) │          │
│  │ ★ 支援 I/O │  └─────────────┘  └─────────────┘  └─────────────┘          │
│  │   閉環模式  │                                                              │
│  └─────────────┘                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                          🧠 MEMORY LAYER (記憶層)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                           │
│  │   memories  │  │   contexts  │  │  checkpoints│                           │
│  │ (長期記憶)  │  │ (上下文窗口) │  │ (檢查點)   │                           │
│  │  [Hot/Warm/ │  └─────────────┘  └─────────────┘                           │
│  │   Cold]     │                                                              │
│  └─────────────┘                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                       ⚡ EXECUTION LAYER (執行層)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                           │
│  │  executions │  │execution_logs│  │evolution_log│                          │
│  │  (執行記錄)  │  │  (詳細日誌)  │  │ (進化追蹤)  │                          │
│  │  ★ 含回調   │  └─────────────┘  └─────────────┘                           │
│  └─────────────┘                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                        🚀 PRODUCT LAYER (產品層)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                           │
│  │   products  │  │ deployments │  │platform_configs│                         │
│  │  (產品定義)  │  │  (部署記錄)  │  │ (平台配置)  │                           │
│  └─────────────┘  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 層級間數據流

```
┌─────────────┐    auth    ┌─────────────┐
│    User     │───────────▶│    Agent    │
│  (操作者)    │            │  (執行者)    │
└─────────────┘            └──────┬──────┘
       │                          │
       │                          ▼
       │                   ┌─────────────┐
       │                   │    Task     │
       │                   │  (任務定義)  │
       │                   └──────┬──────┘
       │                          │
       ▼                          ▼
┌─────────────┐            ┌─────────────┐
│   Memory    │◀───────────│  Execution  │
│  (知識庫)   │   store    │  (執行引擎)  │
└──────┬──────┘            └──────┬──────┘
       │                          │
       │         deploy           │
       └─────────────────────────▶│
                                  ▼
                           ┌─────────────┐
                           │   Product   │
                           │  (產品輸出)  │
                           └─────────────┘
```

---

## 2. 完整 SQL Schema

### 2.1 啟用擴展

```sql
-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 啟用向量擴展 (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 啟用全文搜尋
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 啟用時間戳自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## 3. AUTH LAYER（認證層）

### 3.1 users - 用戶主表

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 認證資訊
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- 可為空（OAuth用戶）
    
    -- OAuth 資訊
    oauth_provider VARCHAR(50), -- 'google', 'github', 'discord'
    oauth_id VARCHAR(255),
    
    -- 用戶狀態
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'suspended', 'pending', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- 配額限制
    quota_tier VARCHAR(20) DEFAULT 'free' 
        CHECK (quota_tier IN ('free', 'pro', 'enterprise')),
    daily_task_limit INTEGER DEFAULT 100,
    storage_limit_mb INTEGER DEFAULT 512,
    
    -- 時間戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- 約束
    CONSTRAINT chk_oauth_or_password CHECK (
        (password_hash IS NOT NULL) OR 
        (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)
    )
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';

-- 自動更新時間戳
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**欄位說明：**

| 欄位 | 類型 | 說明 | 範例 |
|------|------|------|------|
| id | UUID | 主鍵 | `a1b2c3d4...` |
| email | VARCHAR | 登入郵箱 | `user@example.com` |
| oauth_provider | VARCHAR | OAuth 提供者 | `google` |
| quota_tier | VARCHAR | 配額等級 | `pro` |

### 3.2 user_profiles - 用戶資料表

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 基本資料
    display_name VARCHAR(100),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
    locale VARCHAR(10) DEFAULT 'zh-TW',
    
    -- 偏好設定
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'system')),
    notification_email BOOLEAN DEFAULT TRUE,
    notification_telegram BOOLEAN DEFAULT FALSE,
    telegram_chat_id VARCHAR(100),
    
    -- API 偏好
    default_model VARCHAR(50) DEFAULT 'kimi-k2.5',
    default_agent_config JSONB DEFAULT '{}',
    
    -- 統計
    total_tasks_completed INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 api_keys - API 金鑰表

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 金鑰資訊
    key_hash VARCHAR(255) NOT NULL, -- 儲存 hash，非明文
    key_prefix VARCHAR(10) NOT NULL, -- 用於識別，如 `oc_`
    name VARCHAR(100) NOT NULL, -- 金鑰名稱
    
    -- 權限範圍
    scopes JSONB DEFAULT '["read", "write"]', -- ["read", "write", "admin"]
    allowed_ips INET[], -- IP 白名單，NULL = 不限
    
    -- 限制
    rate_limit_per_minute INTEGER DEFAULT 60,
    expires_at TIMESTAMPTZ,
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_scopes_is_array CHECK (jsonb_typeof(scopes) = 'array')
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
```

---

## 4. AGENT LAYER（Agent 層）

### 4.1 agents - Agent 定義表

```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 基本資訊
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    
    -- Agent 類型
    agent_type VARCHAR(50) NOT NULL 
        CHECK (agent_type IN (
            'coding',       -- 程式編寫
            'analysis',     -- 分析型
            'creative',     -- 創意型
            'executor',     -- 執行型
            'research',     -- 研究型
            'custom'        -- 自定義
        )),
    
    -- 使用的模型
    model_provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'kimi', 'grok'
    model_name VARCHAR(100) NOT NULL,    -- 'gpt-4', 'kimi-k2.5', 'grok-4.1'
    
    -- 核心配置
    system_prompt TEXT NOT NULL,         -- 系統提示詞
    tools_enabled JSONB DEFAULT '[]',    -- 啟用的工具列表
    
    -- 高級參數
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 2),
    max_tokens INTEGER DEFAULT 4096,
    top_p DECIMAL(3,2) DEFAULT 1.0,
    
    -- 狀態
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,     -- 是否公開分享
    
    -- 統計
    total_runs INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_model ON agents(model_provider, model_name);
CREATE INDEX idx_agents_active ON agents(is_active) WHERE is_active = TRUE;

-- 全文搜尋索引
CREATE INDEX idx_agents_search ON agents 
    USING gin(to_tsvector('simple', name || ' ' || COALESCE(description, '')));

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 agent_configs - Agent 配置模板表

```sql
CREATE TABLE agent_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- 配置名稱與版本
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    is_default BOOLEAN DEFAULT FALSE,
    
    -- 詳細配置（JSON Schema 驗證）
    config_schema JSONB NOT NULL,        -- 配置結構定義
    config_values JSONB NOT NULL,        -- 實際配置值
    
    -- 環境變數模板
    env_template JSONB DEFAULT '{}',     -- {"OPENAI_API_KEY": "${secret:openai_key}"}
    
    -- 檔案路徑模板
    file_templates JSONB DEFAULT '[]',   -- 代碼生成模板
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_configs_agent_id ON agent_configs(agent_id);
CREATE UNIQUE INDEX idx_agent_configs_default 
    ON agent_configs(agent_id) WHERE is_default = TRUE;
```

### 4.3 agent_sessions - Agent 運行會話表

```sql
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 會話識別
    session_name VARCHAR(200),
    parent_session_id UUID REFERENCES agent_sessions(id), -- 支援會話分支
    
    -- 狀態
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'completed', 'error')),
    
    -- 上下文窗口
    context_window JSONB DEFAULT '[]',   -- 當前對話歷史
    context_tokens INTEGER DEFAULT 0,    -- 當前 token 使用量
    max_context_tokens INTEGER DEFAULT 128000,
    
    -- 暫存記憶引用
    memory_refs UUID[],                  -- 引用 memories 表
    
    -- 運行時配置
    runtime_config JSONB DEFAULT '{}',   -- 會話級別覆蓋配置
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX idx_agent_sessions_user_id ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX idx_agent_sessions_activity ON agent_sessions(last_activity_at);
```

---

## 5. TASK LAYER（任務層）

### 5.1 tasks - 任務核心表 ★ I/O 閉環模式支援

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- === I/O 閉環模式欄位（Codex/Cursor 相容）===
    
    -- 專案路徑：任務所屬的專案根目錄
    project_path TEXT,
    
    -- 運行路徑：本次執行的工作目錄
    run_path TEXT,
    
    -- 冪等性金鑰：防止重複執行（格式：task:{type}:{hash}）
    idempotency_key VARCHAR(255) UNIQUE,
    
    -- 父任務：支援任務樹/子任務
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- ============================================
    
    -- 任務識別
    task_type VARCHAR(50) NOT NULL 
        CHECK (task_type IN (
            'code_generation',   -- 代碼生成
            'code_review',       -- 代碼審查
            'refactoring',       -- 重構
            'documentation',     -- 文件生成
            'testing',           -- 測試生成
            'deployment',        -- 部署任務
            'analysis',          -- 分析任務
            'custom'             -- 自定義
        )),
    
    -- 任務內容
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,              -- 給 AI 的完整提示詞
    context_files JSONB DEFAULT '[]',  -- 相關檔案路徑列表
    expected_output JSONB,             -- 預期輸出描述
    
    -- 輸入/輸出規範（I/O 閉環）
    input_spec JSONB DEFAULT '{}',     -- {"type": "file", "path": "src/", "pattern": "*.ts"}
    output_spec JSONB DEFAULT '{}',    -- {"type": "file", "path": "dist/", "format": "json"}
    
    -- 任務狀態
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- 等待執行
            'queued',       -- 已排隊
            'running',      -- 執行中
            'paused',       -- 已暫停
            'completed',    -- 已完成
            'failed',       -- 執行失敗
            'cancelled',    -- 已取消
            'retrying'      -- 重試中
        )),
    
    -- 優先級（數字越小優先級越高）
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- 執行控制
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    timeout_seconds INTEGER DEFAULT 300,
    
    -- 排程
    scheduled_at TIMESTAMPTZ,          -- 預定執行時間
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- 結果
    result JSONB,                      -- 執行結果
    result_summary TEXT,               -- 結果摘要
    output_artifacts JSONB DEFAULT '[]', -- 輸出產物路徑
    
    -- 資源使用
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,4),       -- 預估成本（USD）
    
    -- 執行元數據
    execution_meta JSONB DEFAULT '{}', -- {"git_commit": "abc123", "branch": "main"}
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 核心索引
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE status IN ('pending', 'queued');
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- I/O 閉環索引
CREATE INDEX idx_tasks_project_path ON tasks(project_path);
CREATE INDEX idx_tasks_idempotency ON tasks(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 複合索引（常用查詢）
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_agent_status ON tasks(agent_id, status);

-- JSONB 索引
CREATE INDEX idx_tasks_context_files ON tasks USING gin(context_files);
CREATE INDEX idx_tasks_output_artifacts ON tasks USING gin(output_artifacts);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**I/O 閉環模式欄位說明：**

| 欄位 | 類型 | 說明 | Codex/Cursor 對應 |
|------|------|------|-------------------|
| `project_path` | TEXT | 專案根目錄絕對路徑 | `workdir` |
| `run_path` | TEXT | 本次執行工作目錄 | `cwd` |
| `idempotency_key` | VARCHAR | 冪等性金鑰 | `idempotency-key` |
| `input_spec` | JSONB | 輸入規範 | `files` / `prompt` |
| `output_spec` | JSONB | 輸出規範 | 自定義 |
| `context_files` | JSONB | 上下文檔案 | `references` |
| `output_artifacts` | JSONB | 輸出產物 | `command.outputs` |

**範例：**

```json
{
  "id": "task_abc123",
  "project_path": "/Users/caijunchang/workspace/my-app",
  "run_path": "/Users/caijunchang/workspace/my-app/src",
  "idempotency_key": "task:code_generation:a1b2c3d4e5",
  "task_type": "code_generation",
  "prompt": "Generate a React component for user profile...",
  "context_files": ["src/types.ts", "src/api/users.ts"],
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

### 5.2 task_dependencies - 任務依賴關係表

```sql
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 依賴關係（task_id 依賴於 depends_on_task_id）
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- 依賴類型
    dependency_type VARCHAR(30) DEFAULT 'required'
        CHECK (dependency_type IN (
            'required',     -- 強依賴：前置任務必須成功
            'optional',     -- 弱依賴：前置任務失敗仍可執行
            'parallel'      -- 並行：可與前置任務同時執行
        )),
    
    -- 條件表達式（進階）
    condition_expr TEXT,  -- e.g., "${prev.status} == 'completed' && ${prev.output.exit_code} == 0"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 防止重複依賴
    CONSTRAINT uniq_task_dependency UNIQUE (task_id, depends_on_task_id),
    -- 防止自依賴
    CONSTRAINT chk_no_self_dep CHECK (task_id != depends_on_task_id)
);

CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends ON task_dependencies(depends_on_task_id);
```

### 5.3 workflows - 工作流定義表

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 基本資訊
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 工作流定義（DAG）
    definition JSONB NOT NULL,  -- 節點和邊的定義
    
    -- 觸發配置
    trigger_type VARCHAR(30) DEFAULT 'manual'
        CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'git_push', 'api')),
    trigger_config JSONB DEFAULT '{}',  -- 觸發條件詳細配置
    
    -- 執行配置
    concurrency_limit INTEGER DEFAULT 1,  -- 並行執行限制
    timeout_minutes INTEGER DEFAULT 30,
    
    -- 版本控制
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE,  -- 是否為可分享的模板
    
    -- 統計
    total_runs INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_trigger ON workflows(trigger_type);
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**workflow.definition JSON 結構範例：**

```json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "task",
      "task_id": "task_uuid_1",
      "name": "程式碼分析"
    },
    {
      "id": "node_2", 
      "type": "task",
      "task_id": "task_uuid_2",
      "name": "生成測試"
    },
    {
      "id": "node_3",
      "type": "condition",
      "condition": "${node_2.exit_code} == 0"
    }
  ],
  "edges": [
    {"from": "node_1", "to": "node_2"},
    {"from": "node_2", "to": "node_3"}
  ]
}
```

### 5.4 workflow_runs - 工作流執行實例表

```sql
CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 執行識別
    run_number INTEGER NOT NULL,  -- 第 N 次執行
    
    -- 觸發資訊
    triggered_by VARCHAR(50),     -- 'user', 'scheduler', 'webhook'
    trigger_payload JSONB,        -- 觸發時的原始數據
    
    -- 執行狀態
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- 執行時間
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,          -- 執行耗時
    
    -- 節點執行狀態
    node_states JSONB DEFAULT '{}',  -- {"node_1": "completed", "node_2": "running"}
    
    -- 輸入/輸出
    inputs JSONB DEFAULT '{}',    -- 工作流輸入參數
    outputs JSONB DEFAULT '{}',   -- 工作流輸出結果
    
    -- 錯誤資訊
    error_message TEXT,
    error_node_id VARCHAR(100),   -- 出錯的節點
    
    -- Git 資訊（如果適用）
    git_commit VARCHAR(40),
    git_branch VARCHAR(100),
    git_repo_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_user ON workflow_runs(user_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_runs_run_number ON workflow_runs(workflow_id, run_number DESC);
```

---

## 6. MEMORY LAYER（記憶層）

### 6.1 memories - 長期記憶表 ★ 分層記憶策略

```sql
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- === 分層記憶策略 ===
    
    -- 記憶分層：Hot / Warm / Cold
    memory_tier VARCHAR(10) DEFAULT 'warm'
        CHECK (memory_tier IN ('hot', 'warm', 'cold')),
    
    -- 訪問統計（用於自動分層調度）
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    
    -- ====================
    
    -- 記憶類型
    memory_type VARCHAR(50) NOT NULL
        CHECK (memory_type IN (
            'conversation',  -- 對話記憶
            'code_pattern',  -- 代碼模式
            'error_pattern', -- 錯誤模式
            'preference',    -- 用戶偏好
            'knowledge',     -- 領域知識
            'checkpoint',    -- 檢查點
            'feedback'       -- 反饋記憶
        )),
    
    -- 記憶內容
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_summary TEXT,              -- 用於快速預覽的摘要
    
    -- 向量嵌入（pgvector）
    embedding vector(1536),            -- OpenAI text-embedding-3-small
    -- embedding vector(3072),         -- OpenAI text-embedding-3-large
    
    -- 來源資訊
    source_type VARCHAR(50),           -- 'task', 'execution', 'manual'
    source_id UUID,                    -- 關聯的任務或執行 ID
    
    -- 元數據
    meta JSONB DEFAULT '{}',           -- 額外元數據
    tags TEXT[],                       -- 標籤
    
    -- 過期控制
    expires_at TIMESTAMPTZ,            -- NULL = 永不過期
    
    -- 重要性分數（用於檢索排序）
    importance_score DECIMAL(4,3) DEFAULT 0.5 CHECK (importance_score BETWEEN 0 AND 1),
    
    -- 壓縮狀態
    is_compressed BOOLEAN DEFAULT FALSE,
    original_length INTEGER,           -- 壓縮前長度
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 核心索引
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_tier ON memories(memory_tier);
CREATE INDEX idx_memories_source ON memories(source_type, source_id);

-- 向量相似度搜尋索引（HNSW - 高效最近鄰搜尋）
CREATE INDEX idx_memories_embedding ON memories 
    USING hns
