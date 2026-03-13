#!/bin/bash
set -e
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
echo "--- Scanning OpenClaw Source for Features ---"
echo "Looking for UI components related to Dashboard and Task Management..."
find "$SOURCE_DIR/src" -maxdepth 3 -name "*.tsx" -o -name "*.jsx" | head -n 10
echo ""
echo "Checking Package dependencies for Tech Stack..."
if [ -f "$SOURCE_DIR/package.json" ]; then
    grep -E "\"dependencies\":|\"devDependencies\":" -A 15 "$SOURCE_DIR/package.json"
fi
