# 將以下內容加入 ~/.openclaw/workspace/AGENTS.md

---

## 任務管理（必讀）

- **預設使用 OpenClaw 任務板**（openclaw-console-hub），不使用 Trello。
- 當使用者透過 Telegram、WebChat 等管道說「建立任務」「新增任務」「執行任務」「查看任務」時，使用 `openclaw-taskboard` Skill 呼叫任務板 API。
- API Base URL 來自 `OPENCLAW_TASKBOARD_URL`（例如 http://localhost:3001 或正式環境網址）。
