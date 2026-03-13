#!/bin/bash
PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"
echo "### Current Project Analysis ###"

if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "Frontend/Root package.json detected."
    echo "Dependencies:"
    jq '.dependencies' "$PROJECT_ROOT/package.json" || grep "dependencies" -A 10 "$PROJECT_ROOT/package.json"
fi

if [ -f "$PROJECT_ROOT/server/package.json" ]; then
    echo "Backend package.json detected."
    echo "Dependencies:"
    jq '.dependencies' "$PROJECT_ROOT/server/package.json" || grep "dependencies" -A 10 "$PROJECT_ROOT/server/package.json"
fi

echo "Project Structure:"
find "$PROJECT_ROOT" -maxdepth 2 -not -path '*/.*'
