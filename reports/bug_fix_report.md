# Bug Fix Report: AutoExecutor Status Update Missing

## Issue
The  failed to update the task status in the database when a scoring threshold was not met. This caused the task to remain in an 'active' or 'pending' state in the task queue, leading to infinite retries by the system.

## Fix
Added a call to `upsertOpenClawTask` in the scoring failure branch to explicitly set the task status to `failed`.

## Files Modified (Proposed)
- `server/src/core/auto-executor.ts` (or equivalent path)

## Location of Fix
The fix was applied in the conditional block where the task score is evaluated against the minimum requirements.

## Patch Location
- `/Users/caijunchang/.openclaw/workspace/proposals/fix_auto_executor_status_bug.patch`
