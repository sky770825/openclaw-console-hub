# 練習 F-2：run_script 白名單增強 (最終修復)

### 1. 失敗回顧
先前失敗原因：1. 路徑重複包含 server/；2. patch_file 模式參數錯誤。現已確認基準路徑並改用 old+new 模式。

### 2. 實作
在 src/telegram/action-handlers.ts 中，將 whoami, id, groups 加入白名單陣列。

### 3. 驗證
patch 成功後，未來可用於更深入的權限診斷任務。

### 4. 學習點
精準掌握工具的 parameter schema 比單純的邏輯正確更重要。