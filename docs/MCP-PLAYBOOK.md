# MCP Playbook (OpenClaw Taskboard)

這份文件用來回答「awesome-mcp-servers 是否有用」以及「GitHub / Supabase(Postgres) / Slack/Telegram / HTTP 都想接」時，怎麼在你這套 OpenClaw 任務板架構下，用 MCP 把能力接進來，且不把安全做爛。

## 核心結論

- **MCP 很有用**：把「讀寫 GitHub、查 DB、發 Slack、打內網 API」變成 agent 可呼叫的工具。
- **但 MCP 不等於穩定**：要靠你做 *權限最小化*、*allowlist*、*超時*、*審計*、*寫入 gate*。
- **OpenClaw 任務板應維持 Source of Truth**：MCP 主要是讓 agent 取得/推動外部資訊，最後仍寫回 taskboard（本 repo 的 `server/`）。

## 建議架構 (務實可維運)

1. **互動式（人跟 agent 對話）**：用 MCP server 讓 agent 直接查 GitHub / Postgres / Slack。
2. **排程式（穩定跑、可重試、可觀測）**：用 n8n 做 orchestration，再呼叫 taskboard API 寫入結果。
3. **任務板統一權限**：所有「會造成狀態改變」的後端 API 都要求 `x-api-key`（本 repo 已有分層 key 邏輯），並把敏感端點列為 admin-only。

## 四類整合怎麼落地

### 1) GitHub (issues/PR -> 任務卡)

**目標輸入**：repo 的 issue/PR、labels、comments、CI 結果  
**目標輸出**：在 taskboard 建立/更新 task、在 GitHub 留 comment / 更新 label / close

落地建議：
- MCP：選一個 GitHub MCP server，使用 **Fine-grained PAT** 或 GitHub App，scope 僅開：
  - 讀：issues、pull requests、checks、contents(read)
  - 寫（可選）：issues comment、labels、PR comment
- taskboard 端：把「同步」做成獨立 automation/task：
  - `GitHub issue #123` -> `Task` 的 `tags` 帶 `github:owner/repo#123`
  - 每次 agent 產生結論：寫回 task `summary/nextSteps/evidenceLinks`，不要貼整段 log

### 2) Supabase / Postgres (查資料、做報表、做稽核)

**目標輸入**：openclaw_* 表（tasks/runs/reviews/audit_logs/...）  
**目標輸出**：dashboard/稽核報告/異常檢測 -> 任務卡、通知

落地建議：
- MCP：用 Postgres MCP server 連到 Supabase（或直連 Postgres）。
- 權限：建立 **read-only role** 給 MCP，避免 agent 寫壞資料。
- 寫入仍走 taskboard API（由 server 端統一驗證/審計）。

### 3) Slack / Telegram (通知與指令)

現況（本 repo）：
- Telegram 通知已在 `server/` 內建（以及一個控制 bot 的 polling 模式）。

落地建議：
- Slack：
  - MCP：先做「send message only」(寫入限制在指定 channel)。
  - 排程/告警：建議走 n8n（可重試、可觀測），agent 只負責產生內容。
- Telegram：
  - 控制 bot 一律 **鎖 chat id**（不要讓任意 chat 控制）。
  - 指令式寫入（例如 /stop）：保持 admin-gated + key 驗證。

### 4) HTTP 通用 (打內網/第三方 API)

目標：讓 agent 能打
- `http://127.0.0.1:3011/api/...`（taskboard）
- n8n webhook
- 其他內部服務

落地建議：
- MCP HTTP 工具一律加 **host allowlist**（和本 repo `server/` 的 `N8N_WEBHOOK_ALLOWLIST` 同概念）。
- 明確區分：
  - read-only calls：允許
  - write calls：需要 `x-api-key`，或在 agent 端要求二次確認

## 安全底線 (真的要做，不然 MCP 只會變成洞)

- Secrets 不落盤、不進 git：只放 env / secret manager。
- 最小權限：GitHub token、DB role、Slack token 都拆出 read-only / write-minimal。
- Allowlist：HTTP 工具、webhook 轉發都只允許白名單 host。
- 超時 + 重試：外部工具都要有 timeout，避免卡住整個 agent。
- Admin gate：例如 `POST /api/emergency/stop-all`、`POST /api/telegram/force-test`、feature flags patch 等，維持 admin-only。

## 推進順序 (建議 1-2 天內可完成一版)

1. **HTTP 通用**：先把「agent 能穩定呼叫 taskboard API」固化（你已經有 `scripts/task-board-api.sh` + API key gate）。
2. **GitHub read-only**：把 issue/PR 摘要進 taskboard（不寫回 GitHub）。
3. **Postgres read-only**：把 daily stats / audit 檢查產生任務卡。
4. **Slack send-only**：把重要告警發 Slack（或先走 n8n）。

---

如果你要我直接「做成可用的 MCP 配置與腳本」：
- 我需要知道你最終跑 MCP 的宿主是哪個（OpenClaw Gateway / Cursor / Claude CLI / 其他）。
- 以及你希望 secrets 放在哪裡（本機 `.env`、launchd env、或雲端 secret）。  

