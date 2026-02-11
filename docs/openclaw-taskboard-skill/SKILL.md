---
name: openclaw-taskboard
description: 使用 OpenClaw 任務板管理任務、審核、自動化與進化紀錄。當使用者說「建立任務」「新增任務」「執行任務」「任務列表」「批准審核」等，透過 API 寫入並操作任務板。預設使用此任務板，不使用 Trello。需設定 OPENCLAW_TASKBOARD_URL。
---

# OpenClaw 任務板 Skill

## 觸發句型

- **建立／新增任務**：「建立任務」「新增任務」「加一個任務」「幫我記一個任務」「Create task」「Add task」或明確描述要做的事。
- **列出任務**：「任務列表」「有什麼任務」「任務狀態」「查看任務」。
- **執行任務**：「執行任務」「跑任務」「執行下一個」「run task」「run next」或指定任務 ID（如「執行任務 t3」）。
- **審核**：「批准審核」「駁回審核」「待審核項目」。
- **刪除任務**：「刪除任務 xxx」。

## API Base

從環境變數 `OPENCLAW_TASKBOARD_URL` 讀取，例：本機 `http://localhost:3001`，正式 `https://你的網域`。寫入時依後端設定帶 `x-api-key`。

## 常用端點（精簡）

| 操作 | 方法 | 路徑 |
|------|------|------|
| 列出任務 | GET | `{base}/api/openclaw/tasks` |
| 建立任務 | POST | `{base}/api/openclaw/tasks` |
| 更新任務 | PATCH | `{base}/api/openclaw/tasks/:id` |
| 刪除任務 | DELETE | `{base}/api/openclaw/tasks/:id` |
| 執行任務 | POST | `{base}/api/openclaw/tasks/:id/run` |
| 執行下一個 | POST | `{base}/api/openclaw/run-next` |
| 審核列表 | GET | `{base}/api/openclaw/reviews` |
| 進化紀錄 | GET | `{base}/api/openclaw/evolution-log` |

**建立任務 Body（JSON）**：`name` 或 `title`、`tags`（如 `["learn"]`）、`status`（如 `"ready"`）、可選 `subs`（`[{t:"子任務",d:false}]`）。

## 深入規格（Progressive disclosure）

- **完整 API 與同步關係**：見 [references/api.md](references/api.md)。
- **Supabase 表結構**：見 [references/schema.md](references/schema.md)。
- **模組邊界與程式碼對照**：見 [references/modules.md](references/modules.md)。

## 實作方式

使用 `fetch` 或 `curl` 呼叫上述 API，Content-Type: application/json。回應：建立成功回覆「已建立任務：{title}」；執行成功回覆「已觸發執行任務 {id}」；列表則簡要列出標題與狀態。
