#!/bin/bash
# Code Map: Structural Analysis Tool
SEARCH_DIR=$1
echo "Code Map: Generating map for $SEARCH_DIR"
echo "--- Directory Structure ---"
find "$SEARCH_DIR" -maxdepth 3 -not -path '*/.*'
echo "--- Core Components Detected ---"
grep -rE "export const|class |interface " "$SEARCH_DIR" --include="*.ts" --include="*.tsx" --include="*.js" | head -n 20
