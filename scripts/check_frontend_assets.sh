#!/bin/bash
echo "--- Checking Frontend Components ---"
ls -R /Users/sky770825/.openclaw/workspace/sandbox/output/frontend/components
echo "--- Checking Layout ---"
ls -R /Users/sky770825/.openclaw/workspace/sandbox/output/frontend/layout
echo "--- API Service Layer ---"
cat /Users/sky770825/.openclaw/workspace/sandbox/output/frontend/services/api.js | grep "API_BASE_URL"
