# Performance & Reliability Optimization Report

## Changes Summary

### 1. AutoExecutor Performance
- **Poll Interval**: Reduced `pollIntervalMs` from **15s** to **5s**. 
  - *Impact*: 3x faster response time for new tasks.
- **Zombie Cleanup**: Added `clearZombies()` logic.
  - *Logic*: On startup, query all tasks with status 'RUNNING' and mark them as 'FAILED'.
  - *Impact*: Prevents tasks from being stuck in a permanent 'RUNNING' state after a server crash.

### 2. Anti-Stuck Mechanism
- **State Recovery**: Added `syncWithDatabase()` method.
  - *Logic*: Pulls currently 'RUNNING' tasks from the DB and adds them to the monitor.
  - *Impact*: Anti-stuck monitoring survives server restarts.
- **Full Scan**: Added `setupFullScan()` with a 60-second interval.
  - *Impact*: Safety net for any tasks that might have been missed by event-driven monitoring.

## Location of Optimized Files
The optimized source files are prepared in the workspace for manual review and integration (as per access restrictions):
- `/Users/sky770825/.openclaw/workspace/proposals/performance_optimization/AutoExecutor.ts`
- `/Users/sky770825/.openclaw/workspace/proposals/performance_optimization/anti-stuck.ts`

## Integration Guide
1. Replace `server/src/executor/AutoExecutor.ts` with the optimized version.
2. Replace `server/src/executor/anti-stuck.ts` with the optimized version.
3. Ensure `this.clearZombies()` is called in the `init()` or `start()` method of AutoExecutor.
4. Ensure `this.syncWithDatabase()` is called during AntiStuck initialization.

