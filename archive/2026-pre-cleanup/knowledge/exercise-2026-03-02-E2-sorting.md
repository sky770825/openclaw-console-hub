# 練習 E-2：任務篩選與排序邏輯

### 1. 題目要求
寫一個函數輸入任務陣列，回傳按 priority 降序排序且 status 為 ready 的任務。

### 2. 程式碼實現 (code_eval)
``javascript
const tasks = [
  {name: 'T1', status: 'ready', priority: 3},
  {name: 'T2', status: 'done', priority: 1},
  {name: 'T3', status: 'ready', priority: 5},
  {name: 'T4', status: 'pending', priority: 2}
];
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);
console.log(result);
`

### 3. 執行結果
回傳：[{"name":"T3","status":"ready","priority":5},{"name":"T1","status":"ready","priority":3}]`。邏輯驗證正確。