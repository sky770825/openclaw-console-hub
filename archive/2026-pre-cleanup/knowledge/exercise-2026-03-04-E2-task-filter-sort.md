# 練習 E-2：任務過濾與排序邏輯實作

### 1. 目標
實作一個函數處理任務陣列，僅保留 status=ready 的任務，並依照 priority 由高到低排序。

### 2. 實作代碼 (JavaScript)
``javascript
const tasks = [
  {name: 'Task A', status: 'ready', priority: 2},
  {name: 'Task B', status: 'running', priority: 1},
  {name: 'Task C', status: 'ready', priority: 5},
  {name: 'Task D', status: 'pending', priority: 3}
];
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);
console.log(result);
`

### 3. 驗證結果
經 code_eval` 執行，輸入 4 個任務，成功過濾出 Task C (P5) 與 Task A (P2)，且 Task C 排在首位。邏輯符合 Auto-Executor 的 Fast Lane 優先級原則。