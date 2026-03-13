#!/bin/bash
# Utility to scan the project source code for analysis
TARGET="/Users/sky770825/openclaw任務面版設計"

echo "=== OpenClaw Source Scanner ==="
if [ ! -d "$TARGET" ]; then
    echo "Error: Target directory $TARGET does not exist."
    exit 1
fi

echo "Scanning $TARGET ..."
find "$TARGET" -maxdepth 2 -not -path '*/.*'
echo "Scan complete."
