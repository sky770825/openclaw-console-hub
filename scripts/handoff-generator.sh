#!/usr/bin/env bash
# Handoff Generator (zero-token)
# Produces a short deterministic handoff file for /new sessions to avoid context bloat.
#
# Outputs (OpenClaw workspace):
#   ~/.openclaw/workspace/memory/handoff/latest.md         (overwrite)
#   ~/.openclaw/workspace/memory/handoff/handoff-<ts>.md   (append-only)
#
# Data sources (read-only):
#   ~/.openclaw/workspace/MEMORY.md
#   openclaw models status
#   openclaw cron list
#   taskboard API (optional): http://127.0.0.1:3011

set -euo pipefail

WS="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MEMORY_FILE="$WS/MEMORY.md"
OUT_DIR="$WS/memory/handoff"
NOW_FILE="$WS/NOW.md"

TASKBOARD_BASE="${TASKBOARD_BASE:-http://127.0.0.1:3011}"

TS="$(date "+%Y-%m-%d_%H-%M")"
NOW="$(date "+%Y-%m-%d %H:%M")"

mkdir -p "$OUT_DIR"

if [[ ! -f "$MEMORY_FILE" ]]; then
  echo "MEMORY.md not found: $MEMORY_FILE" >&2
  exit 1
fi

LAST_UPDATED="$(
  python3 - <<'PY'
import re, pathlib
p=pathlib.Path.home()/'.openclaw/workspace/MEMORY.md'
s=p.read_text(encoding='utf-8', errors='replace')
m=re.search(r'最後更新:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})', s)
print(m.group(1) if m else '')
PY
)"

MODELS_LINE="$(
  openclaw models status 2>/dev/null \
    | sed -nE 's/^Default[[:space:]]*:[[:space:]]*//p' \
    | head -n 1 || true
)"
FALLBACKS_LINE="$(
  openclaw models status 2>/dev/null \
    | sed -nE 's/^Fallbacks[^:]*:[[:space:]]*//p' \
    | head -n 1 || true
)"

CRON_ENABLED="$(
  # Keep it short; only list the first 12 enabled jobs.
  openclaw cron list 2>/dev/null \
    | tail -n +2 \
    | awk 'NF>0{print}' \
    | head -n 60 \
    | head -n 12
)"

TASKBOARD_HEALTH="$(curl -sS -m 2 "$TASKBOARD_BASE/health" 2>/dev/null || true)"
EXEC_STATUS="$(curl -sS -m 2 "$TASKBOARD_BASE/api/openclaw/auto-executor/status" 2>/dev/null || true)"
COMPLIANCE_STATUS="$(curl -sS -m 2 "$TASKBOARD_BASE/api/tasks/compliance" 2>/dev/null || true)"

SOP_SNIPPET="$(
  python3 - <<'PY'
import re, pathlib
p=pathlib.Path.home()/'.openclaw/workspace/MEMORY.md'
s=p.read_text(encoding='utf-8', errors='replace')

def extract_between(h1, h2):
  m1=re.search(r'^'+re.escape(h1)+r'\s*$', s, flags=re.M)
  if not m1: return ''
  start=m1.end()
  m2=re.search(r'^'+re.escape(h2)+r'\s*$', s[start:], flags=re.M)
  end=(start+m2.start()) if m2 else len(s)
  return s[start:end].strip()

# Grab the "硬性規則" table lines only (bounded).
block = extract_between('### 硬性規則', '### Agent分工')
lines=[]
for ln in block.splitlines():
  ln=ln.rstrip()
  if ln.startswith('|') and '**' in ln:
    lines.append(ln)
  if len(lines) >= 10:
    break
print('\n'.join(lines).strip())
PY
)"

FAST_LOOKUP="$(
 python3 - <<'PY'
import re, pathlib
p=pathlib.Path.home()/'.openclaw/workspace/MEMORY.md'
s=p.read_text(encoding='utf-8', errors='replace')
m=re.search(r'^## 速查表\s*$([\s\S]*?)(?=^##\s+)', s, flags=re.M)
if not m:
  print('')
  raise SystemExit
blk=m.group(1).strip().splitlines()

