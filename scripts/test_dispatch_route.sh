#!/bin/bash
# Test script to probe the dispatch endpoint
TOKEN="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
BASE_URL="http://localhost:3000" # Assuming default port, adjust if known

echo "Probing /api/openclaw/auto-executor/dispatch..."
curl -X POST -H "Authorization: Bearer $TOKEN" -i "$BASE_URL/api/openclaw/auto-executor/dispatch"

echo -e "\n\nProbing alternative route (if mount mismatch)..."
# Try common variations
curl -X POST -H "Authorization: Bearer $TOKEN" -i "$BASE_URL/api/auto-executor/dispatch"
