# Auto-Executor & Task Status Investigation Report
## 1. Analysis of executor-agents.ts
No direct status update found in executor-agents.ts
## 2. Analysis of Dispatch logic
7: * GET    /api/openclaw/dispatch/status
8: * POST   /api/openclaw/dispatch/toggle
9: * POST   /api/openclaw/dispatch/review/:taskId
78:  dispatchMode: boolean;
79:  dispatchStartedAt: string | null;
91:  dispatchMode?: boolean;
106:  dispatchMode: false,
107:  dispatchStartedAt: null,
127:let dispatchDigestTimer: NodeJS.Timeout | null = null;
275:      dispatchMode: j.dispatchMode,
311:  dispatchDigestTimer = setInterval(async () => {
317:  if (dispatchDigestTimer) {
318:    clearInterval(dispatchDigestTimer);
319:    dispatchDigestTimer = null;
324:  const since = autoExecutorState.lastDigestAt || autoExecutorState.dispatchStartedAt || new Date().toISOString();
418:        if (t.status !== 'ready') return false;
427:        // In dispatch mode, skip strict gate validation (no runCommands/agent needed for dispatch)
428:        if (autoExecutorState.dispatchMode) return true;
429:        return validateTaskForGate(t, 'ready').ok;
446:    // Dispatch gate: 在 dispatch mode 下，找到第一個「可執行」的任務
449:    if (autoExecutorState.dispatchMode) {
455:          const alreadyPending = autoExecutorState.pendingReviews.some((r) => r.taskId === candidate.id);
456:          if (!alreadyPending) {
503:    if (autoExecutorState.dispatchMode) {
683:      if (autoExecutorState.dispatchMode) {
731:      if (autoExecutorState.dispatchMode) {
816:autoExecutorRouter.get('/dispatch/status', (_req, res) => {
819:    dispatchMode: autoExecutorState.dispatchMode,
820:    dispatchStartedAt: autoExecutorState.dispatchStartedAt,
831:autoExecutorRouter.post('/dispatch/toggle', async (req, res) => {
833:  const wasOn = autoExecutorState.dispatchMode;
834:  autoExecutorState.dispatchMode = enabled !== undefined ? Boolean(enabled) : !autoExecutorState.dispatchMode;
836:  if (autoExecutorState.dispatchMode && !wasOn) {
837:    autoExecutorState.dispatchStartedAt = new Date().toISOString();
852:  if (!autoExecutorState.dispatchMode && wasOn) {
853:    autoExecutorState.dispatchStartedAt = null;
864:    if (autoExecutorState.dispatchMode) {
870:    dispatchMode: autoExecutorState.dispatchMode,
876:    dispatchMode: autoExecutorState.dispatchMode,
877:    message: autoExecutorState.dispatchMode ? '自動派工已開啟' : '自動派工已關閉',
881:autoExecutorRouter.post('/dispatch/review/:taskId', async (req, res) => {
941:    dispatchMode: autoExecutorState.dispatchMode,
