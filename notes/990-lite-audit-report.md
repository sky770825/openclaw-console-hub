# 990 Lite 審計報告 - 2026-03-03

## 核心問題清單
1. 路徑幻覺：Agent 在 l2-sandbox 執行時建立的 src/ 未正確同步回 projects/990-lite/，導致外部看是空目錄。
2. 虛假成功：任務 A1、B1 狀態為 done，但無實體檔案產出，驗收機制（status check）失效。
3. 掃描對象錯誤：B1 宣稱掃描 5 萬行代碼，實際上是掃到了 OpenClaw Server 的 node_modules 或系統源碼，而非 990 Lite 專案本身。
4. 相依性斷層：B1 在 A1 沒產出代碼的情況下依然執行「掃描」，代表任務間的實體檢查不夠嚴謹。
5. BrowserService 遺失：之前的任務宣稱安裝了 Playwright，但 Server 實際路徑中找不到對應的 Service 實作。

## 建議修復路徑
- 強制指定 agent=cursor 進行實體檔案落地。
- 在 create_task 時強制要求 ls -R 驗收。