# 練習 E-5：任務狀態機邏輯實作

### 1. 目標
實作一個簡易狀態機，限制任務只能按 pending -> ready -> running -> done 順序轉換。

### 2. 實作代碼
``javascript
const stateMachine = (current, target) => {
  const validTransitions = {
    'pending': 'ready',
    'ready': 'running',
    'running': 'done'
  };
  return validTransitions[current] === target;
};
`

### 3. 驗證結果
透過 code_eval 測試：
- pending -> ready: 成功 (true)
- pending -> done`: 失敗 (false)

證實邏輯能有效攔截非法狀態跳轉，確保任務生命週期的嚴謹性。