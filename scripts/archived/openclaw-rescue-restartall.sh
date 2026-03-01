#!/bin/zsh
set -euo pipefail

WS="/Users/caijunchang/openclaw任務面版設計"
REPORT_DIR="$HOME/Desktop"
TS="$(date "+%Y-%m-%d_%H-%M-%S")"
REPORT="$REPORT_DIR/openclaw-rescue-restartall-report-$TS.txt"

TASKBOARD_BASE="http://127.0.0.1:3011"
POLL_INTERVAL_MS="${POLL_INTERVAL_MS:-60000}"
MAX_TASKS_PER_MIN="${MAX_TASKS_PER_MIN:-1}"

# 載入 .env 取得 API Key
if [ -f "$WS/.env" ]; then
  set -a; source "$WS/.env"; set +a
fi
AUTH_ARGS=()
if [ -n "${OPENCLAW_API_KEY:-}" ]; then
  AUTH_ARGS=(-H "x-api-key: ${OPENCLAW_API_KEY}")
fi

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

wait_for_taskboard() {
  local i=0
  while (( i < 25 )); do
    if curl -sS -m 2 "$TASKBOARD_BASE/health" | rg -q '"ok":true'; then
      return 0
    fi
    sleep 1
    (( i++ ))
  done
  return 1
}

restart_taskboard_3011() {
  echo "Restarting taskboard server (3011)..."
  local pid
  pid="$(lsof -nP -iTCP:3011 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
  if [[ -n "$pid" ]]; then
    echo "Found listener pid: $pid"
    kill "$pid" >/dev/null 2>&1 || true
    sleep 2
    # Ensure it's gone.
    kill -0 "$pid" >/dev/null 2>&1 && kill -9 "$pid" >/dev/null 2>&1 || true
  else
    echo "(no 3011 listener found)"
  fi

  # Start in background so the .command can exit.
  (cd "$WS" && nohup env PORT=3011 npm start --prefix server >/tmp/openclaw-taskboard-3011.log 2>&1 &)
  sleep 2

  if wait_for_taskboard; then
    echo "taskboard warm-up: OK"
  else
    echo "taskboard warm-up: TIMEOUT (see /tmp/openclaw-taskboard-3011.log)"
  fi
}

start_auto_executor() {
  curl -sS -m 6 "${AUTH_ARGS[@]}" -X POST "$TASKBOARD_BASE/api/openclaw/auto-executor/start" \
    -H "Content-Type: application/json" \
    -d "{\"pollIntervalMs\":$POLL_INTERVAL_MS,\"maxTasksPerMinute\":$MAX_TASKS_PER_MIN}" \
    | jq '{ok,message,isRunning,pollIntervalMs,maxTasksPerMinute}' 2>/dev/null || true
}

{
  echo "[OpenClaw Rescue+RestartAll Report]"
  echo "time: $(date "+%Y-%m-%d %H:%M:%S")"
  echo

  echo "== 1) Restart Gateway =="
  openclaw gateway restart || true
  echo "Waiting for gateway warm-up..."
  if wait_for_gateway; then echo "Gateway warm-up: OK"; else echo "Gateway warm-up: TIMEOUT"; fi
  echo

  echo "== 2) Restart Taskboard (3011) =="
  restart_taskboard_3011
  echo

  echo "== 3) Post-Check: Health + Executor =="
  curl -sS -m 3 "$TASKBOARD_BASE/health" || true
  echo
  curl -sS -m 4 "$TASKBOARD_BASE/api/openclaw/auto-executor/status" | jq '{ok,isRunning,pollIntervalMs,maxTasksPerMinute}' 2>/dev/null || true
  echo

  echo "== 4) Ensure Executor Running =="
  start_auto_executor
  echo

  echo "== 5) Compliance Snapshot =="
  curl -sS -m 5 "$TASKBOARD_BASE/api/tasks/compliance" | jq '{ok,total,ready,compliantReady,noncompliantReady}' 2>/dev/null || true
  echo

  echo "== 6) Logs =="
  echo "-- gateway.err.log --"
  tail -n 120 "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null || echo "(no gateway.err.log)"
  echo
  echo "-- taskboard (3011) stdout/stderr --"
  tail -n 120 /tmp/openclaw-taskboard-3011.log 2>/dev/null || echo "(no /tmp/openclaw-taskboard-3011.log)"
  echo

  echo "done"
} > "$REPORT" 2>&1

open -a TextEdit "$REPORT" >/dev/null 2>&1 || true
open "http://127.0.0.1:3011" >/dev/null 2>&1 || true

echo "Report: $REPORT"

