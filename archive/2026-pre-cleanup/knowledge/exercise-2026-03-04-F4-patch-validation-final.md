# 練習 F-4：PATCH 路由驗證安全性分析 (定稿)

### 1. 核心觀察
讀取 server/src/routes/openclaw-tasks.ts 後發現，PATCH 路由主要依賴 upsertOpenClawTask 進行資料更新。在路由層面，雖然有 scanTaskPayload 進行安全掃描，但對於 status 欄位的合法值檢查較為寬鬆，主要透過 openClawTaskToTask 進行前端展示層的映射。

### 2. 安全漏洞點
- 非法狀態跳轉：若 API 接收到未定義的 status 字串，雖然資料庫層面可能有 check constraint，但在應用程式邏輯中缺乏即時攔截，可能導致 Kanban 面板顯示異常。
- 欄位過濾：PATCH 請求未嚴格限制僅能修改特定欄位，理論上可透過此接口嘗試覆蓋系統自動生成的欄位。

### 3. 測試驗證
經 code_eval 模擬，目前的邏輯若不引入 Zod schema 驗證，對於非法狀態字串的過濾主要依賴資料庫報錯，而非 API 預檢。

### 4. 修補方案
建議在 openclawTasksRouter.patch 中引入 Zod 進行 schema 驗證，強制限制 status 僅能為 ready, running, done, failed, pending 等合法值。