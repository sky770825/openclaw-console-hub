# 專案備忘與記憶

> 供 AI 與團隊參考的關鍵資訊。對話時可 @ 此檔取得上下文。

---

## OpenClaw 任務板整合

- **任務板**：openclaw-console-hub（`/cursor` 路由）
- **預設使用此任務板**：不使用 Trello。需在 OpenClaw workspace 建立 Skill（`~/.openclaw/workspace/skills/openclaw-taskboard/SKILL.md`）並在 AGENTS.md 註明
- **API**：`GET/POST /api/openclaw/tasks`、`POST /api/openclaw/tasks/:id/run`、`POST /api/openclaw/run-next`、`DELETE /api/openclaw/tasks/:id`
- **Telegram 指令範例**：「到任務板執行排隊中的任務」「查看任務狀態」

---

## Telegram Bot @xiaoji_cai_bot

- **火幣網收費錢包**：USDT TRC20 `TALc5eQifjsd4buSDRpgSiYAxUpLNoNjLD`
- **邀請連結**：https://www.htx.com/invite/zh-tc/1f?invite_code=qkfma223
- **邀請碼**：qkfma223
- **指令說明**：可中文化（@BotFather setcommands），指令本身僅能英文

---

## OpenClaw Skill（Telegram → 任務板）

- **Skill 檔案**：`docs/openclaw-taskboard-skill/SKILL.md`
- **安裝說明**：`docs/openclaw-taskboard-skill/README.md`
- 需複製到 `~/.openclaw/workspace/skills/openclaw-taskboard/` 並設定 `OPENCLAW_TASKBOARD_URL`

---

## 重啟 OpenClaw Gateway

- **UI 按鈕**：任務板 Header 的「↻ Reset Gateway」— 點擊後由後端自動執行
- **邏輯**：優先 `openclaw gateway restart`（launchd/systemd）；若無服務則 pkill + spawn 背景啟動
- **API**：`POST /api/openclaw/restart-gateway`
- **手動腳本**：`bash scripts/restart-openclaw-gateway.sh`（終端直接執行用）

---

## n8n 串接（Zeabur）

- **設定**：`.env` 加入 `N8N_API_URL`、`N8N_API_KEY`（n8n 設定 → n8n API 建立）
- **API**：`GET /api/n8n/health`、`GET /api/n8n/workflows`、`POST /api/n8n/trigger-webhook`
- **說明**：[N8N-INTEGRATION.md](./N8N-INTEGRATION.md)
- **工作流設計**：[N8N-WORKFLOW-DESIGN.md](./N8N-WORKFLOW-DESIGN.md) — 排程、Telegram、Webhook 等流程設計

---

## 相關文件

- [OPENCLAW-INTEGRATION.md](./OPENCLAW-INTEGRATION.md) — API 串接與自動化
- [OPENCLAW-ACTION-MAP.md](./OPENCLAW-ACTION-MAP.md) — data-oc-action 對照表
- [SCRIPTS-BUTTONS-AUDIT.md](./SCRIPTS-BUTTONS-AUDIT.md) — 腳本與按鈕稽核
- [N8N-INTEGRATION.md](./N8N-INTEGRATION.md) — n8n 串接
- [openclaw-taskboard-skill/README.md](./openclaw-taskboard-skill/README.md) — Skill 安裝步驟
