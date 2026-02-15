#!/bin/zsh
set -euo pipefail

WS="/Users/caijunchang/openclaw任務面版設計"
REPORT_DIR="$HOME/Desktop"
TS="$(date "+%Y-%m-%d_%H-%M-%S")"
REPORT="$REPORT_DIR/openclaw-rescue-report-$TS.txt"

# Wait for the LaunchAgent gateway to come up after restart. The CLI can briefly
# report "gateway closed (1006)" during warm-up; this makes the report stable.
wait_for_gateway() {
  local i=0
  local out=""
  while (( i < 20 )); do
    out="$(openclaw gateway status 2>&1 || true)"
    if echo "$out" | rg -q "RPC probe: ok" && echo "$out" | rg -q "Listening: 127\\.0\\.0\\.1:18789"; then
      return 0
    fi
    sleep 1
    (( i++ ))
  done
  return 1
}

{
  echo "[OpenClaw Rescue Report]"
  echo "time: $(date "+%Y-%m-%d %H:%M:%S")"
  echo

  echo "== 1) Gateway Status =="
  openclaw gateway status || true
  echo

  echo "== 2) Channel Probe =="
  openclaw channels status --probe || true
  echo

  echo "== 3) Models Status =="
  openclaw models status || true
  echo

  echo "== 4) Deep Status =="
  openclaw status --deep || true
  echo

  echo "== 5) Process Snapshot (openclaw/node/npm) =="
  ps -Ao pid,ppid,pcpu,pmem,etime,command | rg "openclaw|node|npm" | head -n 120 || true
  echo

  echo "== 6) Ports (18789/3011/18800/18792) =="
  lsof -nP -iTCP -sTCP:LISTEN | rg ":(18789|3011|18800|18792)" || true
  echo

  echo "== 7) Taskboard Health (3011) =="
  curl -sS -m 3 http://127.0.0.1:3011/health || true
  echo
  echo
  curl -sS -m 3 http://127.0.0.1:3011/api/openclaw/auto-executor/status || true
  echo
  echo
  curl -sS -m 3 http://127.0.0.1:3011/api/tasks/compliance || true
  echo

  echo "== 8) Recent Gateway Log Hints =="
  LOG="/tmp/openclaw/openclaw-$(date "+%Y-%m-%d").log"
  if [[ -f "$LOG" ]]; then
    tail -n 260 "$LOG" | rg -n "(401|Unauthorized|rate_limit|cooldown|locked|timeout|EADDRINUSE|channel exited|error)" | tail -n 160 || true
  else
    echo "(log not found: $LOG)"
  fi
  echo

  echo "== 8b) LaunchAgent Logs (gateway.err.log tail) =="
  tail -n 140 "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null || echo "(no gateway.err.log)"
  echo

  echo "== 9) Auto Repair: Restart Gateway =="
  openclaw gateway restart || true
  echo
  echo "Waiting for gateway warm-up (up to 20s)..."
  if wait_for_gateway; then
    echo "Gateway warm-up: OK"
  else
    echo "Gateway warm-up: TIMEOUT (continuing with best-effort probes)"
  fi
  echo

  echo "== 10) Post-Restart Probe =="
  openclaw gateway status || true
  echo
  openclaw channels status --probe || true
  echo

  echo "done"
} > "$REPORT" 2>&1

# Open report + dashboard for convenience.
open -a TextEdit "$REPORT" >/dev/null 2>&1 || true
open "http://127.0.0.1:18789/" >/dev/null 2>&1 || true

echo "Report: $REPORT"
