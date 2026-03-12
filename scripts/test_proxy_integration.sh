#!/bin/bash
# Test script for Proxy + BrowserService integration

BASE_URL="http://localhost:3001/api/proxy"

echo "Testing standard fetch..."
curl -X POST "$BASE_URL/fetch" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "useBrowser": false}'

echo -e "\n\nTesting browser fetch (BrowserService)..."
curl -X POST "$BASE_URL/fetch" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "useBrowser": true}'