rows=[]
for ln in blk:
  ln=ln.rstrip()
  if not ln.strip().startswith('|'):
    continue
  # Skip header/separator rows.
  if '主題' in ln and '位置' in ln:
    continue
  if set(ln.strip()) <= set('|- '):
    continue
  rows.append(ln)
  if len(rows) >= 12:
    break

print('\n'.join(rows).strip())
PY
)"

OUT_LATEST="$OUT_DIR/latest.md"
OUT_TS="$OUT_DIR/handoff-$TS.md"

{
  echo "# Handoff (for /new)"
  echo
  echo "- generatedAt: $NOW"
  if [[ -n "$LAST_UPDATED" ]]; then
    echo "- memoryLastUpdated: $LAST_UPDATED"
  else
    echo "- memoryLastUpdated: (unknown)"
  fi
  echo

  echo "## NOW.md (State Bridge)"
  if [[ -f "$NOW_FILE" ]]; then
    echo "- path: \`$NOW_FILE\`"
    echo
    echo '```text'
    # Keep it bounded; NOW.md should be short already.
    head -n 60 "$NOW_FILE" | sed 's/[[:space:]]\\+$//' || true
    echo '```'
  else
    echo "(NOW.md not found)"
  fi
  echo

  echo "## What To Load"
  echo "- SSoT: \`$WS/MEMORY.md\`"
  echo "- Index: \`$WS/memory/INDEX-v2.md\`"
  echo "- This handoff: \`$OUT_LATEST\`"
  echo

  echo "## Current Policies (Short)"
  echo "- projectPath: \`projects/<project>/modules/<module>/\`"
  echo "- runPath: \`projects/<project>/runs/<YYYY-MM-DD>/<run_id>/\`"
  echo "- Telegram: index-only (task_id/run_id/projectPath/runPath + short summary/nextSteps)"
  echo "- Full output: write to \`<run_path>/RESULT.md\` + \`ARTIFACTS/\`"
  echo "- Avoid paid APIs unless approved (prefer Ollama + subscription Codex/Cursor)"
  echo

  echo "## SOP Hard Rules (Excerpt)"
  if [[ -n "$SOP_SNIPPET" ]]; then
    echo "$SOP_SNIPPET"
  else
    echo "(SOP snippet not found)"
  fi
  echo

  echo "## Fast Lookup (Top)"
  if [[ -n "$FAST_LOOKUP" ]]; then
    echo "| 主題 | 位置 |"
    echo "|------|------|"
    echo "$FAST_LOOKUP"
  else
    echo "(no fast lookup table parsed)"
  fi
  echo

  echo "## Runtime Snapshot"
  echo "- models.default: ${MODELS_LINE:-"(unknown)"}"
  echo "- models.fallbacks: ${FALLBACKS_LINE:-"(unknown)"}"
  echo
  echo "### Cron (enabled sample)"
  if [[ -n "$CRON_ENABLED" ]]; then
    echo '```text'
    echo "$CRON_ENABLED"
    echo '```'
  else
    echo "(cron list unavailable)"
  fi
  echo

  echo "### Taskboard (3011)"
  if [[ -n "$TASKBOARD_HEALTH" ]]; then
    echo "- /health: \`$TASKBOARD_HEALTH\`"
  else
    echo "- /health: (no response)"
  fi
  if [[ -n "$EXEC_STATUS" ]]; then
    echo "- auto-executor/status: \`$(echo "$EXEC_STATUS" | tr '\n' ' ' | head -c 220)\`"
  else
    echo "- auto-executor/status: (no response)"
  fi
  if [[ -n "$COMPLIANCE_STATUS" ]]; then
    echo "- tasks/compliance: \`$(echo "$COMPLIANCE_STATUS" | tr '\n' ' ' | head -c 220)\`"
  else
    echo "- tasks/compliance: (no response)"
  fi
  echo

  echo "## Next Steps (Default)"
  echo "1. If context feels big: run \`/new\`, then load \`memory/handoff/latest.md\` only."
  echo "2. If tasks are not progressing: ensure auto-executor is running and block noncompliant ready tasks."
  echo "3. If XiaoCai stops replying: run desktop \`OpenClaw-Rescue+AutoFix.command\`."
} > "$OUT_LATEST"

cp -f "$OUT_LATEST" "$OUT_TS"

echo "handoff written:"
echo "  - $OUT_LATEST"
echo "  - $OUT_TS"
