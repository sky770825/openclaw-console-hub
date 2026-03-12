#!/bin/bash
echo "Verifying whitelist configuration..."
# Try to find the config and print the whitelist
grep -r "whitelist" "/Users/caijunchang/.openclaw/workspace/skills" "/Users/caijunchang/.openclaw/workspace/armory" 2>/dev/null
echo "Testing command availability (dry-run names):"
echo "node -v"
echo "npm -v"
echo "tsc -v"
