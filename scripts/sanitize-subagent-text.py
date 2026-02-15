#!/usr/bin/env python3
def main() -> int:
  import sys
  from sanitize_subagent_text import redact
  raw = sys.stdin.read()
  sys.stdout.write(redact(raw))
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
