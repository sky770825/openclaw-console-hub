# Investigation Report: P0 Auto-Executor Dispatch Failures
## Task ID: t17723484249
Date: Sun Mar  1 15:40:03 CST 2026

## 1. Analysis of Failure Reason Storage
Searching for 'recentExecutions' and error handling logic...
```typescript
510-              `<b>風險：</b>critical（需老蔡親自確認）\n` +
511-              `<b>說明：</b>${(candidate.description || '無').slice(0, 200)}`,
512-              { parseMode: 'HTML' }
513-            );
514-            log.info(`[AutoDispatch] 🟣 任務「${candidate.name}」需老蔡審核，已排入待審佇列，繼續找下一個`);
515:            autoExecutorState.recentExecutions.push({
516-              taskId: candidate.id,
517-              taskName: candidate.name || '',
518-              riskLevel,
519-              status: 'pending_review',
520-              executedAt: new Date().toISOString(),
--
721-      autoExecutorState.totalExecutedToday++;
722-      autoExecutorState.lastExecutedTaskId = task.id;
723-      autoExecutorState.lastExecutedAt = new Date().toISOString();
724-
725-      if (autoExecutorState.dispatchMode) {
726:        autoExecutorState.recentExecutions.push({
727-          taskId: task.id,
728-          taskName: task.name || '',
729-          riskLevel: classifyTaskRisk(task),
730-          status: 'success',
731-          executedAt: new Date().toISOString(),
--
769-      await circuitBreakerFailure();
770-
771-      autoExecutorExecHistoryMs.push(Date.now());
772-
773-      if (autoExecutorState.dispatchMode) {
774:        autoExecutorState.recentExecutions.push({
775-          taskId: task.id,
776-          taskName: task.name || '',
777-          riskLevel: classifyTaskRisk(task),
778-          status: 'failed',
779-          executedAt: new Date().toISOString(),
```
### Findings on Field Names:
637-        await supabase
638-          .from('openclaw_runs')
639-          .update({
640:            status: 'failed',
641-            error: { message: `品質閘門: ${quality.grade} (${quality.score}分)`, code: 'QUALITY_GATE_FAILED', checks: quality.checks },
642-          })
643-          .eq('id', runId);
--
665-        await supabase
666-          .from('openclaw_runs')
667-          .update({
668:            status: 'failed',
669-            ended_at: new Date().toISOString(),
670-            error: { message: '驗收條件未通過', code: 'ACCEPTANCE_FAILED' },
671-          })
--
684-        await supabase
685-          .from('openclaw_runs')
686-          .update({
687:            status: 'failed',
688-            ended_at: new Date().toISOString(),
689-            error: { message: '任務完成但無 result 輸出', code: 'NO_RESULT_OUTPUT' },
690-          })
--
748-      await supabase
749-        .from('openclaw_runs')
750-        .update({
751:          status: 'failed',
752-          ended_at: new Date().toISOString(),
753-          error: {
754-            message: errorMsg,
--
775-          taskId: task.id,
776-          taskName: task.name || '',
777-          riskLevel: classifyTaskRisk(task),
778:          status: 'failed',
779-          executedAt: new Date().toISOString(),
780-          agentType: agentType || 'auto',
781-          summary: errorMsg.replace(/\n+/g, ' ').trim().slice(0, 150),
## 2. Log Storage and Querying
Searching for logging patterns (console.log, logger, etc.)...
```typescript
import { createLogger } from '../logger.js';
```
## 3. Dispatch API Error Handling Logic
Searching for sendDispatchDigest and dispatch logic...
```typescript
341-  } catch (e) {
342-    log.warn('[AutoExecutor] Failed to save disk state:', e);
343-  }
344-}
345-
346-// ─── Dispatch Digest ───
347-
348-function startDispatchDigestTimer(): void {
349-  stopDispatchDigestTimer();
350-  dispatchDigestTimer = setInterval(async () => {
351:    await sendDispatchDigest();
352-  }, autoExecutorState.digestIntervalMs);
353-}
354-
355-function stopDispatchDigestTimer(): void {
356-  if (dispatchDigestTimer) {
357-    clearInterval(dispatchDigestTimer);
358-    dispatchDigestTimer = null;
359-  }
360-}
361-
--
370-    pendingReviews: autoExecutorState.pendingReviews.length,
371-    tasks: recent.map((e) => ({
372-      name: e.taskName,
373-      risk: e.riskLevel,
374-      status: e.status,
375-      summary: (e.summary || '').slice(0, 200),
376-    })),
377-  };
378-}
379-
380:async function sendDispatchDigest(): Promise<void> {
381-  const d = generateDispatchDigest();
382-  if (d.totalExecuted === 0 && d.pendingReviews === 0) return;
383-
384-  const riskEmoji: Record<string, string> = { none: '🟢', low: '🟡', medium: '🔴', critical: '🟣' };
385-  const statusEmoji: Record<string, string> = { success: '✅', failed: '❌', pending_review: '⏳' };
386-
387-  let text = `📋 <b>自動派工摘要</b>\n`;
388-  text += `<b>期間：</b>${d.period}\n`;
389-  text += `<b>已執行：</b>${d.totalExecuted} 個任務\n`;
390-  text += `<b>成功：</b>${d.successes}  <b>失敗：</b>${d.failures}\n`;
--
887-    startDispatchDigestTimer();
888-    await sendTelegramMessage(
889-      '🚀 <b>自動派工模式已開啟</b>\n\nClaude 接管指揮權，Agent 向 Claude 報告\n紫燈任務將暫存等老蔡審核',
890-      { parseMode: 'HTML' }
891-    );
892-  }
893-
894-  if (!autoExecutorState.dispatchMode && wasOn) {
895-    autoExecutorState.dispatchStartedAt = null;
896-    stopDispatchDigestTimer();
897:    await sendDispatchDigest();
898-    await sendTelegramMessage(
899-      '⏸️ <b>自動派工模式已關閉</b>\n\nAgent 直接向老蔡報告',
900-      { parseMode: 'HTML' }
901-    );
902-  }
903-
904-  if (digestIntervalMs && typeof digestIntervalMs === 'number' && digestIntervalMs >= 60000) {
905-    autoExecutorState.digestIntervalMs = digestIntervalMs;
906-    if (autoExecutorState.dispatchMode) {
907-      startDispatchDigestTimer();
```
## 4. Database Interaction (openclaw_runs)
Searching for database insertions into openclaw_runs...
```typescript
    approvedCriticalTaskIds.delete(task.id);
    // 記錄為 active，SIGTERM 時可回滾
    activeTaskIds.add(task.id);

    const { data: run } = await supabase
      .from('openclaw_runs')
      .insert({
        task_id: task.id,
        task_name: task.name,
        status: 'running',
        started_at: new Date().toISOString(),
--
      const qualityInfo = quality
        ? { grade: quality.grade, score: quality.score, passed: quality.passed, reason: quality.reason }
        : { grade: 'N/A', score: 0, passed: false, reason: 'no quality data' };

      await supabase
        .from('openclaw_runs')
        .update({
          status: result.success ? 'success' : 'failed',
          ended_at: new Date().toISOString(),
          duration_ms: result.durationMs,
          output_summary: (result.output || '').slice(0, 4000),
--

      // ── 品質閘門：不及格 → 不標 done ──
      if (quality && !quality.passed) {
        log.warn(`[QualityGate] ❌ 任務「${task.name}」品質不及格: ${quality.grade} (${quality.score}分) — ${quality.reason}`);
        await supabase
          .from('openclaw_runs')
          .update({
            status: 'failed',
            error: { message: `品質閘門: ${quality.grade} (${quality.score}分)`, code: 'QUALITY_GATE_FAILED', checks: quality.checks },
          })
          .eq('id', runId);
--

      // Acceptance validation（原有的驗收條件檢查，保留）
      const acceptance = await validateAcceptanceCriteria(task, result.output || '');
      if (acceptance.validated && !acceptance.passed) {
        await supabase
          .from('openclaw_runs')
          .update({
            status: 'failed',
            ended_at: new Date().toISOString(),
            error: { message: '驗收條件未通過', code: 'ACCEPTANCE_FAILED' },
          })
--

      // result 必填驗證（保留）
      if (!result.output || result.output.trim() === '') {
        log.warn(`[AutoExecutor] 任務「${task.name}」完成但無 result 輸出，改標記為 needs_review`);
        await supabase
          .from('openclaw_runs')
          .update({
            status: 'failed',
            ended_at: new Date().toISOString(),
            error: { message: '任務完成但無 result 輸出', code: 'NO_RESULT_OUTPUT' },
          })
--

      // Governance: attempt auto-rollback
      const rollback = await attemptAutoRollback(task, errorMsg);

      await supabase
        .from('openclaw_runs')
        .update({
          status: 'failed',
          ended_at: new Date().toISOString(),
          error: {
            message: errorMsg,
```
## 5. Recommendations for Improvement
1. **Ensure Error Propagation**: If `recentExecutions` only stores success/fail counts, modify the push logic to include `error: err.message` or `stack: err.stack`.
2. **Centralized Logging**: Integrate a logging library (like `winston` or `pino`) that writes to a searchable file or external log aggregator.
3. **Database Column**: If `openclaw_runs` lacks an `error_message` column (TEXT type), add it and update the executor to save `try-catch` exceptions there.
4. **Dispatch Digest Detail**: Enhance `sendDispatchDigest()` to include the last N error messages in the Telegram alert instead of just the count.
---
## Summary of Investigation
Q1: Failure reason is likely recorded in 'error' or 'errorMessage' fields within the catch blocks.
