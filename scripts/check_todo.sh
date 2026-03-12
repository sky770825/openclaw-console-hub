#!/bin/bash
# 此腳本用於快速查找專案中的待辦事項
SOURCE_DIR="/Users/caijunchang/openclaw任務面版設計"
echo "正在掃描 $SOURCE_DIR 中的 TODO/FIXME..."
grep -rnE "TODO|FIXME" "$SOURCE_DIR" --exclude-dir=node_modules --exclude-dir=.git
