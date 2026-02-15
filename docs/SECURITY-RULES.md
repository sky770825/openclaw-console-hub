# Security Rules (Human + Minimal Technical Guardrails)

This project touches local services, credentials, and automation. Treat all third-party platforms (including AI agent platforms) as *untrusted by default*.

## Non-Negotiables (Do Not Do)

1. Never paste or upload secrets:
   - API keys, tokens, `.env`, database URLs/keys, service-role keys, webhook URLs with tokens.
   - Full logs that may contain secrets. Share only a short error summary.
2. Never run commands from strangers/AI without review, especially:
   - `curl ... | bash`, `chmod 777`, `sudo ...`, `rm -rf`, unknown `brew install`, `pip install` without pinned versions.
3. Never download/open unknown binaries:
   - `.dmg`, `.pkg`, `.zip`, and unknown scripts. No new tools get permissions like Screen Recording or Full Disk Access.
4. Never disclose internal topology:
   - Internal IPs/ports, VPN details, ngrok tunnels, DNS, Supabase/DB connection details.
5. Never accept urgency pressure:
   - Any "do this now" message is treated as social engineering. Pause and confirm internally.

## Safe Workflow (What To Do Instead)

1. Convert advice into a Taskboard change request:
   - Create a task with: `Decision`, `Reason`, `Next steps (1-3)`, `Risk`, `Rollback`.
2. Ask for review before execution:
   - Forward the exact proposed command/snippet and a one-line goal.
3. Use least-privilege keys:
   - Read-only keys for read paths.
   - Write/admin keys limited to the owner (do not share to AI platforms).
4. Sanitize prompts before sending to untrusted platforms:
   - Use `scripts/sanitize-subagent-text.py` to redact tokens/passwords/JWTs from the text you are about to paste.

## Incident Handling (If Something Feels Off)

1. Stop.
2. Capture only:
   - The platform name, the exact message text, and the exact command requested.
3. Notify the owner for review before taking action.

## Technical Guardrails We Prefer

- API requests require `X-API-Key` (and keys can be split into read/write/admin).
- Dashboard (static UI) can be protected by Basic Auth in production via:
  - `OPENCLAW_DASHBOARD_BASIC_USER`
  - `OPENCLAW_DASHBOARD_BASIC_PASS`
