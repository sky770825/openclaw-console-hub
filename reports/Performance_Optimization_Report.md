# AutoExecutor 效能與防卡機制優化報告

## 實作內容
1. **Poll Interval 優化**: 
   - 檔案: `AutoExecutor.ts`
   - 修改: `pollIntervalMs` 從 15,000ms 調降至 5,000ms。
   - 效益: 提高任務反應速度 3 倍。

2. **殭屍任務清理 (Zombie Cleanup)**:
   - 邏輯: 在 `AutoExecutor.start()` 時呼叫 `clearZombies()`。
   - 作用: 確保 Server 重啟後，原本卡在 'running' 狀態的任務能被正確重置回 'pending'。

3. **Anti-Stuck 增強**:
   - 邏輯: 新增 `restoreMonitoring()`。
   - 作用: 服務啟動時會從 DB 拉取所有執行中的任務進入監控隊列，防止因重啟導致的監控中斷。

## 檔案位置
- 優化後的建議程式碼已存放在: `/Users/caijunchang/.openclaw/workspace/proposals`
- 手動清理工具: `/Users/caijunchang/.openclaw/workspace/scripts/manual_zombie_cleanup.js`

## 建議部署步驟
由於 server/src 目錄權限限制，請手動將 `/Users/caijunchang/.openclaw/workspace/proposals` 中的邏輯合併至主程式。
