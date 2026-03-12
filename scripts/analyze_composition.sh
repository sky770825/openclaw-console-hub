#!/bin/bash
TARGET_DIR="/Users/caijunchang/openclaw任務面版設計"
echo "--- Project Composition Analysis ---"
echo "Timestamp: $(date)"
echo ""
echo "Count of files by extension:"
find "$TARGET_DIR" -type f -not -path "*/node_modules/*" -not -path "*/.*" | awk -F. '{if (NF>1) {print $NF}}' | sort | uniq -c | sort -nr

echo ""
echo "Line counts for source files (Top 20):"
find "$TARGET_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.css" -o -name "*.json" \) \
    -not -path "*/node_modules/*" -not -path "*/.*" \
    | xargs wc -l | sort -nr | head -n 20
