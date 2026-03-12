# OpenClaw_update_task

## 能力描述
更新現有任務狀態，並記錄執行結果摘要，是任務閉環的關鍵。

## 輸入參數
- id: 任務唯一編號 (必填)
- status: 新狀態 (done/failed/blocked)
- result: 執行結果詳細摘要 (必填)

## 輸出預期
JSON 包含 success, task_id, updated_at。