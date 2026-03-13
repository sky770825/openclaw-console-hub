#!/bin/bash
# Verification script for BrowserService implementation
echo "Checking BrowserService files..."
if [ -f "/Users/sky770825/.openclaw/workspace/sandbox/server/src/services/BrowserService.ts" ] && [ -f "/Users/sky770825/.openclaw/workspace/sandbox/server/src/index.ts" ]; then
    echo "Files exist."
    grep "import { browserService }" "/Users/sky770825/.openclaw/workspace/sandbox/server/src/index.ts" && echo "Reference check passed."
    grep "import { chromium" "/Users/sky770825/.openclaw/workspace/sandbox/server/src/services/BrowserService.ts" && echo "Playwright dependency check passed."
else
    echo "Error: Files missing."
    exit 1
fi
