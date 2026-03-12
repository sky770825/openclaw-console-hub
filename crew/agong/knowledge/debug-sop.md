# 阿工專屬 — 除錯 SOP
> 你是阿工（🔧 工程師），不是小蔡，這是你的專屬知識庫

---

## 除錯黃金流程：定位 → 重現 → 修復 → 驗證

每次接到 bug / 告警，固定走這個流程，不要跳步驟。

---

## 第一步：定位（Root Cause Analysis）

### 1.1 收集錯誤資訊
```json
{"action":"run_script","script":"tail -100 ~/.openclaw/automation/logs/taskboard.log | grep -i 'error\\|warn\\|fail'"}
```

### 1.2 讀完整 stack trace
找到錯誤後，往上看 10-20 行，找到完整的 call stack：
```json
{"action":"run_script","script":"grep -B 20 '具體錯誤訊息' ~/.openclaw/automation/logs/taskboard.log | tail -30"}
```

### 1.3 定位到源碼
從 stack trace 找到檔案和行號，用 read_file 看代碼：
```json
{"action":"read_file","path":"~/Downloads/openclaw-console-hub-main/server/src/某檔案.ts"}
```

### 1.4 查看相關代碼上下文
```json
{"action":"grep_project","pattern":"出問題的函數名","path":"server/src/"}
{"action":"find_symbol","symbol":"函數名","path":"server/src/"}
```

---

## HTTP 錯誤排查速查表

### 500 Internal Server Error
**最常見原因**：
1. **未捕獲的異常** — 某個 async 函數沒有 try-catch
2. **Supabase 查詢失敗** — 資料表不存在 / 欄位名錯
3. **JSON parse 失敗** — req.body 格式不對
4. **undefined 存取** — `obj.prop.subprop` 其中 `obj.prop` 是 undefined

**排查步驟**：
```
1. 找到具體的 500 回應 log
2. 看 stack trace → 定位到哪一行
3. read_file 看那段代碼
4. 確認是否有 try-catch
5. 確認 Supabase 查詢的表名和欄位是否正確
6. patch_file 修復
```

**快速修復模板**（加 try-catch）：
```typescript
// 修復前
app.get('/api/xxx', async (req, res) => {
  const data = await supabase.from('table').select('*');
  res.json(data);
});

// 修復後
app.get('/api/xxx', async (req, res) => {
  try {
    const data = await supabase.from('table').select('*');
    res.json(data);
  } catch (err) {
    console.error('[GET /api/xxx] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 404 Not Found
**常見原因**：
1. 路由沒有註冊（`app.use` 沒加）
2. 路由路徑拼錯
3. HTTP method 不對（GET vs POST）
4. 中間件攔截了

**排查步驟**：
```
1. 確認請求的 URL 和 method
2. grep_project 搜路由定義：grep "api/xxx" server/src/
3. 確認 index.ts 有 app.use 這個 router
4. 檢查 authMiddleware 是否擋了
```

### 408 Timeout / ETIMEDOUT
**常見原因**：
1. 外部 API 回應太慢（Supabase / Telegram / Gemini）
2. 大量數據處理沒有分頁
3. 死迴圈或無限遞迴
4. 資料庫查詢太慢（缺索引）

**排查步驟**：
```
1. 確認是哪個請求 timeout
2. 看那段代碼有沒有 await 外部 API
3. 加 timeout 保護：AbortController 或 Promise.race
4. 大查詢加 limit/分頁
```

### 401 / 403 認證失敗
**常見原因**：
1. API Key 沒帶或帶錯
2. Bearer token 格式不對
3. Key 過期或被撤銷
4. authMiddleware 邏輯問題

**排查步驟**：
```
1. 確認請求有帶 Authorization header
2. 確認 key 格式：Bearer oc-xxx
3. 讀 server/src/middlewares/ 看 auth 邏輯
4. 確認 .env 裡的 key 和請求用的一致
```

### 429 Rate Limited
**常見原因**：
1. 請求太頻繁（express-rate-limit 擋的）
2. 外部 API 限速（Telegram / Gemini）
3. ActionCircuitBreaker 觸發

**排查步驟**：
```
1. 確認是哪個服務限速
2. 本地限速 → 看 index.ts 的 rateLimit 設定
3. 外部限速 → 加 retry + 延遲
4. CircuitBreaker → 等冷卻或調整閾值
```

---

## Root Cause Analysis 五問法

遇到任何 bug，連問 5 個「為什麼」：

```
問題：API 回傳 500
→ 為什麼 500？因為 TypeError: Cannot read property 'id' of undefined
→ 為什麼 undefined？因為 Supabase 查詢回傳空陣列
→ 為什麼空陣列？因為查詢條件的 user_id 是 null
→ 為什麼 null？因為 req.body 沒帶 userId
→ 為什麼沒帶？因為前端表單漏了這個欄位

根本原因：前端表單缺少 userId 欄位
修復方案：前端加欄位 + 後端加參數驗證
```

---

## 修復後驗證清單

- [ ] 修復代碼 TypeScript 編譯通過（`npx tsc --noEmit`）
- [ ] 本地 build 通過（`npm run build`）
- [ ] 手動測試 API 確認修復（`curl` 測試）
- [ ] 確認沒有引入新問題（檢查相關功能）
- [ ] 通知小蔡 push

**測試 API 指令**：
```json
{"action":"run_script","script":"curl -s http://localhost:3011/api/health"}
{"action":"run_script","script":"curl -s -H 'Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1' http://localhost:3011/api/tasks | head -50"}
```

---

## 緊急搶修流程（P0 事件）

```
1. 確認問題（curl health check）
2. 讀 log 最後 50 行
3. 找到 root cause
4. patch_file 最小修復（只改必要的）
5. 確認 TypeScript 編譯通過
6. 通知小蔡立刻 push + build + 重啟
7. 驗證修復
8. 寫修復紀錄到自己筆記
```
