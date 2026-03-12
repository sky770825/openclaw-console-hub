# 練習題 E2：任務排序與過濾

## 題目內容
輸入任務陣列 [{name, status, priority}]，回傳按 priority 排序（由高到低）且只保留 status=ready 的結果。

## 實作代碼
``javascript
const tasks = [
  { name: 'A', status: 'ready', priority: 2 },
  { name: 'B', status: 'running', priority: 1 },
  { name: 'C', status: 'ready', priority: 5 },
  { name: 'D', status: 'pending', priority: 3 }
];
const filterAndSort = (arr) => arr.filter(t => t.status === 'ready').sort((a, b) => b.priority - a.priority);
console.log(filterAndSort(tasks));
``

## 驗證結果
成功過濾出 status 為 ready 的任務 'C' (priority 5) 與 'A' (priority 2)，並正確降序排列。