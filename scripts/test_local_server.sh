#!/bin/bash
PORT=$1
if [ -z "$PORT" ]; then
  PORT=$(grep -r "PORT =" /Users/caijunchang/openclaw任務面版設計/server 2>/dev/null | grep -oE "[0-9]{4,5}" | head -n 1 || echo "3001")
fi

echo "Testing connection to localhost:$PORT..."
curl -I http://localhost:$PORT || echo "FAILED: Cannot reach localhost:$PORT"
