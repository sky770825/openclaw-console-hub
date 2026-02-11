# 🤖 Agent Protocol v1.0

**LangGraph 風格的多 Agent 協作協議**  
供 Codex、Cursor Agent、OpenClaw 對接任務板使用

---

## 📐 核心概念對照

| LangGraph | 任務板實作 | 說明 |
|-----------|-----------|------|
| `StateGraph` | `POST /api/openclaw/command` | 狀態機核心 API |
| `Node` | `agent.type: cursor/codex/openclaw` | 任務執行者 |
| `Command(goto)` | `command.goto: "supervisor" \| agentId` | 完成後回報路徑 |
| `State` | `sharedState` | 跨 Agent 共享上下文 |
| `Checkpointer` | Supabase `openclaw_evolution_log` | 執行狀態持久化 |
| `Interrupt` | `POST /api/openclaw/interrupt` | Human-in-the-loop |

---

## 🔄 Command API 規格

### 1. Agent 完成後必須回報

Agent 執行完任務後，**必須**呼叫 Command API，不能只改 task status。

```http
POST /api/openclaw/command
Content-Type: application/json
X-API-Key: {OPENCLAW_API_KEY}

{
  "sessionId": "sess-{timestamp}",      // 協作會話 ID
  "from": "cursor_agent",                // 哪個 Agent 回報
  "command": {
    "update": {                          // 更新共享狀態
      "messages": [
        {"role": "agent", "agent": "cursor", "content": "分析完成..."}
      ],
      "artifacts": {                     // 產生的檔案/資料
        "files": ["src/analysis.md"],
        "data": {"issues_found": 3}
      },
      "taskResult": {                    // 任務執行結果
        "status": "success",             // success | failed | needs_review
        "output": "詳細輸出...",
        "error": null
      }
    },
    "goto": "supervisor"                 // 下一步去哪
  }
}
```

### 2. 回應格式

```json
{
  "ok": true,
  "next": {
    "agent": "codex_agent",              // Supervisor 決定的下一個 Agent
    "task": "根據分析結果重構程式碼",
    "context": {                         // 傳給下一個 Agent 的上下文
      "previousAgent": "cursor_agent",
      "artifacts": {"files": ["src/analysis.md"]}
    }
  }
}
```

---

## 🧠 SharedState 結構

```typescript
interface SharedState {
  sessionId: string;                     // 協作會話唯一 ID
  createdAt: string;                     // ISO 8601
  updatedAt: string;
  
  // 協作訊息歷史（類似 LangGraph messages）
  messages: Array<{
    id: string;
    role: "user" | "supervisor" | "cursor" | "codex" | "openclaw" | "system";
    agent?: string;                      // 哪個 Agent 發的
    content: string;
    timestamp: string;
    metadata?: {
      command?: Command;                 // 如果是 Command 回報
      artifacts?: string[];              // 關聯檔案
    };
  }>;
  
  // 共享上下文（Agent 間傳遞的資料）
  context: {
    workingDir: string;
    files: string[];                     // 當前涉及的檔案
    variables: Record<string, any>;      // 自定義變數
  };
  
  // 執行狀態
  execution: {
    currentAgent: string | null;
    status: "idle" | "running" | "paused" | "completed" | "failed";
    taskStack: string[];                 // 待執行任務堆疊
    completedTasks: string[];
  };
  
  // Human-in-the-loop 狀態
  pendingHuman?: {
    interruptId: string;
    reason: string;                      // 為什麼暫停
    options: string[];                   // 可選操作
    deadline: string;                    // 超時時間
  };
}
```

---

## 👤 Human-in-the-loop 流程

### Agent 請求人工確認

```http
POST /api/openclaw/interrupt
Content-Type: application/json

{
  "sessionId": "sess-xxx",
  "from": "cursor_agent",
  "reason": "需要確認是否覆蓋檔案",
  "details": {
    "files": ["src/config.js"],
    "preview": "即將執行的變更..."
  },
  "options": ["approve", "reject", "modify"],
  "timeoutMinutes": 30
}
```

### 任務板處理

1. 儲存 `pendingHuman` 到 SharedState
2. 發送 Telegram 通知給老蔡
3. 等待 `POST /api/openclaw/resume`

### 人工回應

```http
POST /api/openclaw/resume
Content-Type: application/json

{
  "sessionId": "sess-xxx",
  "interruptId": "int-xxx",
  "decision": "approve",               // approve | reject | modify
  "feedback": "可以，但保留備份"        // 選填
}
```

---

## 🛡️ Agent Capability ACL

每個 Agent 的權限範圍：

