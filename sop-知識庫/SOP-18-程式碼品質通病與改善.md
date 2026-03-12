# SOP-18：程式碼品質通病與改善

> **版本**: v1.0
> **建立日期**: 2026-02-16
> **建立者**: L2 Claude Code
> **適用範圍**: 所有新 Case 的程式碼品質檢查與補強
> **來源**: 老蔡任務面版設計專案完整盤點（80+ 個具體問題）

---

## 使用方式

每次新 Case 開始前，對照此 SOP 的 10 大通病。
每次 Code Review 時，逐項檢查是否又犯了同樣的錯。

---

## 通病一覽表

| # | 通病 | 嚴重度 | 出現頻率 |
|---|------|--------|----------|
| 1 | 錯誤被吞掉（Silent Error） | 🔴 高 | 非常常見 |
| 2 | 巨大檔案（God File） | 🔴 高 | 常見 |
| 3 | TypeScript 形同虛設 | 🔴 高 | 全專案 |
| 4 | 機密外洩到 Git | 🔴 高 | 已發生 |
| 5 | 沒有 Graceful Shutdown | 🔴 高 | 後端全部 |
| 6 | 記憶體洩漏 | 🟡 中 | 常見 |
| 7 | 競態條件（Race Condition） | 🟡 中 | 後端常見 |
| 8 | 重複程式碼 | 🟡 中 | 常見 |
| 9 | 專案目錄混亂 | 🟡 中 | 全專案 |
| 10 | 寫死的值（Hardcoded） | 🟡 中 | 散佈各處 |

---

## 通病 1：錯誤被吞掉（Silent Error）

### 症狀
```typescript
// ❌ 壞習慣：catch 裡什麼都不做
someApiCall().catch(() => {});

// ❌ 壞習慣：只 console.warn，使用者完全不知道
catch (e) {
  console.warn("persist failed", e);
}

// ❌ 壞習慣：失敗時回傳空陣列，分不清「沒資料」還是「掛了」
catch (error) {
  console.error('Failed:', error);
  return [];
}
```

### 改善做法
```typescript
// ✅ 前端：用 toast 通知使用者
import { toast } from 'sonner';

try {
  await updateTask(id, data);
  toast.success('任務已更新');
} catch (error) {
  toast.error('更新失敗，請稍後再試');
  console.error('[Tasks] update failed:', error);
}

// ✅ 後端：回傳結構化錯誤
try {
  const result = await supabase.from('tasks').select('*');
  if (result.error) throw result.error;
  res.json(result.data);
} catch (error) {
  console.error('[API] GET /tasks error:', error);
  res.status(500).json({
    error: 'FETCH_FAILED',
    message: '無法取得任務列表'
  });
}
```

### 檢查清單
- [ ] 搜尋 `.catch(() => {})` — 每一個都要處理
- [ ] 搜尋 `console.warn` / `console.error` — 確認有對應的 UI 回饋
- [ ] API 錯誤回傳統一格式：`{ error: string, message: string }`
- [ ] 前端每個 API 呼叫都有 loading / error / success 三態

---

## 通病 2：巨大檔案（God File）

### 症狀
```
server/src/index.ts    — 3,898 行（所有邏輯塞在一起）
src/pages/TaskBoard.tsx — 3,277 行（看板+列表+表單+詳情）
src/pages/Dashboard.tsx — 1,044 行
src/pages/ReviewCenter.tsx — 944 行
src/services/api.ts     — 755 行
```

### 改善做法

**後端拆分原則 — 一個 router 一個檔案：**
```
server/src/
├── index.ts              ← 只做 app 初始化 + middleware（< 200 行）
├── routers/
│   ├── tasks.ts          ← 任務相關 API
│   ├── runs.ts           ← 執行記錄 API
│   ├── alerts.ts         ← 告警 API
│   ├── openclaw.ts       ← OpenClaw 整合 API
│   ├── autopilot.ts      ← Autopilot 控制
│   └── auto-executor.ts  ← AutoExecutor 控制
├── services/
│   ├── task-service.ts   ← 業務邏輯
│   └── run-service.ts
└── utils/
    ├── logger.ts         ← 統一日誌
    └── shutdown.ts       ← 優雅關閉
```

