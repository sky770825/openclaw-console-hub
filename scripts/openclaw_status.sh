#!/bin/bash
# OpenClaw Task Status Scanner
SRC_DIR="/Users/caijunchang/openclaw任務面版設計"
echo "--- OpenClaw Project Health Report ($(date)) ---"
echo "Location: $SRC_DIR"
echo ""
echo "1. Recent Changes (Last 3 days):"
find "$SRC_DIR" -maxdepth 3 -mtime -3 -not -path '*/.*' -not -path '*/node_modules*'
echo ""
echo "2. Pending Tasks (TODO/FIXME):"
grep -rnE "TODO|FIXME" "$SRC_DIR" --exclude-dir=node_modules || echo "No pending markers found."
echo ""
echo "3. Port Usage (Dev Check):"
lsof -i :3000 -i :3001 -i :5173 -stcp:LISTEN || echo "No dev servers detected on standard ports."
