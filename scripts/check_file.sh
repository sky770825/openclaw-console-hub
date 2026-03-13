#!/bin/bash
if [ -f "/Users/sky770825/.openclaw/workspace/sandbox/new_computer.txt" ]; then
    echo "File exists: /Users/sky770825/.openclaw/workspace/sandbox/new_computer.txt"
    echo "Content: $(cat "/Users/sky770825/.openclaw/workspace/sandbox/new_computer.txt")"
else
    echo "File not found"
    exit 1
fi
