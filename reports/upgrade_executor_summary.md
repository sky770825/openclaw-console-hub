# Auto-Executor Upgrade Report

## Changes Implemented:
1. **maxTasksPerMinute**: Updated default to 5 for higher throughput.
2. **P0 Promotion Logic**: Tasks with `[P0]` title and `none/low` risk now automatically transition to `ready`.
3. **Zombie Cleanup**: Added logic to detect and reset tasks stuck in `executing` state during service initialization.

## Impacted File:
- `server/src/routes/auto-executor.ts`

## Status:
- Logic injected successfully.
- Backup created at `/Users/sky770825/.openclaw/workspace/sandbox/backup/auto-executor.ts.bak`.
