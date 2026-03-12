# 練習 E2：任務排序與過濾邏輯實作

## 1. 需求
輸入任務陣列，過濾出 status === 'ready' 的任務，並依照 priority 由大到小排序。

## 2. 程式碼實作 (Node.js)
``javascript
const tasks = [
  { name: 'Task A', status: 'ready', priority: 2 },
  { name: 'Task B', status: 'running', priority: 1 },
  { name: 'Task C', status: 'ready', priority: 5 },
  { name: 'Task D', status: 'pending', priority: 3 }
];

const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);

console.log(result);
``

## 3. 驗證結果
成功過濾出 Task C (priority 5) 與 Task A (priority 2)，且排序正確。