#!/bin/bash
echo "--- Verification Report ---"
if grep -q "browserService.browse(url)" "/Users/sky770825/.openclaw/workspace/sandbox/output/server/src/routes/proxy.ts"; then
    echo "✅ BrowserService integrated in proxy.ts"
else
    echo "❌ BrowserService integration missing in proxy.ts"
fi

if grep -q "app.use(\"/api/proxy\", proxyRouter)" "/Users/sky770825/.openclaw/workspace/sandbox/output/server/src/index.ts"; then
    echo "✅ Proxy router mounted in index.ts"
else
    echo "❌ Proxy router mounting missing in index.ts"
fi
