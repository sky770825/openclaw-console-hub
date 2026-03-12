#!/bin/bash
API_BASE="http://localhost:3000/api"
TOKEN="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"

echo "Testing Health Endpoint..."
curl -s -X GET "$API_BASE/health" -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\nTesting Dispatch Endpoint (POST)..."
# Try multiple possible paths to identify the correct one
PATHS=(
    "/openclaw/auto-executor/dispatch"
    "/auto-executor/dispatch"
    "/dispatch"
)

for p in "${PATHS[@]}"; do
    echo "Trying $API_BASE$p..."
    curl -s -X POST "$API_BASE$p" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{}' -w " -> Status: %{http_code}\n"
done
