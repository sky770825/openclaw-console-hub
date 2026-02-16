#!/usr/bin/env bash
set -euo pipefail

# Minimal, non-secret security sanity checks.
# This script prints only "SET/MISSING" style status and HTTP codes.

BASE_URL="${BASE_URL:-http://127.0.0.1:3011}"

echo "== OpenClaw Security Check =="
echo "BASE_URL=$BASE_URL"
echo

echo "-- API Health --"
curl -sS -o /dev/null -w "GET /api/health => %{http_code}\n" "$BASE_URL/api/health" 2>/dev/null || true
curl -sS -o /dev/null -w "GET /api/security/status => %{http_code}\n" "$BASE_URL/api/security/status" 2>/dev/null || true
echo

echo "-- Env Toggles (presence only) --"
vars=(
  OPENCLAW_API_KEY
  OPENCLAW_READ_KEY
  OPENCLAW_WRITE_KEY
  OPENCLAW_ADMIN_KEY
  OPENCLAW_ENFORCE_WRITE_AUTH
  OPENCLAW_ENFORCE_READ_AUTH
  OPENCLAW_DASHBOARD_BASIC_USER
  OPENCLAW_DASHBOARD_BASIC_PASS
  OPENCLAW_TRUST_PROXY
)
for v in "${vars[@]}"; do
  val="${!v-}"
  if [[ -n "${val}" ]]; then
    echo "$v=SET"
  else
    echo "$v=MISSING"
  fi
done
