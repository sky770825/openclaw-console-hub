#!/bin/bash
echo "--- Environment Diagnostics ---"
echo "Current User: $(whoami)"
echo "Checking target: /Users/sky770825/openclaw任務面版設計"

if [ -d "/Users/sky770825/openclaw任務面版設計" ]; then
    echo "[SUCCESS] Directory exists."
    ls -la "/Users/sky770825/openclaw任務面版設計"
else
    echo "[FAILURE] Directory not found."
    echo "Listing contents of /Users to find correct path:"
    ls -F /Users/
fi
