# 練習題 E2：任務過濾與優先級排序邏輯

## 1. 實作邏輯
輸入一組任務陣列，過濾出 status='ready' 的任務，並按照 priority 從高到低排序。

## 2. 測試代碼 (code_eval)
``javascript
const tasks = [
  {name: 'T1', status: 'ready', priority: 3},
  {name: 'T2', status: 'done', priority: 1},
  {name: 'T3', status: 'ready', priority: 5},
  {name: 'T4', status: 'running', priority: 2}
];
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);
console.log(result);
`

## 3. 執行結果

[
  { "name": "T3", "status": "ready", "priority": 5 },
  { "name": "T1", "status": "ready", "priority": 3 }
]
``