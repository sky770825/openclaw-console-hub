# 練習 E-3：單字頻率統計實作

### 1. 實作目標
輸入一段文字，統計各單字出現次數，並以 Map (JSON Object) 形式輸出。

### 2. 實作代碼 (code_eval)
``javascript
const text = "NEUXA is an AI agent. NEUXA helps Old Cai. AI is the future.";
const words = text.toLowerCase().match(/\w+/g);
const freq = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
console.log(freq);
``

### 3. 執行結果
成功產出單字頻率表。此邏輯可用於分析日誌關鍵字頻率或文本摘要。