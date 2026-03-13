# Incident: Telegram "No Response" + Stuck Runs Loop (2026-02-14)

## Symptom

- In Telegram, sending commands like `/status`, `/tasks` appeared to have **no response**.
- "小蔡卡循環" symptoms: tasks/runs could appear stuck (e.g. a run stays `running` forever), blocking progress and causing repeated retries/alerts.

## Root Causes

1. **Telegram command handling mismatch**
   - Server-side Telegram integration originally handled only emergency stop (`/stop`) flows.
   - Other commands (`/status`, `/tasks`, etc.) were not handled, so Telegram looked "silent".
   - Also, Telegram webhook cannot target `localhost` from Telegram servers, so relying on webhook alone is fragile for a local-only setup.

2. **DB-stored run stuck in active state**
   - A run row in `openclaw_runs` could remain `running` with `ended_at = null` after crashes/timeouts.
   - Reconcile logic treats "active run exists" as truth, so tasks never get released back to `ready`.

3. **Supabase CHECK constraints for run status**
   - `openclaw_runs.status` had a CHECK constraint that did not accept internal statuses like `timeout` / `retrying`.
   - Attempts to write such statuses failed silently at runtime, leaving runs stuck.

## Fixes Implemented

1. **Telegram control via polling (no LLM)**
   - Enhanced `server/src/telegram-stop-poll.ts` (getUpdates polling) to support:
     - `/start` menu + inline buttons
     - `/status`, `/tasks`, `/models`, `/cleanup`, `/handoff` (and `/new`)
     - `/stop` still works as emergency stop
   - This does not require Telegram webhook and works for localhost deployments.

2. **Stale run cleanup escape hatch**
   - Added a maintenance endpoint:
     - `POST /api/openclaw/maintenance/cleanup-stale-runs`
   - It force-closes runs older than N minutes with `ended_at IS NULL` and resets tasks back to `queued` (UI shows `ready`).

3. **Persist AntiStuck status safely**
   - `server/src/anti-stuck.ts` now persists status updates to Supabase (best-effort).
   - `server/src/openclawSupabase.ts` adds defensive status mapping so DB constraints are not violated:
     - `timeout -> failed`
     - `retrying -> running`

## Operational Playbook

- If Telegram "no response":
  - Use the bot configured by `TELEGRAM_STOP_BOT_TOKEN` (polling-based control bot).
  - Send `/start` or press the inline buttons.

- If tasks are blocked by a stuck run:
  - Run stale cleanup:
    - `curl -sS -X POST http://127.0.0.1:3011/api/openclaw/maintenance/cleanup-stale-runs -H 'Content-Type: application/json' -d '{"olderThanMinutes":45,"limit":50}' | jq .`

## Related Script

- `scripts/openclaw-recover-no-response.sh`
  - One-command check + self-heal (taskboard + gateway + stale runs + telegram test).

## Follow-ups (Same Day)

1. **Lock down control to a single chat**
   - Added a hard lock so only `TELEGRAM_CHAT_ID` can operate any commands/buttons/chat.
   - Unauthorized chats are ignored (with a throttled warning).

2. **Token health + poll conflict alerts**
   - If polling fails with:
     - `409 Conflict`: another process is polling the same bot token via `getUpdates`.
     - `401 Unauthorized`: token revoked/rotated or misconfigured.
   - The service now sends a warning to `TELEGRAM_CHAT_ID` (rate-limited) and backs off polling to reduce log spam.

3. **Better Telegram UI (功能欄)**
   - Replaced "inline keyboard under every message" with a bottom ReplyKeyboard ("功能欄").
   - The menu is only sent on `/start` (or `menu`), so normal replies are clean.

4. **Ollama chat mode**
   - In the authorized chat, any non-command message (not starting with `/`) is treated as an Ollama prompt.
   - Controlled by `OLLAMA_URL` (default `http://localhost:11434`) and `OLLAMA_TELEGRAM_MODEL`.

5. **Health endpoint compatibility**
   - Added `GET /health` as a backward-compatible alias of health status (to avoid monitors misreporting "HTTP 404 offline").

## Required Config (No Secrets Here)

- `TELEGRAM_CONTROL_BOT_TOKEN`: token for the chosen control bot (e.g. `@ollama168bot`)
- `TELEGRAM_CHAT_ID`: the only chat allowed to control this bot (private chat or a specific group)
- Optional:
  - `OLLAMA_URL` (default `http://localhost:11434`)
  - `OLLAMA_TELEGRAM_MODEL` (default `llama3.2:latest`)
