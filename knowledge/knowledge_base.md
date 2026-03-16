# 小蔡助理知識庫

供 ollama_bot2 注入到 system prompt，強化回答準確度。可編輯此檔新增知識。

---

## 任務板

### openclaw任務面版設計（本專案）
- 前端：`npm run dev`，port 3009
- 後端：`cd server && PORT=3011 npm run dev`，port 3011（Vite proxy 轉發 /api、/ws）
- 根網址：留空 VITE_API_BASE_URL 時用同源（經 proxy）

### openclaw-console-hub
- 後端 API 預設 port：3009 或 3010，根網址可設 `TASK_BOARD_API_BASE`
- 腳本：`scripts/task-board-api.sh` 或 `~/.openclaw/workspace/scripts/task-board-api.sh`
- 指令：list-tasks（列任務）、get-task <id>、run-task <taskId>（執行）、list-runs、get-run <id>、rerun <runId>、add-task、update-task
- 啟動 API：`cd openclaw-console-hub-main/server && npm run dev`

---

## OpenClaw

- 設定檔：`~/.openclaw/openclaw.json`
- 預設模型：`agents.defaults.model.primary`（如 ollama/llama3.2、ollama/mistral、google/gemini-2.5-flash）
- Gateway：`launchctl bootout gui/501/ai.openclaw.gateway` 再 `launchctl bootstrap gui/501 ~/Library/LaunchAgents/ai.openclaw.gateway.plist` 可重啟
- 日誌：`~/.openclaw/logs/gateway.err.log`
- 檢查：`openclaw status`、`openclaw doctor`

---

## Ollama

- 本機 API：`http://127.0.0.1:11434`
- 檢查是否在跑：`curl -s http://127.0.0.1:11434/api/tags` 有 JSON 即正常
- 沒在跑時：開 Ollama app 或執行 `ollama serve`
- 常用模型：qwen3:8b、llama3.2:latest、mistral、qwen2.5:7b、qwen2.5:14b、deepseek-r1:8b
- ollama_bot2 重啟：`launchctl bootout gui/501/ai.ollama.bot2` 再 `launchctl bootstrap gui/501 ~/Library/LaunchAgents/ai.ollama.bot2.plist`
- 在 Telegram 對 ollama_bot2 輸入「openclaw gateway restart」或「openclaw gateway 重啟」可觸發 Gateway 重啟；輸入「stop openclaw」、「openclaw stop」、「停止 openclaw」或「/stop openclaw」可停止 Gateway（需 ALLOWED_USER_IDS 權限）

---

## 常見排查

- Bot 沒回應：先確認 Ollama 有跑（curl /api/tags）；本機模型較慢，可等十幾秒或換 mistral
- 私訊要配對：dmPolicy 為 pairing 時，新用戶需 `openclaw pairing approve telegram <code>`
- 群組需 @ 提及 bot 才會回
- 主模型 429 會 fallback 到 Ollama，可能等 1–2 分鐘

---

## 路徑與專案

- 專案目錄：`/Users/caijunchang/openclaw任務面版設計`
- OpenClaw workspace：`~/.openclaw/workspace`
- 詳細說明在 `docs/` 目錄
