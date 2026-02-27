#!/bin/bash
# NEUXA Log Sanitizer v1.0
# 監控 logs/ 目錄，自動移除敏感路徑與 Vault 關鍵字
LOG_DIR="logs"
VAULT_PATH="/Users/caijunchang/.openclaw/vault"
while true; do
  for log in $(find $LOG_DIR -name "*.jsonl" -o -name "*.log"); do
    if grep -q "$VAULT_PATH" "$log"; then
      sed -i '' "s|$VAULT_PATH|/PRIVATE/VAULT|g" "$log"
      echo "[NEUXA-SECURITY] Redacted sensitive path in $log"
    fi
  done
  sleep 30
done
