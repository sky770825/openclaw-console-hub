#!/bin/bash
# OpenClaw New Device Setup Script
# Generated for Old Cai (老蔡)
set -e

echo "--- Starting OpenClaw Environment Setup ---"

# Check OS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Warning: This script is optimized for macOS."
fi

# Define Target Directories
TARGET_BASE="$HOME/.openclaw/workspace"
DIRS=("sandbox" "scripts" "proposals" "reports" "knowledge" "armory" "skills" "sandbox/output")

for dir in "${DIRS[@]}"; do
    mkdir -p "$TARGET_BASE/$dir"
    echo "Created: $TARGET_BASE/$dir"
done

echo "--- Environment Structure Prepared ---"
echo "Next Steps:"
echo "1. Clone the project source: git clone <repo_url> /Users/caijunchang/openclaw任務面版設計"
echo "2. Extract the migration package to $TARGET_BASE"
echo "3. Re-install Node.js and Python dependencies if needed."
echo "Setup Complete."
