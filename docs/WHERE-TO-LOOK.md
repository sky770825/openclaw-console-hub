# Where To Look (Quick Links)

This file is the index for commonly used docs/scripts in this repo.

## Security

- General security rules: `docs/SECURITY-RULES.md`
- Sub-agent (untrusted platform) guardrails: `docs/SUBAGENT-GUARDRAILS.md`

## Sub-Agent Prompt Sanitization

- Redact sensitive strings: `scripts/sanitize-subagent-text.py`
- Wrap + redact before pasting to external platforms: `scripts/wrap-subagent-prompt.py`
- Bulk-redact text files (conservative scope): `scripts/redact-secrets-in-text-files.py`

## n8n

- n8n quickstart + Daily Wrap-up notes: `docs/n8n/README.md`
- Daily Wrap-up workflow JSON (no LLM): `docs/n8n/Daily-Wrap-up.no-llm.json`

## Taskboard / Server

- Taskboard server entrypoint: `server/src/index.ts`
- Auth setup notes: `docs/AUTH-SETUP.md`

