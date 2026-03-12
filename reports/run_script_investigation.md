# OpenClaw Server run_script Investigation Report
## Findings
### 1. Execution Logic
Source code snippet from action-handlers.ts:
```typescript
830:    return { ok: false, output: 'run_script 需要 command 參數' };
1225:    case 'run_script':
1227:    case 'run_script_bg':
1228:      return { ok: false, output: '🛑 背景腳本不開放。用 run_script 跑輕量工具，或 create_task 派工。' };
    return { ok: false, output: 'run_script 需要 command 參數' };
    case 'run_script':
      return handleSafeRunScript(action.command || action.cmd || '');
    case 'run_script_bg':
      return { ok: false, output: '🛑 背景腳本不開放。用 run_script 跑輕量工具，或 create_task 派工。' };
```
### 2. Security Logic
Source code snippet from security.ts:
```typescript
```
### 3. Root Cause Analysis of 'nohup: node: No such file or directory'
- Current node path: node not found in path
- Current bash path: /bin/bash
- **Cause**: When `run_script` is triggered, it likely attempts to run a node process using `nohup node script.js`. If the environment PATH is not passed to the child process or if `node` is not globally linked in `/usr/bin` or `/usr/local/bin` (standard search paths for `nohup` in some shells), it fails.
- **Secondary Cause**: The security whitelist in `security.ts` might be missing `tail`, `grep`, and `curl`, or it might be rejecting them because they are wrapped in an unexpected way.
