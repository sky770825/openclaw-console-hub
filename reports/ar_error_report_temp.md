/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:        } catch (error) {
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:            type: 'error',
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:      ws.on('error', (error) => {
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:        log.error({ err: error }, '[WebSocket] 錯誤');
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:          type: 'error',
/Users/sky770825/openclaw任務面版設計/server/src/websocket.ts:      level: 'info' | 'warn' | 'error' | 'success';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:async function saveSharedState(session: SharedState, status: 'active' | 'paused' | 'completed' | 'failed' = 'active'): Promise<void> {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        onRetry: async (attempt, error) => {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:          log.info(`[Execute] Retry ${attempt} for run ${runId}: ${error.message}`);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            detail: error.message,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            message: `⚠️ 執行失敗，進行第 ${attempt} 次重試: ${error.message}`,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            error.message
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:  } catch (error) {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    const errorMessage = error instanceof Error ? error.message : String(error);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    run.status = 'failed';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    run.error = {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      message: errorMessage,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      status: 'failed',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      message: errorMessage,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      status: 'failed',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      detail: errorMessage,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      level: 'error',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      message: `❌ 任務失敗 - ${task.name}: ${errorMessage}`,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      status: 'failed',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      error: run.error,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    await notifyTaskFailure(task.name, task.id, runId, errorMessage, run.retryCount || 0);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        status: 'failed',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        output_summary: errorMessage,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:  executeTaskWithAntiStuck(runId, task).catch(console.error);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    log.error('[RedAlert] trigger error:', e);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    log.error('[RedAlert] resolve error:', e);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    log.error('[Proposal] submit error:', e);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:    log.error('[Proposal] decide error:', e);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            log.warn('[OpenClaw] insert automation run trace failed:', e);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        let errorType: '4xx' | '5xx' | 'network' | 'unknown' = 'unknown';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:          if (code >= 400 && code < 500) errorType = '4xx';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:          else if (code >= 500 && code < 600) errorType = '5xx';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        } else if (/fetch failed|ECONN|ENOTFOUND|ETIMEDOUT/i.test(msg)) {
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:          errorType = 'network';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        const failedAutomation = await upsertOpenClawAutomation({
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:        // 失敗也寫一筆 run trace，標記為 failed
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:              status: 'failed',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:                  status: 'failed',
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            log.warn('[OpenClaw] insert failed automation run trace failed:', err);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:          errorType,
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:          automation: failedAutomation ?? { ...automation, runs: nextRuns, health: nextHealth, lastRun: runLabel },
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            status?: 'success' | 'failed' | 'needs_review';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:            error?: string | null;
/Users/sky770825/openclaw任務面版設計/server/src/index.ts.bak:      taskResult.status === 'failed'
