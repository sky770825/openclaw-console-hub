#!/usr/bin/env python3
"""
Redact common secrets in text-like files under selected directories.

Default scope is conservative: docs/, knowledge/, memories/, backups/

This is intended to reduce accidental leakage when sharing docs or pasting content
to untrusted platforms. It does not replace secret rotation.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from sanitize_subagent_text import redact


TEXT_EXTS = {".md", ".txt", ".diff", ".patch", ".yaml", ".yml", ".json"}
DEFAULT_DIRS = ["docs", "knowledge", "memories", "backups"]
SKIP_DIRS = {"node_modules", ".git", "dist", "server/dist"}


def is_text_candidate(p: Path) -> bool:
  if p.suffix.lower() not in TEXT_EXTS:
    return False
  return True


def should_skip_dir(path_parts: tuple[str, ...]) -> bool:
  for part in path_parts:
    if part in SKIP_DIRS:
      return True
  return False


def main() -> int:
  roots = sys.argv[1:] or DEFAULT_DIRS
  changed = 0
  scanned = 0

  for root in roots:
    base = Path(root)
    if not base.exists():
      continue
    for p in base.rglob("*"):
      if p.is_dir():
        continue
      rel_parts = p.parts
      if should_skip_dir(rel_parts):
        continue
      if not is_text_candidate(p):
        continue
      try:
        raw = p.read_text(encoding="utf-8", errors="ignore")
      except Exception:
        continue
      scanned += 1
      out = redact(raw)
      if out != raw:
        p.write_text(out, encoding="utf-8")
        changed += 1

  print(f"scanned={scanned} changed={changed}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())

