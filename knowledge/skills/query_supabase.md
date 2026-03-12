# OpenClaw_query_supabase

## 能力描述
安全查詢系統資料庫，獲取任務、執行記錄或記憶。

## 輸入參數
- table: 資料表名稱 (必填)
- select: 欄位篩選 (預設 *)
- filters: 查詢條件 JSON 陣列
- limit: 筆數限制 (上限 100)

## 輸出預期
資料列陣列 JSON。