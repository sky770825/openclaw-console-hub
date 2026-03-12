# AutoExecutor & Anti-Stuck 效能優化報告

## 1. 效能優化 (Performance Optimization)
- **修改內容**: 將 `pollIntervalMs` 從 `15000ms` (15s) 調降至 `5000ms` (5s)。
- **預期效果**: 顯著提升任務隊列的響應速度，任務排隊時間縮短 66%。

## 2. 殭屍任務清理 (Zombie Cleanup)
- **新增邏輯**: `clearZombies()` 函數。
- **執行時機**: Server 啟動時自動調用。
- **功能說明**: 掃描資料庫中狀態為 `RUNNING` 但長時間未更新的任務，將其標記為 `FAILED`，防止舊任務佔用資源或顯示錯誤狀態。

## 3. 防卡機制加強 (Anti-Stuck Enhancement)
- **新增邏輯**: 定期全量掃描 (Periodic Full Scan)。
- **功能說明**: 
    - 具備從資料庫恢復監控的能力。
    - 每 5 分鐘執行一次全量巡檢。
    - 自動處理因意外中斷（如網路問題、進程崩潰）導致的「卡死」任務。

## 建議操作
由於 `server/src/` 目錄受保護，請手動將 `/Users/caijunchang/.openclaw/workspace/scripts/optimization/` 下的程式碼片段整合進原始碼中。
