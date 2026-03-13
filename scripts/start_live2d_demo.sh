#!/bin/bash
echo "Starting local server for Live2D PoC..."
cd "/Users/sky770825/.openclaw/workspace/sandbox/output"
python3 -m http.server 8080
