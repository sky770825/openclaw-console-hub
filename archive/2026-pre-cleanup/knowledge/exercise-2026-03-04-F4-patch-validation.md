# 練習 F-4：PATCH 路由非法輸入驗證測試

### 1. 目標
讀取 server/src/routes/openclaw-tasks.ts 的 PATCH 路由，模擬非法輸入測試驗證強度。

### 2. 測試邏輯
定義允許更新的欄位：title, status, cat, progress, thought, subs。

### 3. 模擬結果
- 正常輸入 ({title: 'Test'}): ok: true
- 非法輸入 ({admin: true, status: 'done'}): ok: false, illegal: ['admin']

### 4. 結論
目前代碼中若未實作嚴格的 keys 過濾，惡意請求可能寫入非預期欄位。建議在 PATCH 路由加入白名單過濾邏輯。