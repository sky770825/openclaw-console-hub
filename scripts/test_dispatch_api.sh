#!/bin/bash
# Test script for Auto-Executor Dispatch API
TOKEN="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
HOST="http://localhost:3001"

echo "Attempting to POST to potential endpoints..."

echo "1. Testing /api/openclaw/auto-executor/dispatch"
curl -i -X POST "$HOST/api/openclaw/auto-executor/dispatch" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json"

echo -e "\n\n2. Testing /api/auto-executor/dispatch (alternative)"
curl -i -X POST "$HOST/api/auto-executor/dispatch" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json"

echo -e "\n\n3. Testing /api/openclaw/dispatch (alternative)"
curl -i -X POST "$HOST/api/openclaw/dispatch" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json"
