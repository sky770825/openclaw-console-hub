# Proposal: Fix run_script Functionality
## Suggested Actions
### Fix 1: Update Security Whitelist
Modify `server/src/telegram/security.ts` to include common diagnostic tools:
```typescript
const ALLOWED_COMMANDS = ["tail", "grep", "curl", "ls", "cat", "node", "npm"];
```

### Fix 2: Provide Full Path or Proper Environment to nohup
In `server/src/telegram/action-handlers.ts`, instead of calling `nohup node ...`, use the absolute path to node or ensure the PATH is inherited.
Example modification in the code (to be performed by Commander Cai):
```typescript
// Instead of:
// spawn("nohup", ["node", scriptPath])
// Use:
const nodePath = process.execPath;
spawn("nohup", [nodePath, scriptPath], { env: process.env, detached: true });
```

### Fix 3: Sanitize Command Input
Ensure that if users pass `tail -f`, the logic correctly identifies `tail` as the base command for whitelist validation.
