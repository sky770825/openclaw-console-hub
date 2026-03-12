#!/bin/bash
# This script applies the fixes to the actual source directory
# (To be run by the user manually as per the task request)

TARGET_INDEX="../../server/src/index.ts"
TARGET_ROUTER_DIR="../../server/src/routes"

echo "Applying index.ts fix..."
python3 patch_index.py "$TARGET_INDEX"

echo "Deploying openclaw-runs.ts..."
cp openclaw-runs.ts "$TARGET_ROUTER_DIR/openclaw-runs.ts"

echo "Fix complete. Please check .fixed file and overwrite manually."
