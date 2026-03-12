# 練習 E-2：任務過濾與排序邏輯實作

### 1. 目標
實作一個函式，從任務陣列中過濾出狀態為 ready 的任務，並依據 priority 由高到低排序。

### 2. 實作代碼 (JS)
``javascript
const processTasks = (tasks) => {
  return tasks
    .filter(t => t.status === 'ready')
    .sort((a, b) => b.priority - a.priority);
};
`

### 3. 測試結果
輸入：[{name:'A',status:'ready',priority:2},{name:'C',status:'ready',priority:3}] (含其他非 ready 任務)
輸出：[{"name":"C","status":"ready","priority":3},{"name":"A","status":"ready","priority":2}]`