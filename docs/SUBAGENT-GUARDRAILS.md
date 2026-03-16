# Sub-Agent Guardrails (For Untrusted Platforms)

Use this when you talk to any external sub-agent / AI platform that logs prompts and outputs.

## What You Must Not Share (Input)

- Any secrets: tokens, API keys, `.env`, database URLs/keys, service role keys, webhook URLs with tokens.
- Full logs. Only share the minimal error excerpt (1-3 lines) and redact.
- Internal topology: private IPs/ports, VPN, tunnels, hostnames.

## What The Sub-Agent Must Not Return (Output)

- Any secrets (even if discovered in files). Replace with `REDACTED`.
- Full file dumps. Return only minimal diffs / patch hunks.
- Destructive commands. No `rm -rf`, no `curl | bash`, no `sudo` instructions.

## Standard Header To Paste (Every Time)

Copy/paste this as the first block in every sub-agent request:

```text
SECURITY POLICY (MANDATORY):
- Do NOT request or output any secrets (tokens, API keys, passwords, .env). If present, replace with REDACTED.
- Do NOT ask me to run destructive commands (rm -rf, curl|bash, sudo). Provide safe, reversible steps.
- Output only minimal diffs or exact file/line edits; no full-file dumps.
- Assume all prompts/outputs are logged by the platform.

TASK:
<paste sanitized task here>
```

## Local Helper (Recommended)

Before pasting to an external platform, run:

```bash
cat prompt.txt | python3 scripts/sanitize-subagent-text.py > prompt.sanitized.txt
```

