#!/usr/bin/env bash
set -euo pipefail

# launchd environments often have a very minimal PATH.
# Make the recovery script robust when run via Taskboard/Telegram.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${HOME}/.local/bin:${PATH:-}"

# OpenClaw "no response" / stuck loop recovery helper.
#
# What it does:
# 1) Check Taskboard (http://localhost:3011/api/health) and restart LaunchAgent if needed.
# 2) Check OpenClaw gateway (ws://127.0.0.1:18789) and restart if needed.
# 3) Check Ollama local API (http://127.0.0.1:11434) is reachable.
# 4) Optionally cleanup stale runs that block progress.
# 5) Send Telegram test message via Taskboard API (if configured).
#
# Usage:
#   bash scripts/openclaw-recover-no-response.sh
#   CLEANUP_STALE_RUNS=true bash scripts/openclaw-recover-no-response.sh
#   OLDER_THAN_MINUTES=30 CLEANUP_STALE_RUNS=true bash scripts/openclaw-recover-no-response.sh

# Prefer localhost over 127.0.0.1: on some macOS setups Node binds IPv6 only,
# and 127.0.0.1 (IPv4) will fail even though localhost works.
TASKBOARD_URL="${TASKBOARD_URL:-http://localhost:3011}"
GATEWAY_WS="${GATEWAY_WS:-ws://127.0.0.1:18789}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
GATEWAY_HTTP="${GATEWAY_HTTP:-http://127.0.0.1:18789}"

OLDER_THAN_MINUTES="${OLDER_THAN_MINUTES:-45}"
STALE_LIMIT="${STALE_LIMIT:-50}"
CLEANUP_STALE_RUNS="${CLEANUP_STALE_RUNS:-false}"

# 載入 .env 取得 API Key
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$(dirname "$SCRIPT_DIR")/.env" ]; then
  set -a; source "$(dirname "$SCRIPT_DIR")/.env"; set +a
fi
_AUTH_ARGS=()
if [ -n "${OPENCLAW_API_KEY:-}" ]; then
  _AUTH_ARGS=(-H "x-api-key: ${OPENCLAW_API_KEY}")
fi

say() { printf '%s\n' "$*"; }
hr() { say "------------------------------------------------------------"; }

OPENCLAW_BIN="${OPENCLAW_BIN:-}"
if [[ -z "${OPENCLAW_BIN}" ]] && command -v openclaw >/dev/null 2>&1; then
  OPENCLAW_BIN="$(command -v openclaw)"
fi
if [[ -z "${OPENCLAW_BIN}" ]]; then
  for c in "/opt/homebrew/bin/openclaw" "/usr/local/bin/openclaw" "${HOME}/.local/bin/openclaw" "${HOME}/bin/openclaw"; do
    if [[ -x "${c}" ]]; then
      OPENCLAW_BIN="${c}"
      break
    fi
  done
fi

curl_json() {
  # curl_json URL [METHOD] [DATA]
  local url="$1"
  local method="${2:-GET}"
  local data="${3:-}"
  if [[ "$method" == "GET" ]]; then
    curl -sS --max-time 4 "${_AUTH_ARGS[@]}" "$url"
    return 0
  fi
  curl -sS --max-time 10 "${_AUTH_ARGS[@]}" -X "$method" -H "Content-Type: application/json" --data-binary "$data" "$url"
}

check_taskboard() {
  say "[1/5] Taskboard health: ${TASKBOARD_URL}/api/health"
  if curl -sS --max-time 3 "${TASKBOARD_URL}/api/health" >/dev/null; then
    say "OK"
    return 0
  fi
  say "FAIL -> restarting LaunchAgent: com.openclaw.taskboard"
  # LaunchAgent name is used in this workspace.
  launchctl kickstart -k "gui/${UID}/com.openclaw.taskboard" || true
  sleep 2
  curl -sS --max-time 3 "${TASKBOARD_URL}/api/health" >/dev/null
  say "OK (after restart)"
}

