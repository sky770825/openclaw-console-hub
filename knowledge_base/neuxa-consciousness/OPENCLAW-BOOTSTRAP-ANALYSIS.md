# OpenClaw 啟動機制完整分析

## 1. 啟動檔案注入流程

### 1.1 核心流程圖

```
會話啟動
  ↓
resolveBootstrapContextForRun()
  ↓
┌─────────────────┬──────────────────┐
↓                 ↓                  ↓
getOrLoadBootstrapFiles()    loadWorkspaceBootstrapFiles()
(使用快取)                    (從磁碟載入)
  ↓                            ↓
filterBootstrapFilesForSession()   ← 子代理/CRON 使用 MINIMAL 清單
  ↓
applyBootstrapHookOverrides()      ← 執行 hooks
  ↓
sanitizeBootstrapFiles()
  ↓
buildBootstrapContextFiles()       ← 建構最終注入內容
  ↓
注入至 System Prompt
```

### 1.2 關鍵檔案

| 檔案 | 功能 |
|------|------|
| `bootstrap-files.ts` | 主入口，協調整個啟動流程 |
| `bootstrap-cache.ts` | 按 sessionKey 快取啟動檔案 |
| `bootstrap-hooks.ts` | 執行 agent_bootstrap hooks |
| `workspace.ts` | 載入工作空間啟動檔案 |
| `pi-embedded-helpers/bootstrap.ts` | 建構最終注入內容 |

### 1.3 預設啟動檔案清單

```typescript
// workspace.ts
const DEFAULT_AGENTS_FILENAME = "AGENTS.md";
const DEFAULT_SOUL_FILENAME = "SOUL.md";
const DEFAULT_TOOLS_FILENAME = "TOOLS.md";
const DEFAULT_IDENTITY_FILENAME = "IDENTITY.md";
const DEFAULT_USER_FILENAME = "USER.md";
const DEFAULT_HEARTBEAT_FILENAME = "HEARTBEAT.md";
const DEFAULT_BOOTSTRAP_FILENAME = "BOOTSTRAP.md";
const DEFAULT_MEMORY_FILENAME = "MEMORY.md";
```

### 1.4 子代理/CRON 最小化清單

```typescript
const MINIMAL_BOOTSTRAP_ALLOWLIST = new Set([
  DEFAULT_AGENTS_FILENAME,      // 核心身份
  DEFAULT_TOOLS_FILENAME,       // 工具指南
  DEFAULT_SOUL_FILENAME,        // 靈魂核心
  DEFAULT_IDENTITY_FILENAME,    // 身份定義
  DEFAULT_USER_FILENAME,        // 使用者資訊
]);
```

### 1.5 內容截斷策略

```typescript
// 預設限制
DEFAULT_BOOTSTRAP_MAX_CHARS = 20_000;      // 單檔限制
DEFAULT_BOOTSTRAP_TOTAL_MAX_CHARS = 150_000; // 總計限制

// 截斷比例 (保留頭尾)
BOOTSTRAP_HEAD_RATIO = 0.7;  // 保留前 70%
BOOTSTRAP_TAIL_RATIO = 0.2;  // 保留後 20%
```

## 2. 系統提示詞構建

### 2.1 注入點

`buildAgentSystemPrompt()` 在 `system-prompt.ts` 中負責組合最終 System Prompt。

### 2.2 關鍵段落

| 段落 | 條件 | 內容 |
|------|------|------|
| Tooling | 永遠 | 可用工具列表 |
| Skills | skillsPrompt 存在 | 技能掃描結果 |
| Memory Recall | 非 minimal 模式 + memory_search 可用 | 記憶召回指引 |
| Workspace Files | contextFiles 存在 | 注入的啟動檔案內容 |
| Subagent Context | minimal 模式 | 子代理上下文 |

### 2.3 Prompt 模式

```typescript
type PromptMode = "full" | "minimal" | "none";

// full: 主對話，所有段落
// minimal: 子代理，減少段落
// none: 僅基本身份行
```

### 2.4 檔案注入實現

```typescript
// system-prompt.ts
const validContextFiles = contextFiles.filter(
  (file) => typeof file.path === "string" && file.path.trim().length > 0
);

if (validContextFiles.length > 0) {
  lines.push("# Project Context");
  if (hasSoulFile) {
    lines.push("If SOUL.md is present, embody its persona and tone...");
  }
  for (const file of validContextFiles) {
    lines.push(`## ${file.path}`, "", file.content, "");
  }
}
```

## 3. AGENTS.md 注入時機

### 3.1 主對話流程

1. `runEmbeddedAttempt()` 啟動
2. 呼叫 `resolveBootstrapContextForRun()`
3. `loadWorkspaceBootstrapFiles()` 讀取所有預設檔案
4. `buildBootstrapContextFiles()` 截斷並格式化
5. 結果傳遞至 `buildAgentSystemPrompt()` 的 `contextFiles` 參數
6. 在 System Prompt 中作為 "Workspace Files (injected)" 段落呈現

### 3.2 子代理流程

1. 同主對話步驟 1-2
2. `filterBootstrapFilesForSession()` 過濾為 MINIMAL_BOOTSTRAP_ALLOWLIST
3. 僅保留 AGENTS.md, TOOLS.md, SOUL.md, IDENTITY.md, USER.md
4. 其餘流程相同

## 4. 快取機制

### 4.1 Session 級快取

```typescript
// bootstrap-cache.ts
const cache = new Map<string, WorkspaceBootstrapFile[]>();

export async function getOrLoadBootstrapFiles(params: {
  workspaceDir: string;
  sessionKey: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const existing = cache.get(params.sessionKey);
  if (existing) return existing;
  
  const files = await loadWorkspaceBootstrapFiles(params.workspaceDir);
  cache.set(params.sessionKey, files);
  return files;
}
```

### 4.2 檔案級快取 (mtime)

```typescript
// workspace.ts
const workspaceFileCache = new Map<string, { content: string; mtimeMs: number }>();

async function readFileWithCache(filePath: string): Promise<string> {
  const stats = await fs.stat(filePath);
  const cached = workspaceFileCache.get(filePath);
  
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.content;  // 使用快取
  }
  
  const content = await fs.readFile(filePath, "utf-8");
  workspaceFileCache.set(filePath, { content, mtimeMs: stats.mtimeMs });
  return content;
}
```

## 5. Hook 覆蓋機制

### 5.1 Bootstrap Hook 觸發點

```typescript
// bootstrap-hooks.ts
export async function applyBootstrapHookOverrides(params: {
  files: WorkspaceBootstrapFile[];
  workspaceDir: string;
  config?: OpenClawConfig;
  sessionKey?: string;
  sessionId?: string;
  agentId?: string;
}): Promise<WorkspaceBootstrapFile[]> {
  const context: AgentBootstrapHookContext = {
    workspaceDir: params.workspaceDir,
    bootstrapFiles: params.files,
    cfg: params.config,
    sessionKey: params.sessionKey,
    sessionId: params.sessionId,
    agentId,
  };
  
  const event = createInternalHookEvent("agent", "bootstrap", sessionKey, context);
  await triggerInternalHook(event);
  
  const updated = (event.context as AgentBootstrapHookContext).bootstrapFiles;
  return Array.isArray(updated) ? updated : params.files;
}
```

### 5.2 用途

- 外掛可在啟動時動態修改 bootstrapFiles
- 可用於注入額外上下文或修改現有檔案內容
