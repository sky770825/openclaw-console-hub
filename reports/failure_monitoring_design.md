# OpenClaw 錯誤監聽與自動化分析設計說明

## 1. 監聽點識別 (Observation Points)
- **Supabase Realtime**: 監聽 `tasks` 資料表的 UPDATE 事件，當 `status` 變更為 'failed' 時觸發。
- **Webhook**: 在後端代碼 (`server/src/services/taskService.ts`) 的 catch 區塊中，直接調用分析腳本。
- **定期掃描 (Polling)**: 使用 Cronjob 每分鐘掃描一次狀態為 'failed' 且尚未生成報告的任務。

## 2. 自動化流程
1. 系統偵測到任務失敗。
2. 提取 `task_id`, `error_message`, `logs`。
3. 執行 `scripts/trigger_failure_analysis.sh`。
4. 生成 Markdown 報告至 `learnings/` 目錄。

## 3. 整合建議
建議將 `trigger_failure_analysis.sh` 的調用整合進 OpenClaw 的內部 Event Emitter 系統。
