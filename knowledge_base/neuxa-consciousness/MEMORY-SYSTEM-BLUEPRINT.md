# 記憶系統架構圖

## 1. 系統概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenClaw 記憶系統                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   記憶來源    │    │   索引引擎    │    │   查詢介面    │       │
│  │  (Sources)   │───→│   (Index)    │───→│   (Query)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ↓                   ↓                   ↓                │
│    MEMORY.md           SQLite +           memory_search           │
│    memory/*.md         Vector Ext         memory_get              │
│    sessions 記錄       (sqlite-vec)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 記憶來源 (Sources)

### 2.1 檔案來源

```
workspace/
├── MEMORY.md                 # 主記憶檔案
└── memory/
    ├── decisions.md          # 決策記錄
    ├── preferences.md        # 偏好設定
    ├── todos.md              # 待辦事項
    └── ...                   # 任意 .md 檔案
```

### 2.2 會話來源 (實驗性)

```typescript
sources: ["memory", "sessions"]  // sessions = 歷史對話記錄
```

## 3. 索引引擎 (Index)

### 3.1 架構

```
┌────────────────────────────────────────┐
│           記憶索引管理器                 │
│         MemorySearchManager            │
├────────────────────────────────────────┤
│                                        │
│  ┌─────────────┐    ┌─────────────┐    │
│  │   嵌入引擎   │    │   儲存後端   │    │
│  │  Embedding  │    │   Storage   │    │
│  │             │    │             │    │
│  │ • OpenAI    │    │ • SQLite    │    │
│  │ • Gemini    │    │   + sqlite  │    │
│  │ • Local     │    │   -vec      │    │
│  │ • Voyage    │    │ • QMD       │    │
│  │ • Mistral   │    │   (純文字)   │    │
│  └─────────────┘    └─────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

### 3.2 嵌入提供者

```typescript
provider: "openai" | "local" | "gemini" | "voyage" | "mistral" | "auto"

// 預設模型
DEFAULT_OPENAI_MODEL = "text-embedding-3-small"
DEFAULT_GEMINI_MODEL = "gemini-embedding-001"
DEFAULT_VOYAGE_MODEL = "voyage-4-large"
DEFAULT_MISTRAL_MODEL = "mistral-embed"
```

### 3.3 儲存結構

```typescript
store: {
  driver: "sqlite";
  path: "{agentId}.sqlite";
  vector: {
    enabled: true;
    extensionPath?: string;  // sqlite-vec 擴展路徑
  };
}
```

### 3.4 同步策略

```typescript
sync: {
  onSessionStart: true;    // 會話啟動時同步
  onSearch: true;          // 搜尋時同步
  watch: true;             // 監視檔案變更
  watchDebounceMs: 1500;   // 去抖動 1.5s
  intervalMinutes: 0;      // 定期同步 (0=禁用)
}
```

## 4. 查詢介面 (Query)

### 4.1 memory_search 工具

```typescript
// 參數
{
  query: string;           // 搜尋查詢
  maxResults?: number;     // 最大結果數 (預設 6)
  minScore?: number;       // 最小相似度 (預設 0.35)
}

// 返回
{
  results: [
    {
      path: string;        // 檔案路徑
      snippet: string;     // 內容片段
      startLine: number;   // 起始行
      endLine: number;     // 結束行
      score: number;       // 相似度分數
      citation?: string;   // 引用格式
    }
  ],
  provider: string;        // 嵌入提供者
  model: string;           // 模型名稱
  fallback?: boolean;      // 是否使用 fallback
}
```

### 4.2 memory_get 工具

```typescript
// 參數
{
  path: string;           // 檔案路徑
  from?: number;          // 起始行
  lines?: number;         // 行數
}

// 返回
{
  path: string;
  text: string;           // 檔案內容或指定行
  disabled?: boolean;
  error?: string;
}
```

## 5. 混合搜尋 (Hybrid Search)

### 5.1 架構

```
┌─────────────────────────────────────────┐
│           混合搜尋引擎                   │
├─────────────────────────────────────────┤
│                                         │
│  查詢 ──→ ┌─────────────┐              │
│           │  向量搜尋    │ ──┐          │
│           │  (Vector)   │   │          │
│           └─────────────┘   │  加權    │
│                             ├──→ 排序   │
│           ┌─────────────┐   │  (RRF)   │
│           │  文字搜尋    │ ──┘          │
│           │  (Text/FTS) │              │
│           └─────────────┘              │
│                                         │
└─────────────────────────────────────────┘
```

### 5.2 配置

```typescript
hybrid: {
  enabled: true;
  vectorWeight: 0.7;        // 向量搜尋權重
  textWeight: 0.3;          // 文字搜尋權重
  candidateMultiplier: 4;   // 候選倍數
  mmr: {
    enabled: false;         // 最大邊緣相關性
    lambda: 0.7;
  };
  temporalDecay: {
    enabled: false;         // 時間衰減
    halfLifeDays: 30;
  };
}
```

## 6. 引用控制 (Citations)

### 6.1 模式

```typescript
citations: "on" | "off" | "auto"

// auto: 私聊顯示引用，群組/頻道隱藏
// on: 永遠顯示
// off: 永不顯示
```

### 6.2 引用格式

```
Source: path/to/file.md#L10-L15
```

## 7. 記憶召回提示詞

### 7.1 System Prompt 段落

```
## Memory Recall
Before answering anything about prior work, decisions, dates, people, 
preferences, or todos: run memory_search on MEMORY.md + memory/*.md; 
then use memory_get to pull only the needed lines. 

If low confidence after search, say you checked.
```

## 8. 資料流

### 8.1 寫入流程

```
MEMORY.md 修改
    ↓
檔案系統通知 (watch)
    ↓
去抖動 (1500ms)
    ↓
讀取檔案內容
    ↓
分塊 (chunking)
    • tokens: 400 (每塊最大 token)
    • overlap: 80 (重疊 token 數)
    ↓
生成嵌入向量
    ↓
寫入 SQLite (sqlite-vec)
```

### 8.2 查詢流程

```
memory_search 呼叫
    ↓
檢查是否需要同步
    ↓
生成查詢嵌入
    ↓
向量搜尋 (Top-K)
    ↓
文字搜尋 (FTS) ──→ 混合排序 (RRF)
    ↓
過濾 (minScore)
    ↓
限制 (maxResults)
    ↓
添加引用 (可選)
    ↓
返回結果
```

## 9. 限制與配額

### 9.1 查詢限制

```typescript
query: {
  maxResults: 6;        // 最大結果數
  minScore: 0.35;       // 最小相似度
}
```

### 9.2 分塊限制

```typescript
chunking: {
  tokens: 400;          // 每塊 token 數
  overlap: 80;          // 重疊 token 數
}
```

### 9.3 注入限制 (QMD 模式)

```typescript
qmd: {
  limits: {
    maxInjectedChars: number;  // 最大注入字元數
  }
}
```

## 10. 錯誤處理

### 10.1 不可用狀態

```typescript
{
  results: [],
  disabled: true,
  unavailable: true,
  error: "insufficient_quota",
  warning: "Memory search is unavailable because the embedding provider quota is exhausted.",
  action: "Top up or switch embedding provider, then retry memory_search."
}
```

### 10.2 降級策略

```typescript
fallback: "openai" | "gemini" | "local" | "voyage" | "mistral" | "none"
```

## 11. 配置範例

```yaml
# openclaw.config.yaml
memory:
  search:
    enabled: true
    provider: "openai"
    model: "text-embedding-3-small"
    fallback: "local"
    sources: ["memory", "sessions"]
    experimental:
      sessionMemory: true
    query:
      maxResults: 10
      minScore: 0.3
      hybrid:
        enabled: true
        vectorWeight: 0.7
        textWeight: 0.3
    sync:
      onSessionStart: true
      onSearch: true
      watch: true
  citations: "auto"
```
