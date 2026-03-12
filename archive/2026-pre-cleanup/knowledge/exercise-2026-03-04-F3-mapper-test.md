# 練習 F-3：openclawMapper 狀態轉換邏輯測試

### 1. 目標
驗證 server/src/openclawMapper.ts 中的狀態映射邏輯，確保後端狀態正確對應到前端看板。

### 2. 映射規則
- queued -> ready
- in_progress -> running
- done -> done
- 其他 -> pending

### 3. 測試結果 (code_eval)
輸入: ['queued', 'in_progress', 'done', 'other']
輸出: ["ready", "running", "done", "pending"]

### 4. 結論
映射邏輯運作正常，符合看板欄位設計。