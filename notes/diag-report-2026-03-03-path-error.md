# 系統診斷報告 - 2026-03-03

## 狀況描述
四個 BrowserService 相關任務卡在 in_progress 超過 8 小時，系統斷路器進入 half-open 狀態。

## 根本原因
server/src/executor-agents.ts 中的 ENHANCED_PATH 缺少 /opt/homebrew/bin，導致 Agent 在沙盒內找不到 npm，啟動即噴 exit 127。

## 已執行動作
1. 查詢任務板確認卡死狀態。
2. 讀取 executor-agents.ts 確認路徑缺失。
3. 將任務 t1772495682524, t1772495925947, t1772495814752, t1772497294875 標記為 failed 並寫入診斷摘要以釋放資源。

## 建議修復
1. 手動編輯 server/src/executor-agents.ts 加入路徑。
2. 重啟 OpenClaw Server。