# 調查報告：AutoExecutor 觸發機制追蹤

> NEUXA 於 2026-02-28 建立，並由老蔡校準後進行存檔。

## 調查目標
找出 auto-executor.ts 這個核心自動化引擎是如何在系統中被觸發的。

## 調查路徑與發現

1.  初步發現：在 server/src/routes 目錄中發現了 auto-executor.ts，確認其為系統自動化執行的核心，包含風險評估、斷路器、代理選擇等精密邏輯。

2.  疑點：檢查 server/src/index.ts (系統主入口)，發現 auto-executor.ts 並未被當作一個 Express 路由掛載。這表示它不是透過傳統的 API 路由方式被啟動。

3.  新假設：根據 SYSTEM-RESOURCES.md 中的資訊，推斷 AutoExecutor 是由外部排程器 (n8n) 透過呼叫 POST /api/openclaw/run-next 端點來觸發的。

4.  驗證與碰壁：為了找出 run-next 端點的定義，我檢查了最相關的 routes/openclaw-tasks.ts 檔案。結果發現，該檔案中並不存在 run-next 端點。

## 當前結論

追蹤 run-next 的線索在 openclaw-tasks.ts 這裡中斷了。但這個端點必定存在於某個被 index.ts 掛載的路由檔案中。

## 下一步行動建議

系統性地掃描所有 server/src/routes 下的檔案，直接搜尋 run-next 這個關鍵字，以定位其所在的確切檔案。