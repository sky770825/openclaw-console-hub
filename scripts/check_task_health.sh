#!/bin/bash
# Helper to check local task status before automation runs
PROJECT_DIR="/Users/sky770825/openclaw任務面版設計"
echo "--- Scanning Task Project for Recent Updates ---"
find "$PROJECT_DIR" -maxdepth 3 -name "*.ts" -o -name "*.json" -mtime -1 | grep -v "node_modules" || echo "No files modified in last 24h."
