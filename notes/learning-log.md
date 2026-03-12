## 2026-03-02 學習：Express.js 路由與中間件
讀了什麼檔案：server/src/routes/research-center.ts
學到什麼：
1. Express.js 路由透過 Router() 實例化，並使用 router.post() 或 router.get() 定義 API 端點。
2. 路由處理函數 async (req, res) => { ... } 接收請求和回應物件，並在其中處理業務邏輯。
3. 請求參數透過 req.body 獲取，並在處理前進行基本驗證。
4. 業務邏輯會分離到 ../services/ 目錄下的服務函數中，保持路由層的整潔。
5. 錯誤處理使用 try...catch 區塊，並透過 logger.error 記錄錯誤，回傳 500 錯誤回應。
6. 服務函數在概念上扮演了路由處理流程中的「中間件」角色。
還不懂的：
- Express.js 獨立中間件的明確定義與使用範例。
- 錯誤處理中間件的具體實作方式。
- 更多路由設計模式和最佳實踐。