#!/usr/bin/env bash
#
# Recover OpenClaw dedicated browser profile ("openclaw") when browser tool reports:
# "Can't reach the OpenClaw browser control service (timed out ...)"
#
# Root cause (common):
# - A stale Chrome instance is running with the OpenClaw user-data-dir but WITHOUT remote debugging port,
#   so the gateway can't attach CDP and the browser tool times out.
#
# This script:
# 1) Verifies gateway reachability
# 2) Kills stale Chrome processes tied to the openclaw profile user-data-dir
# 3) Starts the openclaw browser profile via OpenClaw
# 4) Optionally opens a test page and prints tabs
#
# Safe-by-default: only targets processes that include the specific user-data-dir path.

set -euo pipefail

PROFILE="${PROFILE:-openclaw}"
UDIR="${UDIR:-$HOME/.openclaw/browser/openclaw/user-data}"
CDP_PORT="${CDP_PORT:-18800}"
TIMEOUT_MS="${TIMEOUT_MS:-60000}"
TEST_URL="${TEST_URL:-https://example.com}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Recovering OpenClaw browser profile: ${PROFILE}"
log "User data dir: ${UDIR}"

if ! command -v openclaw >/dev/null 2>&1; then
  log "ERROR: openclaw CLI not found in PATH"
  exit 1
fi

log "Checking gateway reachability..."
openclaw gateway probe --timeout 20000 >/dev/null
log "Gateway reachable"

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:"${CDP_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    log "CDP port ${CDP_PORT} already listening; skipping kill step"
  else
    log "CDP port ${CDP_PORT} not listening; will kill stale Chrome processes for this profile"
    pids="$(ps aux | grep -F "${UDIR}" | grep -v grep | awk '{print $2}' | sort -u | tr '\n' ' ' | sed 's/ $//')"
    if [ -n "${pids}" ]; then
      log "Killing PIDs: ${pids}"
      for pid in ${pids}; do
        kill "${pid}" 2>/dev/null || true
      done
      sleep 2
      # If still alive, force kill.
      for pid in ${pids}; do
        if ps -p "${pid}" >/dev/null 2>&1; then
          log "PID ${pid} still alive; force killing"
          kill -9 "${pid}" 2>/dev/null || true
        fi
      done
    else
      log "No stale Chrome processes found for ${UDIR}"
    fi
  fi
else
  log "WARN: lsof not found; skipping CDP port check. Will still attempt profile start."
fi

log "Starting browser profile via OpenClaw..."
./scripts/openclaw-browser.sh --browser-profile "${PROFILE}" --timeout "${TIMEOUT_MS}" start >/dev/null

log "Opening test URL: ${TEST_URL}"
./scripts/openclaw-browser.sh --browser-profile "${PROFILE}" --timeout "${TIMEOUT_MS}" open "${TEST_URL}" >/dev/null || true

log "Tabs:"
./scripts/openclaw-browser.sh --browser-profile "${PROFILE}" --timeout "${TIMEOUT_MS}" tabs

log "Done"
