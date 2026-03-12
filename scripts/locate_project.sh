#!/bin/bash
echo "--- Environment Diagnostics ---"
echo "Current User: $(whoami)"
echo "Checking target: /Users/caijunchang/openclaw任務面版設計"

if [ -d "/Users/caijunchang/openclaw任務面版設計" ]; then
    echo "[SUCCESS] Directory exists."
    ls -la "/Users/caijunchang/openclaw任務面版設計"
else
    echo "[FAILURE] Directory not found."
    echo "Listing contents of /Users to find correct path:"
    ls -F /Users/
fi
