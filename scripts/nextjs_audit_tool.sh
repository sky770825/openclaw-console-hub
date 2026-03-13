#!/bin/bash
# Next.js Dual Nature Audit Tool
TARGET_DIR="${1:-/Users/sky770825/openclaw任務面版設計}"

echo "### Next.js Component Audit ###"
echo "Target: $TARGET_DIR"
echo "------------------------------"

# Count Client Components
CLIENT_COUNT=$(grep -r "['\"]use client['\"]" "$TARGET_DIR" --include="*.tsx" --include="*.ts" | wc -l | xargs)
echo "Client Components (with 'use client'): $CLIENT_COUNT"

# Count Potential Server Components (excluding node_modules and hidden files)
TOTAL_COMPONENTS=$(find "$TARGET_DIR" -name "*.tsx" -o -name "*.ts" | grep -v "node_modules" | wc -l | xargs)
SERVER_COUNT=$((TOTAL_COMPONENTS - CLIENT_COUNT))
echo "Total TSX/TS Files: $TOTAL_COMPONENTS"
echo "Estimated Server/Static Components: $SERVER_COUNT"

echo "------------------------------"
echo "Sample Client Components:"
grep -r "['\"]use client['\"]" "$TARGET_DIR" --include="*.tsx" --include="*.ts" | head -n 5