**前端拆分原則 — 一個元件 < 300 行：**
```
src/pages/TaskBoard/
├── index.tsx             ← 主頁面（路由、layout）
├── KanbanView.tsx        ← 看板檢視
├── ListView.tsx          ← 列表檢視
├── TaskCard.tsx          ← 任務卡片
├── TaskDetailSheet.tsx   ← 詳情抽屜
├── CreateTaskSheet.tsx   ← 新建表單
└── useTaskBoard.ts       ← 資料 hook
```

### 檢查清單
- [ ] 任何檔案 > 500 行就該考慮拆分
- [ ] 一個元件只做一件事
- [ ] 業務邏輯抽到 custom hook 或 service
- [ ] 每個 router 檔案只負責一組端點

---

## 通病 3：TypeScript 形同虛設

### 症狀
```json
// tsconfig.json — 所有檢查都關掉了
{
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false
}
```

```typescript
// 程式碼裡到處是 any
const body = req.body as any;
const [data, setData] = useState([]);  // 隱含 any[]
```

### 改善做法
```json
// ✅ tsconfig.json — 逐步開啟
{
  "strict": true,              // 第一步：全開
  "noImplicitAny": true,       // 不准用隱含 any
  "strictNullChecks": true,    // null/undefined 要處理
  "noUnusedLocals": true,      // 不准留死變數
  "noUnusedParameters": true   // 不准留死參數
}
```

```typescript
// ✅ 給每個 useState 明確型別
const [tasks, setTasks] = useState<Task[]>([]);
const [loading, setLoading] = useState<boolean>(true);

// ✅ API 回應用 Zod 驗證
const TaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(['draft', 'ready', 'running', 'review', 'done', 'blocked']),
});
```

### 檢查清單
- [ ] `tsconfig.json` 的 `strict` 設為 `true`
- [ ] 搜尋 `as any` — 全部替換成正確型別
- [ ] 搜尋 `// @ts-ignore` — 全部修掉
- [ ] 每個 `useState()` 都要有型別參數
- [ ] API 回應用 Zod schema 驗證

---

## 通病 4：機密外洩到 Git

### 症狀
```
.env                    ← 真實的 Supabase key 進了 git
nohup.out              ← 855KB 日誌進了 git
ollama_bot2.log        ← 4.6MB 日誌進了 git
ollama_bot2_launchd.log ← 11MB 日誌進了 git
```

### 改善做法

**1. `.gitignore` 必須包含：**
```gitignore
# 環境變數（絕對不進 git）
.env
.env.*
*.env

# 日誌（絕對不進 git）
*.log
*.err.log
nohup.out

# 備份
*.bak

# 系統
.DS_Store
```

**2. 已進 git 的敏感檔要清除：**
```bash
# 從 git 歷史移除（但保留本地檔案）
git rm --cached .env nohup.out *.log
git commit -m "security: remove sensitive files from tracking"

# 如果要徹底從歷史清除
git filter-repo --invert-paths --path .env --path nohup.out
```

**3. 環境變數管理：**
```
.env.example  ← 進 git（只有佔位符，沒有真值）
.env          ← 不進 git（本地實際值）
.env.local    ← 不進 git（覆蓋用）
```

### 檢查清單
- [ ] `.env` 不在 git 追蹤中（`git ls-files | grep .env` 應為空）
- [ ] 所有 `*.log` 不在 git 追蹤中
- [ ] `nohup.out` 不在 git 追蹤中
- [ ] `.env.example` 只有佔位符，沒有真實 key
- [ ] Supabase key 需要輪換（因為已經洩漏過）

---

## 通病 5：沒有 Graceful Shutdown

### 症狀
```typescript
// ❌ Server 只管啟動，不管關閉
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
  // 啟動了一堆 interval 和 polling...
  // 但按 Ctrl+C 時什麼都不清理
});
```

