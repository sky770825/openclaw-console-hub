#!/bin/bash
SEARCH_TERM=$1
SEARCH_DIR=$2
echo "Searching for '$SEARCH_TERM' in $SEARCH_DIR..."
grep -rn "$SEARCH_TERM" "$SEARCH_DIR" --exclude-dir=".git" --exclude-dir="node_modules" --exclude-dir="dist" || echo "No occurrences of $SEARCH_TERM found."
