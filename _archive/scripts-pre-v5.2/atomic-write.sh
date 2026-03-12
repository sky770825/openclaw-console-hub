#!/bin/bash
# 用途：確保檔案寫入不產生衝突
TARGET=$1
CONTENT=$2
TMP_FILE="${TARGET}.tmp.$RANDOM"
echo "$CONTENT" > "$TMP_FILE"
mv "$TMP_FILE" "$TARGET"
