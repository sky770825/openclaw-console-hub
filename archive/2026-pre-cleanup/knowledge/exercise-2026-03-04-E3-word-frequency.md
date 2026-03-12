# 練習 E-3：文字頻率統計實作

### 1. 目標
實作一個函數統計字串中單字出現次數。測試輸入為 health API 的模擬回傳。

### 2. 實作代碼 (JavaScript)
``javascript
const text = 'health status: ok, version: 2.4.1, uptime: 21329, status: ok';
const words = text.toLowerCase().match(/\w+/g);
const freq = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
console.log(freq);
`

### 3. 驗證結果
經 code_eval` 執行，成功統計單字頻率。例如 'status' 與 'ok' 各出現 2 次。證明對基礎資料處理與 Map-Reduce 邏輯的掌握。