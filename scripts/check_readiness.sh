#!/bin/bash
echo "Verifying environment for Lao Cai..."
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js not found."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "WARNING: Python3 not found."; }
echo "Checking directory permissions..."
[ -w "/Users/caijunchang/.openclaw/workspace/sandbox" ] && echo "Sandbox: OK" || echo "Sandbox: FAIL"
echo "Environment check complete."
