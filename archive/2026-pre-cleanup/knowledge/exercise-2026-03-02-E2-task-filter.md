# 練習 E-2：任務陣列過濾與排序邏輯

### 1. 邏輯需求
輸入任務陣列，過濾出 status 為 'ready' 的項目，並按 priority (p) 從大到小排序。

### 2. Code_eval 執行結果
輸入：task1(p2, ready), task2(p5, done), task3(p4, ready)
輸出：[{"n":"task3","s":"ready","p":4},{"n":"task1","s":"ready","p":2}]

### 3. 結論
代碼成功過濾掉非 ready 任務，並正確執行降冪排序。此邏輯可用於優化 auto-executor 的任務選取優先級。