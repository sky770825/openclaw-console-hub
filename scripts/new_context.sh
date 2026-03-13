#!/bin/bash
# new_context.sh - Clears sandbox and output for a fresh start
SANDBOX="/Users/sky770825/.openclaw/workspace/sandbox"
OUTPUT="/Users/sky770825/.openclaw/workspace/sandbox/output"

echo "Running workspace cleanup..."
# Remove everything in sandbox EXCEPT the output directory and scripts/knowledge/etc (which are outside sandbox)
if [ -d "$SANDBOX" ]; then
    find "$SANDBOX" -mindepth 1 -maxdepth 1 ! -name 'output' -exec rm -rf {} +
fi

# Clear the output directory contents
if [ -d "$OUTPUT" ]; then
    find "$OUTPUT" -mindepth 1 -exec rm -rf {} +
fi

echo "Cleanup complete. Workspace is fresh."
