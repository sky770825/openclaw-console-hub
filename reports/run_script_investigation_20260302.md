# Investigation Report: run_script Functionality Issue

## Issue Description
Command execution via `run_script` fails with: `nohup: node: No such file or directory`.

## Analysis
Based on the error message, the system is attempting to execute commands using a pattern similar to:
`nohup node <wrapper_script> <user_command>`
Or the server's internal `exec` call is prepending `nohup node` to the input.

The error `node: No such file or directory` indicates that when `nohup` is invoked, the `node` binary is not in the environment's PATH.

### Root Cause Candidates:
1. **Hardcoded Node Path**: The code might be using `node` instead of the absolute path ``.
2. **Environment Stripping**: `nohup` or the process spawner might be running with a minimal PATH that excludes `/usr/local/bin` or wherever node is installed (common in macOS environments for GUI-launched apps or specific service managers).
3. **Improper Wrapper**: There might be a script at `server/src/telegram/run-wrapper.js` (hypothetical) that is being called via `nohup node`.

## Investigation Findings
- Current Node Path: not found
- Current Bash Path: /bin/bash

### Code Snippet (action-handlers.ts):
```typescript
825-  /curl\s+.*-X\s*(POST|PUT|DELETE|PATCH)/i,
826-];
827-
828-async function handleSafeRunScript(command: string): Promise<ActionResult> {
829-  if (!command.trim()) {
830:    return { ok: false, output: 'run_script 需要 command 參數' };
831-  }
832-
833-  const cmd = command.trim();
834-
835-  // 1. 先檢查黑名單
--
1220-      return handleMkdir(action.path || '');
1221-    case 'move_file':
1222-      return handleMoveFile(action.from || '', action.to || '');
1223-    case 'list_dir':
1224-      return handleListDir(action.path || NEUXA_WORKSPACE);
1225:    case 'run_script':
1226-      return handleSafeRunScript(action.command || action.cmd || '');
1227:    case 'run_script_bg':
1228:      return { ok: false, output: '🛑 背景腳本不開放。用 run_script 跑輕量工具，或 create_task 派工。' };
1229-    case 'ask_ai':
1230-      return handleAskAI((action.model || 'flash').toLowerCase(), action.prompt || '', action.context);
1231-    case 'proxy_fetch':
1232-      return handleProxyFetch(action.url || '', action.method || 'POST', action.body || '');
1233-    case 'query_supabase':
```