check_gateway() {
  say "[2/5] Gateway probe: ${GATEWAY_WS}"
  if [[ -n "${OPENCLAW_BIN}" ]]; then
    if "${OPENCLAW_BIN}" gateway status >/dev/null 2>&1; then
      say "OK"
      return 0
    fi
    say "FAIL -> restarting gateway (via openclaw)"
    "${OPENCLAW_BIN}" gateway restart >/dev/null 2>&1 || true
    sleep 2
    if "${OPENCLAW_BIN}" gateway status >/dev/null 2>&1; then
      say "OK (after restart)"
      return 0
    fi
    say "WARN: gateway still unhealthy after restart"
    return 0
  fi

  # Fallback: no openclaw CLI in PATH (common when run via launchd).
  if curl -sS --max-time 2 "${GATEWAY_HTTP}/" >/dev/null 2>&1; then
    say "OK (http)"
    return 0
  fi
  say "FAIL -> openclaw CLI not found; restarting gateway LaunchAgent"
  launchctl kickstart -k "gui/${UID}/ai.openclaw.gateway" >/dev/null 2>&1 || true
  launchctl kickstart -k "gui/${UID}/com.openclaw.gateway" >/dev/null 2>&1 || true
  sleep 2
  if curl -sS --max-time 3 "${GATEWAY_HTTP}/" >/dev/null 2>&1; then
    say "OK (after launchctl restart)"
    return 0
  fi
  say "WARN: gateway still unreachable (and openclaw CLI not found)."
  say "  hint: set OPENCLAW_BIN or OPENCLAW_WORKSPACE_ROOT / ensure openclaw CLI is installed for launchd PATH."
  return 0
}

check_ollama() {
  say "[3/5] Ollama ping: ${OLLAMA_URL}/api/tags"
  if curl -sS --max-time 2 "${OLLAMA_URL}/api/tags" >/dev/null; then
    say "OK"
    return 0
  fi
  say "WARN: Ollama API not reachable. If you rely on local models, start Ollama first."
  return 0
}

cleanup_stale_runs() {
  if [[ "${CLEANUP_STALE_RUNS}" != "true" ]]; then
    say "[4/5] Stale runs cleanup: skipped (set CLEANUP_STALE_RUNS=true to enable)"
    return 0
  fi

say "[4/5] Cleanup stale runs (> ${OLDER_THAN_MINUTES}m) limit=${STALE_LIMIT}"
  local body
  body="$(printf '{"olderThanMinutes":%s,"limit":%s}' "${OLDER_THAN_MINUTES}" "${STALE_LIMIT}")"
  curl_json "${TASKBOARD_URL}/api/openclaw/maintenance/cleanup-stale-runs" "POST" "$body" || true
  say "Done (see JSON above)"
}

telegram_test() {
  say "[5/5] Telegram test: POST ${TASKBOARD_URL}/api/telegram/test"
  # If Telegram is not configured, server returns 503; treat as non-fatal.
  if curl -sS --max-time 6 "${_AUTH_ARGS[@]}" -X POST "${TASKBOARD_URL}/api/telegram/test" >/dev/null; then
    say "OK (test message sent)"
    return 0
  fi
  say "WARN: Telegram test failed (maybe not configured or network blocked)"
  return 0
}

main() {
  hr
  say "OpenClaw Recovery: taskboard + gateway + ollama + stale runs + telegram"
  hr
  check_taskboard
  check_gateway
  check_ollama
  cleanup_stale_runs
  telegram_test
  hr
  say "Next checks:"
  say "- Taskboard UI: ${TASKBOARD_URL}"
  say "- Gateway UI  : http://127.0.0.1:18789/"
  say "- If Telegram still 'no response': ensure you are chatting with the bot configured by TELEGRAM_STOP_BOT_TOKEN (polling-based control bot). Send /start."
}

main "$@"
