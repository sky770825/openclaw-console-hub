#!/bin/bash
# Project Scanner Tool - Part of Claude Code Authorization Task
# Analyzes the task dashboard project without modifying source files.

SOURCE_DIR="/Users/caijunchang/openclaw任務面版設計"
REPORT_PATH="/Users/sky770825/.openclaw/workspace/reports/initial_audit_report.md"

echo "# Project Audit Report: openclaw任務面版設計" > "$REPORT_PATH"
echo "Timestamp: $(date)" >> "$REPORT_PATH"
echo "Authorization: Lao Cai (主人授權)" >> "$REPORT_PATH"
echo "" >> "$REPORT_PATH"

echo "## 1. Project Overview" >> "$REPORT_PATH"
if [ -d "$SOURCE_DIR" ]; then
    echo "Project directory identified: $SOURCE_DIR" >> "$REPORT_PATH"
else
    echo "ERROR: Project directory not found." >> "$REPORT_PATH"
    exit 1
fi

echo "## 2. Core Structure" >> "$REPORT_PATH"
echo '```text' >> "$REPORT_PATH"
find "$SOURCE_DIR" -maxdepth 2 -not -path '*/.*' >> "$REPORT_PATH"
echo '```' >> "$REPORT_PATH"

echo "## 3. Dependency Analysis (Root package.json)" >> "$REPORT_PATH"
if [ -f "$SOURCE_DIR/package.json" ]; then
    echo '```json' >> "$REPORT_PATH"
    jq '{name, version, dependencies, devDependencies}' "$SOURCE_DIR/package.json" >> "$REPORT_PATH"
    echo '```' >> "$REPORT_PATH"
else
    echo "No package.json found at root." >> "$REPORT_PATH"
fi

echo "## 4. Backend Route Discovery (server/src)" >> "$REPORT_PATH"
# Searching for common route definition patterns in the protected server directory
echo '```text' >> "$REPORT_PATH"
grep -rE "router\.(get|post|put|delete)" "$SOURCE_DIR/server/src" 2>/dev/null | head -n 20 || echo "No explicit routes found in search." >> "$REPORT_PATH"
echo '```' >> "$REPORT_PATH"

echo "## 5. Frontend Component Inventory (src)" >> "$REPORT_PATH"
# Listing components to understand the design architecture
echo '```text' >> "$REPORT_PATH"
find "$SOURCE_DIR/src" -name "*.tsx" -o -name "*.vue" -o -name "*.jsx" | head -n 30 >> "$REPORT_PATH"
echo '```' >> "$REPORT_PATH"

echo "Report generated successfully at $REPORT_PATH"
