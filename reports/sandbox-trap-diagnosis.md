# 沙盒陷阱診斷報告

## 現象
- 任務標記為 Done，但 server/src 無變動。
- 執行日誌顯示 Artifacts 產出於 sandbox/output 目錄。

## 根因
- Agent 缺乏磁碟寫入權限或未執行 cp/mv 指令將代碼移出沙盒。
- Auto-executor 驗收機制僅檢查腳本是否執行，未檢查實體檔案落地。

## 解決方案
- 所有涉及 server/src 的任務強制改用 agent=cursor。
- 增加產出物落地檢查 SOP。