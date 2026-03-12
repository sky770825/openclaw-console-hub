# Bug Report: create_task 失敗

- *時間*: 2026-03-05
- *現象*: 執行 create_task action 失敗。
- *錯誤訊息*: existing.find is not a function
- *初步分析*: 後端處理 create_task 的邏輯中，預期一個變數 (existing) 是陣列，但實際收到了非陣列型別，導致呼叫 .find() 方法時出錯。這可能是 API 資料處理或資料庫查詢的回傳格式問題。
- *重要度*: high (核心功能失效)