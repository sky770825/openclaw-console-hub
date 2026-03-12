#!/bin/bash
# Script to analyze the OpenClaw Task Panel design files
SOURCE="/Users/caijunchang/openclaw任務面版設計"

if [ ! -d "$SOURCE" ]; then
    echo "Error: Project path not found at $SOURCE"
    exit 1
fi

echo "Analyzing UI components in $SOURCE/src..."
find "$SOURCE/src" -name "*.tsx" -o -name "*.vue" -o -name "*.js" | xargs grep -l "Task" || echo "No task components found."

echo "Analyzing API endpoints in $SOURCE/server/src..."
grep -r "router" "$SOURCE/server/src" 2>/dev/null || echo "No router definitions found."
