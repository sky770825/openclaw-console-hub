#!/bin/bash
# NEUXA Ghost Protocol v1.0
# 用途：定期變換日誌與暫存檔名稱，消除系統行為模式
LOG_DIR="logs/traffic"
while true; do
  DATE=$(date +%Y%m%d)
  NEW_ID=$(openssl rand -hex 4)
  # 混淆今日日誌名稱，讓外部難以追蹤日誌增長
  if [ -f "$LOG_DIR/traffic-$DATE.jsonl" ]; then
    mv "$LOG_DIR/traffic-$DATE.jsonl" "$LOG_DIR/t-$NEW_ID.jnl"
  fi
  sleep 3600
done
