#!/usr/bin/env bash
# Nightly Memory Sync (zero-token)
# Updates OpenClaw workspace MEMORY.md by injecting a bounded "delta digest"
# for memory/*.md files modified since the last recorded "最後更新" timestamp.
# Also rebuilds memory/INDEX-v2.* via build_memory_index_v2.sh when present.
#
# Targets (OpenClaw main workspace):
#   - ~/.openclaw/workspace/MEMORY.md
#   - ~/.openclaw/workspace/memory/INDEX-v2.md
#   - ~/.openclaw/workspace/memory/INDEX-v2.json
#
# Idempotent: uses a marker block that is replaced each run.

set -euo pipefail

WS="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MEMORY_FILE="$WS/MEMORY.md"
MEM_DIR="$WS/memory"

SYNC_TS="$(date "+%Y-%m-%d %H:%M")"
SYNC_DATE="$(date "+%Y-%m-%d")"

MARK_START="<!-- nightly-memory-sync:start -->"
MARK_END="<!-- nightly-memory-sync:end -->"

if [[ ! -f "$MEMORY_FILE" ]]; then
  echo "MEMORY.md not found: $MEMORY_FILE" >&2
  exit 1
fi
if [[ ! -d "$MEM_DIR" ]]; then
  echo "memory dir not found: $MEM_DIR" >&2
  exit 1
fi

LAST_UPDATED="$(
  python3 - <<'PY'
import re, pathlib
p = pathlib.Path.home()/'.openclaw/workspace/MEMORY.md'
s = p.read_text(encoding='utf-8', errors='replace')
m = re.search(r'最後更新:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s+([0-9]{2}:[0-9]{2})', s)
print((m.group(1)+' '+m.group(2)) if m else '')
PY
)"

CHANGED_LIST="$(
  python3 - <<'PY'
import sys, pathlib
from datetime import datetime

ws = pathlib.Path.home()/'.openclaw/workspace'
mem = ws/'memory'
last = (sys.stdin.read() or '').strip()

if last:
  try:
    cutoff = datetime.strptime(last, '%Y-%m-%d %H:%M')
  except Exception:
    cutoff = datetime.strptime(datetime.now().strftime('%Y-%m-%d')+' 00:00', '%Y-%m-%d %H:%M')
else:
  cutoff = datetime.strptime(datetime.now().strftime('%Y-%m-%d')+' 00:00', '%Y-%m-%d %H:%M')

items = []
for p in mem.glob('*.md'):
  try:
    mtime = datetime.fromtimestamp(p.stat().st_mtime)
  except Exception:
    continue
  if mtime >= cutoff:
    items.append((mtime, p))

items.sort(key=lambda t: t[0], reverse=True)
for _, p in items[:30]:
  print(str(p.relative_to(ws)))
PY
<<<"$LAST_UPDATED"
)"

TMP_DIGEST="$(mktemp)"
{
  echo "$MARK_START"
  echo "### 🧩 夜間補遺（Nightly Sync）"
  echo "- syncTime: $SYNC_TS"
  if [[ -n "$LAST_UPDATED" ]]; then
    echo "- since: $LAST_UPDATED"
  else
    echo "- since: (unknown; fallback today 00:00)"
  fi
  echo

  if [[ -z "$CHANGED_LIST" ]]; then
    echo "(no changed memory files detected)"
  else
    echo "#### 變更清單（最多 30 檔，僅節錄關鍵行）"
    while IFS= read -r rel; do
      [[ -z "$rel" ]] && continue
      path="$WS/$rel"
      title="$(head -n 60 "$path" 2>/dev/null | sed -n 's/^# \+//p' | head -n 1)"
      [[ -z "$title" ]] && title="$(head -n 1 "$path" 2>/dev/null || true)"
      [[ -z "$title" ]] && title="(no title)"

      echo "- $rel :: $title"
      head -n 220 "$path" 2>/dev/null \
        | rg -n '^(#{2,3}\s+|-\s+|\*\s+|•\s+|✅|⚠️|NOTE:|TODO:)' \
        | head -n 10 \
        | sed -E 's/^[0-9]+://; s/^/  /' || true
    done <<< "$CHANGED_LIST"
  fi

  echo
  echo "$MARK_END"
} > "$TMP_DIGEST"

export TMP_DIGEST SYNC_DATE SYNC_TS
python3 - <<'PY'
import os, re, pathlib

ws = pathlib.Path(os.environ.get('OPENCLAW_WORKSPACE', str(pathlib.Path.home()/'.openclaw/workspace')))
mem = ws/'MEMORY.md'
dig = pathlib.Path(os.environ['TMP_DIGEST']).read_text(encoding='utf-8', errors='replace').strip()
SYNC_DATE = os.environ['SYNC_DATE']
SYNC_TS = os.environ['SYNC_TS']

text = mem.read_text(encoding='utf-8', errors='replace')

text = re.sub(r'^## 最近摘要（[0-9]{4}-[0-9]{2}-[0-9]{2} 更新）$',
              f'## 最近摘要（{SYNC_DATE} 更新）',
              text, flags=re.M)

start='<!-- nightly-memory-sync:start -->'
end='<!-- nightly-memory-sync:end -->'
block_re=re.compile(re.escape(start)+r'.*?'+re.escape(end), re.S)

if block_re.search(text):
  text = block_re.sub(dig, text)
else:
  m = re.search(r'^## 速查表\s*$', text, flags=re.M)
  if m:
    idx = m.start()
    text = text[:idx].rstrip() + "\n\n" + dig + "\n\n" + text[idx:]
  else:
    text = text.rstrip() + "\n\n" + dig + "\n"

text = re.sub(r'^(🐣\s*小蔡\s*\|\s*最後更新:)\s*.*$',
              r'\1 ' + SYNC_TS,
              text, flags=re.M)

mem.write_text(text, encoding='utf-8')
print("ok")
PY

rm -f "$TMP_DIGEST" >/dev/null 2>&1 || true

# Rebuild memory index if the workspace has the v2 index builder.
if [[ -x "$WS/scripts/build_memory_index_v2.sh" ]]; then
  bash "$WS/scripts/build_memory_index_v2.sh" "$MEM_DIR" >/dev/null 2>&1 || true
fi

echo "Nightly Memory Sync done: $SYNC_TS"

