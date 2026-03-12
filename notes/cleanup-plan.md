# 殭屍任務清理計畫

## 發現問題
1. openclaw_runs 存在 10+ 筆 running 記錄（起始於 2026-03-01）。
2. 導致 Auto-Executor 誤判並發槽位已滿。

## 建議操作
1. 執行 SQL：UPDATE openclaw_runs SET status = 'failed', output_summary = 'Zombie cleanup' WHERE status = 'running' AND created_at < '2026-03-02';
2. 重啟 OpenClaw Server。
3. 將所有 queued 任務統一轉為 ready。