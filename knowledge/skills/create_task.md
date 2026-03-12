# OpenClaw_create_task

## 能力描述
在任務板建立新任務，支援子任務拆解與自動執行設定。

## 輸入參數
- name: 任務標題 (必填)
- description: 詳細執行步驟與預期結果 (必填)
- category: 任務分類 (預設 general)
- auto: 是否允許自動執行 (預設 false)

## 輸出預期
JSON 包含 success, task_id, status (draft)。