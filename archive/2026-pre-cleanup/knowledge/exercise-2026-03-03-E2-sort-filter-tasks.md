# 練習 E-2：任務篩選與排序邏輯

### 1. 實作代碼
使用 filter 保留 status === 'ready'，並用 sort 按 priority 降冪排序。

### 2. 執行結果
輸入：T1(ready, p3), T2(done, p1), T3(ready, p5), T4(running, p2)
輸出：T3(ready, p5), T1(ready, p3)

### 3. 反思
這是 Auto-Executor "Fast Lane" 策略的基礎邏輯。在高負載時，正確的排序能確保高價值任務優先被執行。