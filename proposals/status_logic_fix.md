# Proposal: Fix for Task Status Update Logic

## Issues Identified
1. **Premature Completion**: Tasks are marked 'done' in the `finally` block or after a caught error without verifying actual resolution.
2. **Missing Guardrails**: The `executor-agents.ts` lacks a verification step before setting status to 'done'.

## Recommended Code Changes
In `server/src/executor-agents.ts`:
- Replace direct `task.status = 'done'` with a `verifyTaskResolution()` check.
- Ensure `catch` blocks set status to `failed` or `pending_retry` instead of allowing execution to flow to completion logic.

## Recommended API Changes
In `POST /api/openclaw/auto-executor/dispatch`:
- Add logging to capture why `ready` tasks are ignored (check filter criteria).
