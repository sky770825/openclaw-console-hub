#!/bin/bash
PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計"
echo "### Project Structure Analysis (Focus on Task Panel)"
find "$PROJECT_ROOT" -maxdepth 2 -not -path '*/.*'

echo -e "\n### Frontend Components (Task/Panel related)"
find "$PROJECT_ROOT/src" -name "*[Tt]ask*" -o -name "*[Pp]anel*" -o -name "*[Dd]ashboard*" 2>/dev/null | grep -v "node_modules"

echo -e "\n### Backend Logic (Task related)"
find "$PROJECT_ROOT/server/src" -name "*[Tt]ask*" 2>/dev/null | grep -v "node_modules"

echo -e "\n### Identified Models/Types"
grep -rnE "interface Task|type Task|class Task" "$PROJECT_ROOT/src" "$PROJECT_ROOT/server/src" 2>/dev/null | head -n 20
