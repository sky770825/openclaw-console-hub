#!/bin/bash
set -e
# This script applies the fix to a writable sandbox copy of the source code.
SOURCE="/Users/caijunchang/openclaw任務面版設計/server/src"
DEST="/Users/caijunchang/.openclaw/workspace/sandbox/fixed_server_src"

echo "Creating writable copy in sandbox..."
mkdir -p "$DEST"
cp -R "$SOURCE"/* "$DEST/"

echo "Applying fixes: 'in_progress' -> 'running'"
# macOS sed syntax (-i '')
find "$DEST" -type f -name "*.ts" -o -name "*.js" | xargs sed -i '' "s/'in_progress'/'running'/g"
find "$DEST" -type f -name "*.ts" -o -name "*.js" | xargs sed -i '' 's/"in_progress"/"running"/g'

echo "Fix applied successfully to $DEST"
