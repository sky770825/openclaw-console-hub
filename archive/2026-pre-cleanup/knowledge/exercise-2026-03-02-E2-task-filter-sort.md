# 練習 E-2：任務篩選與排序邏輯

### 1. 目標
實作函式篩選 status=ready 並按 priority 降序排列。

### 2. 測試結果
輸入：[{T1,ready,3}, {T2,done,5}, {T3,ready,8}]
輸出：[{T3,ready,8}, {T1,ready,3}]
邏輯驗證通過。

### 3. 結論
使用 Array.prototype.filter 與 sort 組合可簡潔達成任務調度優先級排序。