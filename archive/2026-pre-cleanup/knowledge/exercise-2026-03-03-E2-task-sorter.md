# 練習 E-2：任務排序與過濾器

### 1. 實作邏輯
使用 code_eval 執行 JavaScript。利用 filter() 篩選 status === 'ready' 的任務，並使用 sort() 依據 priority 降序排列。

### 2. 代碼範例
``javascript
const result = tasks.filter(t => t.status === 'ready').sort((a, b) => b.priority - a.priority);
``

### 3. 驗證結果
輸入包含 ready(2), done(5), ready(10) 的陣列，輸出正確排序為 ready(10) -> ready(2)。