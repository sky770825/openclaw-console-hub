#!/bin/bash
# Search for agent information in the source code
SOURCE="/Users/sky770825/openclaw任務面版設計"
grep -r "$1" "$SOURCE" --exclude-dir=node_modules
