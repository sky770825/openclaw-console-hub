#!/bin/bash
curl -X POST http://localhost:3000/api/openclaw/auto-executor/dispatch \
     -H "Content-Type: application/json" \
     -d '{"task": "health-check"}'
