#!/usr/bin/env python3
"""
Library module: redact sensitive strings from text.
Used by:
- scripts/sanitize-subagent-text.py
- scripts/wrap-subagent-prompt.py
"""

from __future__ import annotations

import re

REPLACEMENT = "REDACTED"

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
  ("telegram_bot_token", re.compile(r"\b\d{6,12}:[A-Za-z0-9_-]{20,}\b")),
  ("openai_key", re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")),
  ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
  ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
  ("bearer", re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._-]{20,}\b")),
  (
    "kv_pairs",
    re.compile(
      r"(?im)\b(api[_-]?key|token|secret|password|passwd|service[_-]?role[_-]?key)\b\s*([=:])\s*([^\s\"']+|\"[^\"]+\"|'[^']+')"
    ),
  ),
  (
    "json_pairs",
    re.compile(
      r"(?im)(\"(?:apiKey|api_key|token|secret|password|serviceRoleKey|service_role_key)\"\s*:\s*)(\".*?\"|'.*?')"
    ),
  ),
  ("url_query_tokens", re.compile(r"(?i)([?&](?:token|api_key|key|signature)=)[^&#\s]+")),
]


def redact(text: str) -> str:
  out = text
  for name, pat in PATTERNS:
    if name == "kv_pairs":
      out = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}{REPLACEMENT}", out)
    elif name == "json_pairs":
      out = pat.sub(lambda m: f"{m.group(1)}\"{REPLACEMENT}\"", out)
    elif name == "url_query_tokens":
      out = pat.sub(lambda m: f"{m.group(1)}{REPLACEMENT}", out)
    else:
      out = pat.sub(REPLACEMENT, out)
  return out

