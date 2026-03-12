# Proposal: Fix run_script PATH and Invocation

## Problem
The `run_script` handler fails because `node` is not found in the PATH when executed via `nohup`.

## Proposed Solution
1. **Use Absolute Paths**: Update `server/src/telegram/action-handlers.ts` to use the absolute path of the node executable or use `process.execPath`.
2. **Fix Security Check**: Ensure `server/src/telegram/security.ts` allows the base commands (tail, grep, curl) but handles the execution context correctly.
3. **Environment Injection**: Explicitly pass the PATH environment variable to the `spawn` or `exec` call.

### Recommended Change in `action-handlers.ts`:
Instead of:
```typescript
const cmd = `nohup node wrapper.js ${sanitizedCommand}`;
```
Use:
```typescript
const nodePath = process.execPath;
const cmd = `nohup ${nodePath} wrapper.js ${sanitizedCommand}`;
```
Or if running shell commands directly:
```typescript
const cmd = `nohup /bin/bash -c "${sanitizedCommand}"`;
```

## Implementation Script
A diagnostic/fix script has been created at `/Users/caijunchang/.openclaw/workspace/scripts/verify_fix.sh`.
