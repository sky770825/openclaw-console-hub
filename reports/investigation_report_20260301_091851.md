# Auto-Executor Investigation Report
## Analysis of executor-agents.ts and related files
### Status Update Logic Snippets:
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts-780-      {
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts-781-        method: 'PATCH',
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts-782-        headers: authHeaders,
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts:783:        body: JSON.stringify({ status: 'done', progress: 100 }),
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts-784-      },
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts-785-      5000
/Users/caijunchang/openclaw任務面版設計/server/src/telegram/bot-polling.ts-786-    );
--
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-669-        })
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-670-        .eq('id', task.id);
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-671-      activeTaskIds.delete(task.id);
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts:672:      await upsertOpenClawTask({ id: task.id, status: 'done', progress: 100 });
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-673-
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-674-      // Governance: success tracking
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-675-      circuitBreakerSuccess();
--
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-902-  }
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-903-
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-904-  // rejected
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts:905:  await upsertOpenClawTask({ id: taskId, status: 'done' });
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-906-  autoExecutorState.pendingReviews.splice(idx, 1);
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-907-  await sendTelegramMessage(
/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts-908-    `❌ 老蔡已拒絕任務：<b>${review.taskName}</b>`,
### Dispatch and Polling Logic:
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts:151:    if (ws.readyState === WebSocket.OPEN) {
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts:182:      if (ws.readyState === WebSocket.OPEN) {
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts:201:        ws.readyState === WebSocket.OPEN &&
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts:222:        ws.readyState === WebSocket.OPEN &&
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts:252:        ws.readyState === WebSocket.OPEN &&
/Users/caijunchang/openclaw任務面版設計/server/src/websocket.ts:282:        ws.readyState === WebSocket.OPEN &&
/Users/caijunchang/openclaw任務面版設計/server/src/riskClassifier.ts:43:  '查看', '列表', 'list', 'read', 'fetch', 'get',
/Users/caijunchang/openclaw任務面版設計/server/src/openclawMapper.ts:14:// 主應用 status: draft | ready | running | review | done | blocked
/Users/caijunchang/openclaw任務面版設計/server/src/openclawMapper.ts:16:  queued: 'ready',
/Users/caijunchang/openclaw任務面版設計/server/src/openclawMapper.ts:23:  ready: 'queued',
/Users/caijunchang/openclaw任務面版設計/server/src/openclawMapper.ts:120:    status: OC_TO_TASK_STATUS[oc.status] ?? 'ready',
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:941:        const resp = await fetch(
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1090:- EXAMPLE of good output: "Found 49 TS files (17306 lines), 386 functions. Top 3 largest: index.ts (2601L), bot-polling.ts (1699L)... 結論：建議將 index.ts 拆分為..."
/Users/caijunchang/openclaw任務面版設計/server/src/executor-agents.ts:1140:    const resp = await fetch(
/Users/caijunchang/openclaw任務面版設計/server/src/error-handler.ts:74:      /fetch|axios|request/i,
/Users/caijunchang/openclaw任務面版設計/server/src/taskCompliance.ts:6:export type TaskGate = 'ready' | 'run';
/Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts:44:    const res = await fetch(endpoint, {
/Users/caijunchang/openclaw任務面版設計/server/src/utils/telegram.ts:82:    const res = await fetch(endpoint, {
/Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts:74:export async function fetchOpenClawTasks(): Promise<OpenClawTask[]> {
/Users/caijunchang/openclaw任務面版設計/server/src/openclawSupabase.ts:78:export async function fetchOpenClawTaskById(id: string): Promise<OpenClawTask | null> {
## Identified Potential Root Causes
1. **Swallowed Exceptions**: The executor might be wrapping calls in try-catch blocks that default to 'done' even on failure.
2. **Missing Await**: Asynchronous task updates might not be awaited, leading to race conditions.
3. **Polling Filter**: The polling logic might be filtering tasks incorrectly (e.g., case sensitivity or incorrect property names).