### 改善做法
```typescript
// ✅ 加上關閉處理
function gracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] 收到 ${signal}，開始清理...`);

  // 1. 停止接收新請求
  server.close(() => {
    console.log('[Shutdown] HTTP server 已關閉');
  });

  // 2. 停止所有背景任務
  stopAutoExecutor();
  stopAutopilotLoop();
  stopAutoTaskGeneratorLoop();
  stopTelegramStopPoll();

  // 3. 關閉 WebSocket
  wsManager.close();

  // 4. 清理 session
  memorySessions.clear();
  memoryInterrupts.clear();

  // 5. 強制超時退出
  setTimeout(() => {
    console.error('[Shutdown] 超時，強制退出');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 檢查清單
- [ ] 有 SIGTERM / SIGINT 處理
- [ ] 所有 `setInterval` 都有對應的 `clearInterval`
- [ ] 所有 `setTimeout` 都有對應的 `clearTimeout`（或可取消機制）
- [ ] WebSocket 連線有關閉邏輯
- [ ] 第三方 polling（如 Telegram）有停止邏輯

---

## 通病 6：記憶體洩漏

### 症狀
```typescript
// ❌ Map 只進不出，永遠不清理
const memorySessions = new Map<string, SharedState>();
// 每次請求建一個 session，永遠不刪

// ❌ setInterval 沒有清理
setInterval(() => { ... }, 15000);
// 沒有存 reference，無法停止

// ❌ useEffect 沒有 cleanup
useEffect(() => {
  const interval = setInterval(() => loadData(), 5000);
  // 缺少 return () => clearInterval(interval);
}, []);
```

### 改善做法
```typescript
// ✅ Map 加 TTL 清理
const SESSION_TTL = 30 * 60 * 1000; // 30 分鐘
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of memorySessions) {
    if (now - session.updatedAt > SESSION_TTL) {
      memorySessions.delete(id);
    }
  }
}, 60_000);

// ✅ setInterval 存 reference
const intervalId = setInterval(() => { ... }, 15000);
// 關閉時：clearInterval(intervalId);

// ✅ useEffect 要 cleanup
useEffect(() => {
  const interval = setInterval(() => loadData(), 5000);
  return () => clearInterval(interval);
}, []);
```

### 檢查清單
- [ ] 搜尋 `new Map()` — 每個都要有清理策略
- [ ] 搜尋 `setInterval` — 每個都要有對應的 `clearInterval`
- [ ] 搜尋 `setTimeout` — 長時間 timeout 要可取消
- [ ] 搜尋 `addEventListener` — 每個都要有對應的 `removeEventListener`
- [ ] 每個 `useEffect` 都要有 cleanup function

---

## 通病 7：競態條件（Race Condition）

### 症狀
```typescript
// ❌ 共享狀態沒有鎖
const autoExecutorState = { isRunning: false };

// 兩個請求同時進來，都讀到 isRunning = false
// 都把它設為 true → 同時啟動兩個 executor
app.post('/start', (req, res) => {
  if (!autoExecutorState.isRunning) {  // 兩個請求都通過
    autoExecutorState.isRunning = true;
    startExecutor();
  }
});
```

### 改善做法
```typescript
// ✅ 用 flag + Promise 防止併發
let startingPromise: Promise<void> | null = null;

app.post('/start', async (req, res) => {
  if (autoExecutorState.isRunning) {
    return res.json({ message: 'already running' });
  }
  if (startingPromise) {
    await startingPromise;
    return res.json({ message: 'started by another request' });
  }
  startingPromise = startExecutor();
  await startingPromise;
  startingPromise = null;
  res.json({ message: 'started' });
});
```

### 檢查清單
- [ ] 搜尋全域 mutable 狀態（`let`、物件屬性修改）
- [ ] 每個 start/stop 操作要防止重複觸發
- [ ] 共享陣列的 push/shift 要確保原子性
- [ ] useEffect 裡的 async 操作要檢查 component 是否還活著

---

## 通病 8：重複程式碼

### 症狀
```typescript
// ❌ 同樣的 API 呼叫模式複製 5 次
async function persistTask(...) { try { fetch(...) } catch { console.warn(...) } }
async function persistReview(...) { try { fetch(...) } catch { console.warn(...) } }
async function persistAutomation(...) { try { fetch(...) } catch { console.warn(...) } }

// ❌ 日期格式化散在 3 個不同檔案
// Dashboard.tsx: formatDuration(), formatRelativeTime()
// Logs.tsx: formatTimestamp(), formatDateHeader()
// TaskBoard.tsx: formatDate()
```

### 改善做法
```typescript
// ✅ 共用 API 工具
async function persistToApi<T>(path: string, data: T): Promise<void> {
  try {
    const r = await fetch(apiUrl(path), {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`API ${path} returned ${r.status}`);
  } catch (e) {
    console.error(`[API] persist ${path} failed:`, e);
    toast.error(`儲存失敗：${path}`);
  }
}

// ✅ 共用工具函式庫
// src/lib/formatting.ts
export function formatDate(date: string | Date): string { ... }
export function formatDuration(ms: number): string { ... }
export function formatRelativeTime(date: string): string { ... }
```

### 檢查清單
- [ ] 同樣邏輯出現 3 次以上 → 抽成共用函式
- [ ] 日期/時間格式化 → 統一放 `lib/formatting.ts`
- [ ] API 呼叫樣板 → 統一用 apiClient
- [ ] 型別守衛（type guard）→ 抽成共用 utility

---

## 通病 9：專案目錄混亂

### 症狀
```
根目錄/
├── control_scripts.py        ← Python 跟 React 混在一起
├── monitoring_engine.py
├── ollama_bot2.py            ← 47KB 的 Python 檔
├── openclaw-v4.jsx           ← 原型 JSX 跟正式 src/ 混在一起
├── create_xiaocai_ideas_table.sql  ← SQL 散落
├── deploy-to-railway.sh      ← 部署腳本散落
├── nohup.out                 ← 日誌散落
├── package-lock.json         ← npm
├── bun.lockb                 ← bun（兩個 package manager 打架）
└── src/                      ← 真正的前端
```

### 改善做法
```
根目錄/
├── src/                  ← 前端原始碼（React）
├── server/               ← 後端原始碼（Express）
├── scripts/
│   ├── python/           ← Python 自動化腳本
│   ├── bash/             ← Shell 腳本
│   └── sql/              ← 資料庫 migration
├── prototypes/           ← JSX 原型（不進 build）
├── docs/                 ← 文件
├── n8n-workflows/        ← n8n 設定
├── .github/              ← CI/CD
├── package.json          ← 只用一個 package manager
└── .gitignore
```

### 檢查清單
- [ ] 根目錄只放設定檔（package.json, tsconfig, .gitignore 等）
- [ ] Python 腳本移到 `scripts/python/`
- [ ] SQL 檔移到 `scripts/sql/` 或 `migrations/`
- [ ] 只保留一個 lockfile（刪掉 `bun.lockb` 或 `package-lock.json`）
- [ ] 原型/草稿移到 `prototypes/`
- [ ] 日誌/備份不進 git

---

## 通病 10：寫死的值（Hardcoded）

### 症狀
```typescript
// ❌ 寫死的路徑（換機器就壞）
const KB_ROOT = '/Users/caijunchang/Desktop/小蔡/知識庫/SOP-資訊庫';

// ❌ 寫死的超時時間
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_COUNT = 2;

// ❌ 寫死的模擬延遲
setTimeout(() => { /* 模擬完成 */ }, 1200);
```

### 改善做法
```typescript
// ✅ 用環境變數
const KB_ROOT = process.env.KB_ROOT || path.join(os.homedir(), '.openclaw/knowledge');

// ✅ 用設定檔
const config = {
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 30000,
  retryCount: Number(process.env.RETRY_COUNT) || 2,
};

// ✅ 常數集中管理
// src/constants.ts
export const DEFAULTS = {
  POLL_INTERVAL: 5000,
  REQUEST_TIMEOUT: 30000,
  MAX_RETRIES: 2,
  TASK_TIMEOUT: 300_000,
} as const;
```

### 檢查清單
- [ ] 搜尋絕對路徑 `/Users/` — 全部改成相對或環境變數
- [ ] 搜尋 `localhost` — 確認有 env fallback
- [ ] 搜尋 magic number（裸數字）— 改成命名常數
- [ ] 超時、重試、間隔 → 集中到 `constants.ts` 或 `.env`

---

## 新 Case 啟動前的快速檢查（5 分鐘）

開工前跑一遍：

```bash
# 1. 有沒有機密進 git？
git ls-files | grep -E '\.env$|\.log$|nohup'

# 2. 有沒有 any？
grep -r "as any" src/ server/src/ --include="*.ts" --include="*.tsx" | wc -l

# 3. 有沒有空 catch？
grep -r "catch.*{}" src/ server/src/ --include="*.ts" --include="*.tsx"

# 4. 有沒有巨大檔案？
find src/ server/src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -10

# 5. TypeScript strict 有開嗎？
grep '"strict"' tsconfig*.json

# 6. 有沒有寫死路徑？
grep -r "/Users/" src/ server/src/ --include="*.ts" --include="*.tsx"
```

全部通過才開始寫 code。

---

*此 SOP 由 L2 Claude Code 根據實際專案盤點產出，適用於所有 OpenClaw 相關專案。*
