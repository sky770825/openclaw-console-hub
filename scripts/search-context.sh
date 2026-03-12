#!/bin/bash
# 在唯讀原始碼中快速檢索關鍵字
KEYWORD=$1
if [ -z "$KEYWORD" ]; then
    echo "Usage: $0 <keyword>"
    exit 1
fi
grep -rnE "$KEYWORD" /Users/caijunchang/openclaw任務面版設計 --exclude-dir=node_modules --exclude-dir=.git
