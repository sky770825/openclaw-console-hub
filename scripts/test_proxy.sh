#!/bin/bash
# Script to test the integrated Proxy + BrowserService

BASE_URL="http://localhost:3001/api/proxy/fetch"

echo "Testing Standard Fetch..."
curl -X POST $BASE_URL \
     -H "Content-Type: application/json" \
     -d '{"url": "https://httpbin.org/get"}'

echo -e "\n\nTesting BrowserService Force (useBrowser: true)..."
curl -X POST $BASE_URL \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "useBrowser": true}'
