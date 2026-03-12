# 練習 E2：任務篩選與排序邏輯

## 1. 邏輯實作
使用 code_eval 驗證任務篩選（status === 'ready'）與優先級排序（priority 降序）。

## 2. 測試代碼
``javascript
const tasks = [
  {name: 'T1', status: 'ready', priority: 3},
  {name: 'T2', status: 'pending', priority: 1},
  {name: 'T3', status: 'ready', priority: 5}
];
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);
console.log(result);
``

## 3. 驗證結果
成功輸出排序後的 ready 任務：T3 (p5), T1 (p3)。