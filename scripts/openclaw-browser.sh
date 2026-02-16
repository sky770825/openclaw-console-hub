#!/usr/bin/env bash
#
# Wrapper to call OpenClaw browser commands with gateway token auth.
#
# Why: some environments/versions may fail to auto-inject the gateway token from config,
# resulting in: "gateway closed (1006 abnormal closure)".
#
# This script reads token from ~/.openclaw/openclaw.json and passes it via --token.
#
set -euo pipefail

CONFIG="${OPENCLAW_CONFIG:-$HOME/.openclaw/openclaw.json}"
if [ ! -f "$CONFIG" ]; then
  echo "ERROR: missing config: $CONFIG" >&2
  exit 1
fi

TOKEN="$(jq -r '.gateway.auth.token // empty' "$CONFIG")"
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: gateway auth token not found in $CONFIG (.gateway.auth.token)" >&2
  exit 1
fi

# Some OpenClaw CLI paths only honor --token when it appears after the subcommand
# (e.g. `openclaw browser profiles --token ...`). Append to be safe.
exec openclaw browser "$@" --token "$TOKEN"
