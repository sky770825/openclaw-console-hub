# Supabase & SQL 實戰大師課

## 第一章：高效查詢 openclaw_tasks
報表思維的核心在於過濾與聚合。

### 常用 SQL
`sql
-- 統計各狀態任務數量
SELECT status, COUNT(*) 
FROM openclaw_tasks 
GROUP BY status;

-- 查詢過去 7 天失敗的任務
SELECT task_name, error_message 
FROM openclaw_tasks 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '7 days';
``