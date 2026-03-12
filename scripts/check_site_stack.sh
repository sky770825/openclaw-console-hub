#!/bin/bash
TARGET=$1
if [ -z "$TARGET" ]; then echo "Usage: ./check_site_stack.sh <url>"; exit 1; fi
echo "Checking $TARGET..."
curl -sI "$TARGET" | grep -iE "server|x-powered-by|cache-control"
curl -s "$TARGET" | grep -oE "(_next|tailwind|bootstrap|react|vue|framer-motion)" | sort | uniq
