# 練習 E-2：任務過濾與排序邏輯

### 1. 目標
實作一個函式，從任務陣列中篩選出狀態為 ready 的任務，並依照 priority（由高到低）進行排序。

### 2. 實作代碼 (JS)
``javascript
const result = tasks
  .filter(t => t.status === 'ready')
  .sort((a, b) => b.priority - a.priority);
`

### 3. 測試結果
輸入：T1(ready, p3), T2(done, p1), T3(ready, p5), T4(ready, p2)
輸出：T3(p5), T1(p3), T4(p2)

### 4. 結論
成功透過 filter 與 sort` 組合完成任務優先級排程邏輯，此邏輯可直接應用於 Auto-Executor 的任務選取演算法。