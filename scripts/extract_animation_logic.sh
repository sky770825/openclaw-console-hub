#!/bin/bash
# Helper to extract specific animation code blocks
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
PATTERN=$1

if [ -z "$PATTERN" ]; then
  echo "Usage: $0 <pattern>"
  exit 1
fi

grep -rC 5 "$PATTERN" "$SOURCE_DIR" --include="*.tsx" --include="*.ts" | head -n 50
