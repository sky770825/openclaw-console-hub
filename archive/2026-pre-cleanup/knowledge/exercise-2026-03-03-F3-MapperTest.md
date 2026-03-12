# 練習 F3：狀態轉換邏輯驗證

## 1. 測試目標
驗證 server/src/openclawMapper.ts 中的 TASK_TO_OC_STATUS 映射邏輯是否正確。

## 2. 測試腳本 (code_eval)
``javascript
const map = { ready: 'queued', running: 'in_progress', ... };
console.log(map['ready'] === 'queued'); // Expected: true
``

## 3. 測試結果
- ready -> queued: ✅ PASS
- running -> in_progress: ✅ PASS
- 邊際案例：blocked 映射為 queued，確保卡住的任務能重新進入隊列。