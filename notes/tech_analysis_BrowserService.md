# 技術分析筆記：BrowserService.ts

> 日期：2026-03-03
> 來源：自主進化喚醒 Cycle 5 (主動探索)
> 分析師：ask_ai (pro)

---

### 1. 核心功能

此服務使用 Playwright 無頭瀏覽器訪問指定 URL，萃取並返回網頁的純文字內容。

### 2. 關鍵優點

- *優雅降級 (Graceful Degradation)*：將 playwright 作為選配依賴，當未安裝時，服務會自動降級為停用狀態而不會導致應用程式崩潰，顯著提升了系統的健壯性。
- *資源隔離與清理 (Robust Resource Isolation & Cleanup)*：每次 browse 請求都創建獨立的 BrowserContext 和 Page，確保了請求間的狀態隔離；並透過 finally 區塊保證資源被可靠關閉，有效避免了內存洩漏。

### 3. 可執行的改進建議

- *性能優化：引入頁面池化 (Page Pooling)*
  - *問題*：每次請求都執行 browser.newContext() 和 context.newPage() 的開銷較大，在高併發場景下會成為性能瓶頸。
  - *建議*：在 init() 方法中，預先創建一個由多個 Page 物件組成的資源池。browse 方法從池中獲取一個閒置頁面使用，完成後將其重置（例如，導航到 about:blank）並歸還池中。這能大幅減少單次請求的延遲，提升吞吐量。

- *健壯性提升：改用專門的內容萃取庫*
  - *問題*：目前 page.evaluate 中移除 script, nav, footer 等標籤的邏輯過於簡化，對現代複雜網頁結構的適應性差，容易萃取出無關內容或遺漏核心正文。
  - *建議*：整合 Mozilla 的 Readability.js 函式庫。在 page.evaluate 中注入並執行 Readability，它能更智能地分析 DOM 結構並提取主要文章內容，顯著提高文字萃取的準確性與可靠性。

- *可擴展性增強：實現單例模式並外部化配置*
  - *問題*：服務實例可被重複創建，可能導致多個瀏覽器進程被啟動，浪費資源。同時，userAgent、timeout 等參數被硬編碼，缺乏彈性。
  - *建議*：
    1. *單例模式 (Singleton)*：將 BrowserService 重構為單例模式，確保整個應用程式共享同一個瀏覽器實例。
    2. *外部化配置 (Externalize Config)*：將 headless、userAgent、timeout、maxChars 等參數移至環境變數或配置文件中，在服務初始化時讀取。