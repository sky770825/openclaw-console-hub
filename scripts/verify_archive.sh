#!/bin/bash
TEST_DATA="/Users/caijunchang/.openclaw/workspace/sandbox/tasks.json"
ARCHIVE_TOOL="/Users/caijunchang/.openclaw/workspace/scripts/task_archiver.js"

echo "Creating mock task data..."
cat << 'JSON' > "$TEST_DATA"
[
  { "id": "task-1", "status": "completed", "updatedAt": "2020-01-01T00:00:00Z" },
  { "id": "task-2", "status": "running", "updatedAt": "2020-01-01T00:00:00Z" },
  { "id": "task-3", "status": "failed", "updatedAt": "2020-01-01T00:00:00Z" },
  { "id": "task-4", "status": "completed", "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)" }
]
JSON

echo "Running archiver..."
export TASKS_JSON_PATH="$TEST_DATA"
node "$ARCHIVE_TOOL"

echo "Verifying results..."
ARCHIVED_COUNT=$(grep -c '"status": "archived"' "$TEST_DATA")
if [ "$ARCHIVED_COUNT" -eq 2 ]; then
    echo "SUCCESS: 2 tasks were archived as expected."
else
    echo "FAILURE: Expected 2 archived tasks, found $ARCHIVED_COUNT"
    exit 1
fi
