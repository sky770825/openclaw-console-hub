# Bugfix Report: Auto-Executor Status Query

## Problem
The Auto-Executor was only fetching tasks with `status = 'ready'`. Tasks in `queued` status were being ignored, causing them to stall in the pipeline.

## Investigation
Analyzed `server/src/routes/auto-executor.ts`. The task fetching logic used a strict equality check on the status field.

## Solution
Modified the Supabase query logic to use the `.in()` operator, allowing both `ready` and `queued` statuses to be processed by the executor.

## Files
- Original: `/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts`
- Fixed Version: `/Users/caijunchang/.openclaw/workspace/sandbox/output/auto-executor.ts`

## Verification
The generated file at `/Users/caijunchang/.openclaw/workspace/sandbox/output/auto-executor.ts` now contains `.in('status', ['ready', 'queued'])` or equivalent logic.
