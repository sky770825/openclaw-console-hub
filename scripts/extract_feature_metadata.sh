#!/bin/bash
# This script extracts feature descriptions from the source code for content verification.
SRC="/Users/caijunchang/openclaw任務面版設計"
echo "--- OpenClaw Feature Content Extraction ---"
grep -rEi "title:|label:|description:|特色" "$SRC" --include="*.tsx" --include="*.ts" --include="*.js" | grep -v "node_modules" | head -n 50
