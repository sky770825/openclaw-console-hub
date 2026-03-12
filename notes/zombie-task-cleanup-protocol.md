# 殭屍任務清理協議 (Zombie Cleanup Protocol)

## 問題背景
由於 anti-stuck.ts 使用記憶體 Map 儲存超時監控器，Server 重啟後會遺失監控狀態。導致 openclaw_runs 中 status 為 running 的任務變成殭屍，佔用 AutoExecutor 的執行槽位（Concurrency Slot）。

## 診斷步驟
1. 查詢 openclaw_runs 中所有 running 且 started_at 超過 1 小時前的記錄。
2. 交叉比對 openclaw_tasks 的狀態。

## 處置動作
- 使用 update_task 將對應 Task ID 設為 failed。
- 若 Task 已不存在，需手動清理 Runs 表（需透過 API 或開發者工具）。

## 長期優化
- 修改 AutoExecutor 在啟動時自動執行 clearZombies()。
- 將 pollIntervalMs 調降至 5s。