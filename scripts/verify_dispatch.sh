#!/bin/bash
TOKEN="oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"
echo "Testing POST /api/openclaw/auto-executor/dispatch..."
curl -X POST http://localhost:3000/api/openclaw/auto-executor/dispatch \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
