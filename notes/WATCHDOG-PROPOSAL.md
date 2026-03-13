# 任務板看門狗 (Watchdog) 提案

## 目的
防止任務卡在 in_progress 導致系統假死。

## 機制
1. 每小時執行一次。
2. 檢查 status='in_progress' 且 updated_at 超過 1 小時的任務。
3. 自動將其重置為 ready，並發送 Telegram 通知主人與達爾。