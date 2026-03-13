#!/bin/bash
cd "/Users/sky770825/.openclaw/workspace/sandbox/server"
echo "Verifying Playwright installation in sandbox..."
if [ -d "node_modules/playwright" ]; then
    echo "✅ Playwright package installed."
else
    echo "❌ Playwright package missing."
fi

if [ -f "src/services/BrowserService.ts" ]; then
    echo "✅ BrowserService.ts created."
else
    echo "❌ BrowserService.ts missing."
fi
