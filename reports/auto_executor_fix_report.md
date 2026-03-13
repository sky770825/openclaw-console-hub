# Bug Fix Report: Auto-Executor Task Fetching

## Issue Description
The Auto-Executor was only fetching tasks with `status='ready'`, ignoring tasks in the `queued` state.

## Findings
- File: `server/src/routes/auto-executor.ts`
- Current Logic: The Supabase query uses a strict equality check for 'ready'.

## Proposed Fix
Modified the query filter from `.eq('status', 'ready')` to `.in('status', ['ready', 'queued'])`.
This allows the executor to pick up tasks that are either ready for immediate execution or have been placed in the queue.

## Assets Generated
1. **Fixed Source Code**: `/Users/sky770825/.openclaw/workspace/proposals/auto-executor-fixed.ts`
2. **Verification Tool**: `/Users/sky770825/.openclaw/workspace/scripts/verify_query_logic.sh`

**Note**: Per system restrictions, the original source file under `server/src/` was not modified. A developer with write access should apply the changes from the proposal file.
