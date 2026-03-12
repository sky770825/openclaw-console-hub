#!/bin/bash
TOKEN="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
URL="http://localhost:3000/api/openclaw/auto-executor/dispatch"

echo "Testing Dispatch API..."
curl -X POST "$URL" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -v
