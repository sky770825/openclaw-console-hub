#!/bin/bash
# Utility to search for specific strings in the project source
SEARCH_TERM=$1
if [ -z "$SEARCH_TERM" ]; then
  echo "Usage: $0 <search_term>"
  exit 1
fi
grep -rni "$SEARCH_TERM" /Users/caijunchang/openclaw任務面版設計 --exclude-dir=node_modules
