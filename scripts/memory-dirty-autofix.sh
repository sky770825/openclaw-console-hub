#!/usr/bin/env bash
# Memory Dirty Auto-fix (zero-token)
#
# Goal: if OpenClaw reports Memory=dirty, run safe rebuild steps:
# - run nightly-memory-sync.sh (updates MEMORY.md bounded block + rebuild INDEX-v2)
#
# This avoids the common issue: MEMORY.md timestamp lagging behind and index stale.

set -euo pipefail

WS="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
SYNC_SCRIPT="/Users/caijunchang/openclaw任務面版設計/scripts/nightly-memory-sync.sh"

STATUS_OUT="$(openclaw status 2>/dev/null || true)"

if echo "$STATUS_OUT" | rg -q 'Memory\s+.*\bdirty\b'; then
  echo "[memory-dirty-autofix] Memory is dirty; running nightly sync..."
  bash "$SYNC_SCRIPT"
  echo "[memory-dirty-autofix] done"
  exit 0
fi

echo "[memory-dirty-autofix] Memory clean; no action"

