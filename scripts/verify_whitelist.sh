#!/bin/bash
echo "Verifying whitelist configuration..."
# Try to find the config and print the whitelist
grep -r "whitelist" "/Users/sky770825/.openclaw/workspace/skills" "/Users/sky770825/.openclaw/workspace/armory" 2>/dev/null
echo "Testing command availability (dry-run names):"
echo "node -v"
echo "npm -v"
echo "tsc -v"