| Agent | 讀取 SharedState | 寫入 SharedState | 執行任務 | 呼叫中斷 | 覆蓋檔案 |
|-------|------------------|------------------|----------|----------|----------|
| `cursor_agent` | ✅ | ✅ | ✅ | ❌ | 需確認 |
| `codex_agent` | ✅ | ✅ | ✅ | ❌ | 需確認 |
| `openclaw` | ✅ | ❌ | ✅ | ❌ | 需確認 |
| `supervisor` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `human` | ✅ | ✅ | ✅ | ✅ | ✅ |

### 權限檢查實作

```typescript
// server/src/middleware/agentAuth.ts
function checkAgentCapability(agentId: string, action: Capability): boolean {
  const caps: Record<string, Capability[]> = {
    cursor_agent: ['read', 'write', 'execute'],
    codex_agent: ['read', 'write', 'execute'],
    openclaw: ['read', 'execute'],
    supervisor: ['*'],
  };
  return caps[agentId]?.includes(action) || caps[agentId]?.includes('*');
}
```

---

## 🚀 完整協作流程範例

### 場景：分析並重構專案

```
1. 老蔡輸入：「分析這個專案並重構」
   ↓
2. Supervisor 拆解任務：
   - Task A: 分析程式碼 (cursor_agent)
   - Task B: 重構 (codex_agent, dependsOn: A)
   ↓
3. Cursor Agent 執行 Task A
   - 讀取檔案
   - 產生 analysis.md
   - POST /api/openclaw/command
     {update: {messages: [...], artifacts: {files: ["analysis.md"]}}, goto: "supervisor"}
   ↓
4. Supervisor 收到 Command
   - 更新 SharedState
   - 決定下一個 Agent: codex_agent
   - 傳遞 context.artifacts
   ↓
5. Codex Agent 執行 Task B
   - 讀取 analysis.md
   - 執行重構
   - POST /api/openclaw/command
     {update: {...}, goto: "supervisor"}
   ↓
6. Supervisor 判斷完成
   - 標記 session 為 completed
   - 通知老蔡
```

---

## 📦 資料表設計（Supabase）

```sql
-- 協作會話表
CREATE TABLE openclaw_sessions (
  id TEXT PRIMARY KEY,
  shared_state JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 指令日誌（Audit + Replay）
CREATE TABLE openclaw_commands (
  id SERIAL PRIMARY KEY,
  session_id TEXT REFERENCES openclaw_sessions(id),
  from_agent TEXT NOT NULL,
  command JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Human-in-the-loop 記錄
CREATE TABLE openclaw_interrupts (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES openclaw_sessions(id),
  from_agent TEXT NOT NULL,
  reason TEXT NOT NULL,
  decision TEXT,                      -- approve/reject/modify
  decided_by TEXT,                    -- user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

---

## 🔌 與現有 API 對接

### 現有端點對照

| 現有端點 | Agent Protocol 對應 |
|---------|---------------------|
| `POST /api/tasks/:id/run` | 啟動單一 Agent（無協作） |
| `POST /api/openclaw/run-next` | 啟動下一個 queued 任務 |
| `GET /api/openclaw/evolution-log` | 讀取 messages 歷史 |
| **NEW** `POST /api/openclaw/command` | Agent 回報核心 API |
| **NEW** `POST /api/openclaw/interrupt` | 請求人工介入 |
| **NEW** `POST /api/openclaw/resume` | 人工決定後恢復 |

---

## 📝 實作建議

### 給 Codex/Cursor 的開發指引

1. **Agent 執行器修改**：
   - 原本執行完改 task status → 改為呼叫 `/api/openclaw/command`
   - 攜帶完整輸出到 `update.taskResult`

2. **Supervisor 實作**：
   - 可以是一個獨立的 n8n workflow
   - 或內建在 `POST /api/openclaw/command` 的 handler 裡
   - 職責：解析 Command → 決定下一步 → 更新 SharedState

3. **前端顯示**：
   - 任務板「歷史」分頁顯示 `sharedState.messages`
   - 類似 ChatGPT 的對話界面，但有 Agent 標籤

---

## ❓ 常見問題

**Q: 和現有 `/api/tasks/:id/run` 有什麼不同？**  
A: 現有 API 是單一 Agent 執行。Agent Protocol 支援多 Agent 協作 + 狀態共享。

**Q: 需要改動現有資料表嗎？**  
A: 建議新增 `openclaw_sessions` 表，現有 `openclaw_tasks` 可以關聯到 session。

**Q: 可以單獨使用嗎？**  
A: 可以。不相依 LangGraph，只是採用其設計模式。

---

*版本: 1.0*  
*作者: 小蔡*  
*日期: 2026-02-11*
