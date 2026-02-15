#!/bin/zsh
set -euo pipefail

WS="/Users/caijunchang/openclaw任務面版設計"
REPORT_DIR="$HOME/Desktop"
TS="$(date "+%Y-%m-%d_%H-%M-%S")"
REPORT="$REPORT_DIR/openclaw-rescue-autofix-report-$TS.txt"

TASKBOARD_BASE="http://127.0.0.1:3011"
POLL_INTERVAL_MS="${POLL_INTERVAL_MS:-60000}"
MAX_TASKS_PER_MIN="${MAX_TASKS_PER_MIN:-1}"

wait_for_gateway() {
  local i=0
  local out=""
  while (( i < 25 )); do
    out="$(openclaw gateway status 2>&1 || true)"
    if echo "$out" | rg -q "RPC probe: ok" && echo "$out" | rg -q "Listening: 127\\.0\\.0\\.1:18789"; then
      return 0
    fi
    sleep 1
    (( i++ ))
  done
  return 1
}

taskboard_ok() {
  curl -sS -m 3 "$TASKBOARD_BASE/health" | rg -q '"ok":true'
}

block_noncompliant_ready() {
  # Block "ready" tasks missing required meta fields to avoid executor spinning.
  # This is reversible (unblock / rehydrate meta) and reduces noise.
  local tasks_json
  tasks_json="$(curl -sS -m 6 "$TASKBOARD_BASE/api/tasks" || true)"
  if [[ -z "$tasks_json" ]]; then
    echo "(no tasks payload)"
    return 0
  fi

  local ids
  ids="$(echo "$tasks_json" | jq -r '
    .[]
    | select(.status=="ready")
    | select(
        (.projectPath // "" | length)==0
        or (.agent.type // "" | length)==0
        or (.riskLevel // "" | length)==0
        or (.rollbackPlan // "" | length)==0
        or (.acceptanceCriteria // [] | length)==0
        or (.deliverables // [] | length)==0
        or (.runCommands // [] | length)==0
        or (.modelPolicy // "" | length)==0
        or (.executionProvider // "" | length)==0
        or (.allowPaid == null)
      )
    | .id
  ' 2>/dev/null || true)"

  local count
  count="$(echo "$ids" | rg -c '^[^[:space:]]+$' || true)"
  if [[ -z "$count" || "$count" == "0" ]]; then
    echo "noncompliant ready: 0"
    return 0
  fi

  echo "noncompliant ready: $count (will set status=blocked)"
  echo "$ids" | head -n 12 | sed 's/^/  - /'

  local id
  local blocked=0
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    # Best-effort; ignore failures so we can continue.
    curl -sS -m 6 -X PATCH "$TASKBOARD_BASE/api/tasks/$id" \
      -H "Content-Type: application/json" \
      -d '{"status":"blocked","tags":["noncompliant","needs-meta"]}' >/dev/null 2>&1 || true
    (( blocked++ ))
    # Small delay to avoid spiking the server.
    sleep 0.05
  done <<< "$ids"

  echo "blocked updated: $blocked"
}

start_auto_executor_if_needed() {
  local st
  st="$(curl -sS -m 4 "$TASKBOARD_BASE/api/openclaw/auto-executor/status" || true)"
  if [[ -z "$st" ]]; then
    echo "(auto-executor status: no response)"
    return 0
  fi
  echo "$st" | jq '{ok,isRunning,pollIntervalMs,maxTasksPerMinute,lastPollAt,lastExecutedAt,nextPollAt}' 2>/dev/null || echo "$st"

  local isRunning
  isRunning="$(echo "$st" | jq -r '.isRunning // false' 2>/dev/null || echo false)"
  if [[ "$isRunning" == "true" ]]; then
    echo "auto-executor already running"
    return 0
  fi

  echo "starting auto-executor (pollIntervalMs=$POLL_INTERVAL_MS, maxTasksPerMinute=$MAX_TASKS_PER_MIN)"
  curl -sS -m 6 -X POST "$TASKBOARD_BASE/api/openclaw/auto-executor/start" \
    -H "Content-Type: application/json" \
    -d "{\"pollIntervalMs\":$POLL_INTERVAL_MS,\"maxTasksPerMinute\":$MAX_TASKS_PER_MIN}" \
    | jq '{ok,message,isRunning,pollIntervalMs,maxTasksPerMinute}' 2>/dev/null || true
}

{
  echo "[OpenClaw Rescue+AutoFix Report]"
  echo "time: $(date "+%Y-%m-%d %H:%M:%S")"
  echo

  echo "== 1) Preflight: Gateway + Channels =="
  openclaw gateway status || true
  echo
  openclaw channels status --probe || true
  echo

  echo "== 2) Auto Repair: Restart Gateway =="
  openclaw gateway restart || true
  echo
  echo "Waiting for gateway warm-up..."
  if wait_for_gateway; then
    echo "Gateway warm-up: OK"
  else
    echo "Gateway warm-up: TIMEOUT"
  fi
  echo

  echo "== 3) Taskboard Health (3011) =="
  if taskboard_ok; then
    curl -sS -m 3 "$TASKBOARD_BASE/health" || true
  else
    echo "(taskboard not healthy; skipping autofix steps)"
  fi
  echo

  if taskboard_ok; then
    echo "== 4) Block Noncompliant Ready Tasks =="
    block_noncompliant_ready
    echo

    echo "== 5) Auto-Executor Ensure Running =="
    start_auto_executor_if_needed
    echo

    echo "== 6) Post-Check Compliance Snapshot =="
    curl -sS -m 5 "$TASKBOARD_BASE/api/tasks/compliance" | jq '{ok,total,ready,compliantReady,noncompliantReady}' 2>/dev/null || true
    echo
  fi

  echo "== 7) Logs (gateway.err.log tail) =="
  tail -n 160 "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null || echo "(no gateway.err.log)"
  echo

  echo "done"
} > "$REPORT" 2>&1

open -a TextEdit "$REPORT" >/dev/null 2>&1 || true
open "http://127.0.0.1:18789/" >/dev/null 2>&1 || true

echo "Report: $REPORT"

