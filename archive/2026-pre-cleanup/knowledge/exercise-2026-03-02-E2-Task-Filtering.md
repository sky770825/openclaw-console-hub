# 練習 E2：任務過濾與排序 (2026-03-02)

## 題目描述
實作一個函數：輸入任務陣列 [{name, status, priority}]，回傳按 priority 排序（由高到低）且只保留 status=ready 的結果。

## 邏輯實作 (JS)
``javascript
const tasks = [
  {name: 'Low Priority', status: 'ready', priority: 1},
  {name: 'High Priority', status: 'ready', priority: 10},
  {name: 'Done Task', status: 'done', priority: 5},
  {name: 'Mid Priority', status: 'ready', priority: 5}
];

const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);

console.log(result);
``

## 執行結果
1. High Priority (10)
2. Mid Priority (5)
3. Low Priority (1)
(已排除 Done Task)

---
小蔡心跳自主練習記錄