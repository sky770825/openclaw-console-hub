#!/bin/bash
# Usage: ./search_project.sh <query_term>
QUERY=$1
if [ -z "$QUERY" ]; then
    echo "Usage: $0 <query_term>"
    exit 1
fi
grep -ri "$QUERY" "/Users/caijunchang/openclaw任務面版設計" --exclude-dir=node_modules
