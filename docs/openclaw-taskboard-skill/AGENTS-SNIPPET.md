# 將以下內容加入 ~/.openclaw/workspace/AGENTS.md

---

## 任務管理（必讀）

- **預設使用 OpenClaw 任務板**（openclaw-console-hub），不使用 Trello。
- 當使用者透過 Telegram、WebChat 等管道說「建立任務」「新增任務」「執行任務」「查看任務」時，使用 `openclaw-taskboard` Skill 呼叫任務板 API。
- **緊急終止**：當使用者說「/stop」「/stop all」「停止」「緊急終止」時，呼叫 `POST {base}/api/emergency/stop-all` 或 `POST {base}/api/emergency/stop-command` 立即終止執行中的任務。
- API Base URL 來自 `OPENCLAW_TASKBOARD_URL`（例如 http://localhost:3011 或正式環境網址）。
