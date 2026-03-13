#!/bin/bash
# Project Scout Utility
# Usage: ./scout_project.sh [target_dir]
TARGET="${1:-/Users/sky770825/openclaw任務面版設計}"
echo "Scanning $TARGET..."
find "$TARGET" -maxdepth 2 -not -path '*/.*'
