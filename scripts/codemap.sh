#!/bin/bash
# CodeMap: Generates a structural map of the project
TARGET_DIR=${1:-"/Users/caijunchang/openclaw任務面版設計"}
echo "CodeMap: Mapping directory structure for $TARGET_DIR"
find "$TARGET_DIR" -maxdepth 2 -not -path '*/.*'
