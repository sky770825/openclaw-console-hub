#!/bin/bash
# Search for agent information in the source code
SOURCE="/Users/caijunchang/openclaw任務面版設計"
grep -r "$1" "$SOURCE" --exclude-dir=node_modules
