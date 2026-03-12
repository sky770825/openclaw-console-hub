#!/bin/bash
echo "Starting local server for Live2D PoC..."
cd "/Users/caijunchang/.openclaw/workspace/sandbox/output"
python3 -m http.server 8080
