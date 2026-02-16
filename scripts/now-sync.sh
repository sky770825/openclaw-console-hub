#!/usr/bin/env bash
# NOW.md Sync (zero-token)
# Keeps ~/.openclaw/workspace/NOW.md current so /new sessions can resume smoothly.
#
# Strategy:
# - Overwrite NOW.md (keep it short + deterministic).
# - Pull a small snapshot from:
#   - Taskboard API (3011): task counts + auto-executor status
#   - MEMORY.md: last updated timestamp
#   - openclaw status: gateway + telegram probe latency (best-effort)
#
# This is intentionally not "smart"; it is a stable, low-risk status bridge.

set -euo pipefail

WS="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
OUT="$WS/NOW.md"
TASKBOARD_BASE="${TASKBOARD_BASE:-http://127.0.0.1:3011}"

NOW_TS="$(date "+%Y-%m-%d %H:%M")"

mem_last="$(
  python3 - <<'PY'
import re, pathlib
p=pathlib.Path.home()/'.openclaw/workspace/MEMORY.md'
try:
  s=p.read_text(encoding='utf-8', errors='replace')
except Exception:
  print('')
  raise SystemExit
m=re.search(r'最後更新:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}\s+[0-9]{2}:[0-9]{2})', s)
print(m.group(1) if m else '')
PY
)"

task_counts="$(curl -sS -m 2 "$TASKBOARD_BASE/api/tasks" 2>/dev/null \
  | jq '{total:length, ready:([.[]|select(.status=="ready")]|length), running:([.[]|select(.status=="running")]|length), blocked:([.[]|select(.status=="blocked")]|length), review:([.[]|select(.status=="review")]|length), done:([.[]|select(.status=="done")]|length)}' 2>/dev/null || true)"

compliance="$(curl -sS -m 2 "$TASKBOARD_BASE/api/tasks/compliance" 2>/dev/null \
  | jq '{ok, ready, compliantReady, noncompliantReady}' 2>/dev/null || true)"

executor="$(curl -sS -m 2 "$TASKBOARD_BASE/api/openclaw/auto-executor/status" 2>/dev/null \
  | jq '{ok, isRunning, pollIntervalMs, maxTasksPerMinute, lastExecutedAt}' 2>/dev/null || true)"

gateway_line="$(openclaw gateway status 2>/dev/null | rg -n 'Runtime:|RPC probe:' | tr '\n' ' ' | sed 's/[[:space:]]\\+/ /g' | head -c 220 || true)"
telegram_line="$(openclaw channels status --probe 2>/dev/null | rg -n 'Telegram default:' | head -n 1 | sed 's/[[:space:]]\\+/ /g' | head -c 240 || true)"

mkdir -p "$WS"

{
  echo "# NOW.md — 當前狀態"
  echo
  echo "> 更新：$NOW_TS"
  echo

  echo "## 🎯 當前焦點（請在 /new 後先讀這裡）"
  echo "- currentFocus: (待填) 例如：修復 task-gen / 讓任務可執行 / 交付 easyclaw-pro"
  echo "- next3:"
  echo "  - (1) 先跑 Generate-Handoff.command"
  echo "  - (2) /new"
  echo "  - (3) 只載入 memory/handoff/latest.md + NOW.md"
  echo

  echo "## 🧠 記憶狀態"
  if [[ -n "$mem_last" ]]; then
    echo "- MEMORY.md lastUpdated: $mem_last"
  else
    echo "- MEMORY.md lastUpdated: (unknown)"
  fi
  echo "- handoff: memory/handoff/latest.md"
  echo

  echo "## 🧾 任務板（3011）"
  if [[ -n "$task_counts" ]]; then
    echo "$task_counts" | jq '.'
  else
    echo "(taskboard api/tasks: no response)"
  fi
  echo
  if [[ -n "$compliance" ]]; then
    echo "$compliance" | jq '.'
  else
    echo "(taskboard compliance: no response)"
  fi
  echo
  if [[ -n "$executor" ]]; then
    echo "$executor" | jq '.'
  else
    echo "(auto-executor: no response)"
  fi
  echo

  echo "## 🧰 系統狀態（摘要）"
  echo "- gateway: ${gateway_line:-"(unknown)"}"
  echo "- telegram: ${telegram_line:-"(unknown)"}"
  echo

  echo "## 🔗 快捷操作"
  echo "- Rescue: Desktop/OpenClaw-Rescue+AutoFix.command"
  echo "- Generate handoff: Desktop/Generate-Handoff.command"
  echo "- Memory sync: Desktop/Nightly-Memory-Sync.command"
} > "$OUT"

echo "updated: $OUT"

