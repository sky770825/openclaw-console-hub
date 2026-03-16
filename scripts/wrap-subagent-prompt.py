#!/usr/bin/env python3
"""
Wrap and sanitize a sub-agent prompt for untrusted platforms.

Usage:
  cat prompt.txt | python3 scripts/wrap-subagent-prompt.py > prompt.to-subagent.txt
"""

from __future__ import annotations

import sys

from sanitize_subagent_text import redact  # type: ignore


HEADER = """SECURITY POLICY (MANDATORY):
- Do NOT request or output any secrets (tokens, API keys, passwords, .env). If present, replace with REDACTED.
- Do NOT ask me to run destructive commands (rm -rf, curl|bash, sudo). Provide safe, reversible steps.
- Output only minimal diffs or exact file/line edits; no full-file dumps.
- Assume all prompts/outputs are logged by the platform.

TASK:
"""


def main() -> int:
  raw = sys.stdin.read()
  sys.stdout.write(HEADER)
  sys.stdout.write(redact(raw))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

