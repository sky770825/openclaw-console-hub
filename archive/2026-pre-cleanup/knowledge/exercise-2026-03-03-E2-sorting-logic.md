# 練習 E-2：任務過濾與排序邏輯

### 1. 題目
輸入任務陣列，回傳僅 status=ready 且按 priority 降序排序的結果。

### 2. 實作 (code_eval)
``javascript
const tasks = [
  {name:'A',status:'ready',priority:2},
  {name:'B',status:'running',priority:1},
  {name:'C',status:'ready',priority:5},
  {name:'D',status:'pending',priority:3},
  {name:'E',status:'ready',priority:1}
];
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);
console.log(result);
``

### 3. 驗證結果
成功過濾出 A, C, E，並依序為 C(5), A(2), E(1)。