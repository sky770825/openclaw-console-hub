# Investigation and Recovery Report

## 1. API Diagnosis
- **Health Check Result:** Failed to connect
- **Dispatch Test Result:** Failed
- **Analysis:** The "Cannot POST" error indicates that the route `/api/openclaw/auto-executor/dispatch` is either not registered with the POST method or the base path is different.
- **Source Findings (Dispatch):**
```
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:      { text: '🟣 切換派工', callback_data: '/dispatch' },
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:    `<b>Dispatch：</b> ${ae.dispatchMode === true ? '🟢 ON' : '🔴 OFF'}\n` +
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:  const status = await fetchJsonWithTimeout(`${TASKBOARD_BASE_URL}/api/openclaw/dispatch/status`, {}, 5000);
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:  const currentOn = sobj.dispatchMode === true;
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:    `${TASKBOARD_BASE_URL}/api/openclaw/dispatch/toggle`,
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:  const newState = robj.dispatchMode === true;
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:        { text: '🟣 切換派工', callback_data: '/dispatch' },
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:      if (cmd === '/dispatch') { await replyDispatchToggle(chatId); continue; }
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:      log.info('[TelegramControl] 已啟動（getUpdates 輪詢），支援 /start /status /tasks /health /dispatch /report /reconcile /wake /cmd /recover /codex-triage /stop ...');
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:        dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:        dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:        dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:        `<b>自動執行</b>：今日 ${totalExecutedToday} 次 | 派工${autoExecutorState.dispatchMode ? '開啟' : '關閉'}`,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:      dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:  if (disk.dispatchMode) {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:    autoExecutorState.dispatchMode = true;
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:    autoExecutorState.dispatchStartedAt = new Date().toISOString();
/Users/sky770825/openclaw任務面版設計/server/src/routes/federation.ts: * 供 auto-executor.ts dispatchTask() 在執行前呼叫
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts: * GET    /api/openclaw/dispatch/status
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts: * POST   /api/openclaw/dispatch/toggle
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts: * POST   /api/openclaw/dispatch/review/:taskId
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  dispatchMode: boolean;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  dispatchStartedAt: string | null;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  dispatchMode?: boolean;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  dispatchMode: false,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  dispatchStartedAt: null,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:let dispatchDigestTimer: NodeJS.Timeout | null = null;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:      dispatchMode: j.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  dispatchDigestTimer = setInterval(async () => {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  if (dispatchDigestTimer) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    clearInterval(dispatchDigestTimer);
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    dispatchDigestTimer = null;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  const since = autoExecutorState.lastDigestAt || autoExecutorState.dispatchStartedAt || new Date().toISOString();
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:        // In dispatch mode, skip strict gate validation (no runCommands/agent needed for dispatch)
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:        if (autoExecutorState.dispatchMode) return true;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    // Dispatch gate: 在 dispatch mode 下，找到第一個「可執行」的任務
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    if (autoExecutorState.dispatchMode) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    if (autoExecutorState.dispatchMode) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:      if (autoExecutorState.dispatchMode) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:      if (autoExecutorState.dispatchMode) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:autoExecutorRouter.get('/dispatch/status', (_req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    dispatchStartedAt: autoExecutorState.dispatchStartedAt,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:autoExecutorRouter.post('/dispatch/toggle', async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  const wasOn = autoExecutorState.dispatchMode;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  autoExecutorState.dispatchMode = enabled !== undefined ? Boolean(enabled) : !autoExecutorState.dispatchMode;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  if (autoExecutorState.dispatchMode && !wasOn) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    autoExecutorState.dispatchStartedAt = new Date().toISOString();
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  if (!autoExecutorState.dispatchMode && wasOn) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    autoExecutorState.dispatchStartedAt = null;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    if (autoExecutorState.dispatchMode) {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    dispatchMode: autoExecutorState.dispatchMode,
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    message: autoExecutorState.dispatchMode ? '自動派工已開啟' : '自動派工已關閉',
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:autoExecutorRouter.post('/dispatch/review/:taskId', async (req, res) => {
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:    dispatchMode: autoExecutorState.dispatchMode,
```

## 2. Script Recovery
The following scripts have been reconstructed in `/Users/sky770825/.openclaw/workspace/scripts`:
- `monitor_and_move.sh`: Handles file persistence from output directory.
- `auto-checkpoint.sh`: Creates tarball backups of the workspace.
- `docker-n8n-recovery.sh`: Ensures the n8n container is active.

## 3. Task Status Inconsistency
- **Findings:**
```
/Users/sky770825/openclaw任務面版設計/server/src/openclawMapper.ts:// openclaw status: queued | in_progress | done
/Users/sky770825/openclaw任務面版設計/server/src/openclawMapper.ts:// 主應用 status: draft | ready | running | review | done | blocked
/Users/sky770825/openclaw任務面版設計/server/src/openclawMapper.ts:    progress: t.status === 'done' ? 100 : 0,
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:  const done = taskList.filter((t) => String(asObj(t).status ?? '') === 'done').length;
/Users/sky770825/openclaw任務面版設計/server/src/telegram/bot-polling.ts:        body: JSON.stringify({ status: 'done', progress: 100 }),
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:      status: t.status === 'running' ? 'in_progress' : t.status === 'done' ? 'done' : 'queued',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:      if (tAny.updated_at && String(tAny.updated_at).startsWith(today) && t.status === 'done') completedToday++;
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:      .filter(t => t.status === 'done')
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:      await upsertOpenClawTask({ id: task.id, status: 'done', progress: 100 });
/Users/sky770825/openclaw任務面版設計/server/src/routes/auto-executor.ts:  await upsertOpenClawTask({ id: taskId, status: 'done' });
/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts:    // 用映射後的 status（ready/running/done），讓 Kanban 欄位正確對應
/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts:        status: t.status === 'done' ? 'done' : t.status === 'running' ? 'in_progress' : 'queued',
/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts:        progress: t.status === 'done' ? 100 : 0,
/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts:      .eq('status', 'done');
/Users/sky770825/openclaw任務面版設計/server/src/routes/openclaw-tasks.ts:      .eq('status', 'done');
```
- **Observation:** The system likely marks tasks as `done` when the executor process exits with code 0, regardless of internal logical failures. If a task contains multiple steps and the last step finishes without a crash, the status is updated.

## 4. Recommendations
1. **API Fix:** Modify the server router (likely in `server/src/routes/...`) to properly handle POST requests at the dispatch endpoint.
2. **Cron Config:** Add the following entries to crontab:
   - `*/15 * * * * /Users/sky770825/.openclaw/workspace/scripts/monitor_and_move.sh`
   - `0 * * * * /Users/sky770825/.openclaw/workspace/scripts/auto-checkpoint.sh`
   - `*/5 * * * * /Users/sky770825/.openclaw/workspace/scripts/docker-n8n-recovery.sh`
3. **Task Validation:** Implement a post-execution check that verifies specific side-effects before marking a task as `done`.
