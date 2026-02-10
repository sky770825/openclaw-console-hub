# 任務板執行功能與 Agent 控制 — 透過瀏覽器使用 AI 省 Token

說明兩件事：**讓 Agent 控制任務板（含執行功能）**，以及 **透過瀏覽器使用 ChatGPT / Claude 以節省 Token**。

---

## 一、任務板「執行功能」與 Agent 控制

### 1.1 任務板現況（openclaw-console-hub）

- **中控台**：任務看板、任務列表、執行紀錄（Runs）、Run 詳情、警報等。
- **後端 API**（`server/`）：REST API，例如  
  `GET /api/tasks`、`GET /api/tasks/:id`、`PATCH /api/tasks/:id`、  
  `GET /api/runs`、`GET /api/runs/:id`、  
  `POST /api/tasks/:taskId/run`（**立即執行**）、`POST /api/runs/:id/rerun`（重跑）。
- 目前「執行」是：使用者在中控台點「立即執行」→ 前端呼叫 `POST /api/tasks/:taskId/run` → 後端建立 Run 並模擬執行（約 1.5s）。真實執行引擎可之後接同一 API。

### 1.2 需要什麼：讓 Agent 也能控制任務板

要讓 **Agent 可以控制任務板並觸發執行**，需要 Agent 能呼叫同一套 API：

| 能力 | API | 說明 |
|------|-----|------|
| 看任務列表 | GET /api/tasks | 知道有哪些任務、狀態、優先級 |
| 看某任務 | GET /api/tasks/:id | 任務細節、Goal / Inputs / Outputs / Acceptance |
| 立即執行 | POST /api/tasks/:taskId/run | **觸發該任務執行**，回傳新 Run |
| 重跑 | POST /api/runs/:id/rerun | 依某次 Run 再跑一次 |
| 看執行紀錄 | GET /api/runs、GET /api/runs/:id | 查 Run 狀態、結果、錯誤 |

實作方式建議：

- **方式 A（推薦）**：在 Agent 的 workspace 放一支**小腳本**（例如 `scripts/task-board-api.sh` 或 `task-board-api.js`），用 `curl` 或 `fetch` 打任務板後端（如 `http://localhost:3001`）。Agent 用 **exec** 呼叫該腳本（例如 `list-tasks`、`run-task <taskId>`），即可控制任務板。腳本需支援 base URL 可設（環境變數或參數）。
- **方式 B**：做一個 **OpenClaw Skill**，把上述 API 包成 named tools（如 `task_board_list_tasks`、`task_board_run_task`），Agent 直接呼叫 tool。適合長期、多處使用。
- **方式 C**：若 OpenClaw 內建 **web_fetch** 或可發 HTTP 的 tool，可在 TOOLS.md 寫明任務板 API 的 base URL 與端點，讓 Agent 用該 tool 直接打 API。

**小結**：任務板已有「執行功能」（POST run / rerun），只要 Agent 能呼叫這些 API（腳本或 Skill 或 web_fetch），就能控制任務板並觸發執行。

---

## 二、透過瀏覽器使用 ChatGPT / Claude 以省 Token

### 2.1 概念

- **目前**：OpenClaw 用你設定的模型 API（如 Gemini）處理對話與工具，消耗你的 **API Token**。
- **省 Token 做法**：當問題適合交給 ChatGPT 或 Claude 回答時，改由 **Agent 用瀏覽器** 打開 chat.openai.com 或 claude.ai，在網頁裡輸入問題、取得回答，再把結果整理給老蔡。這樣消耗的是**網頁版訂閱／免費額度**，不是 OpenClaw 這邊的 Token。

### 2.2 流程（Agent 視角）

1. 判斷：這個問題是否適合用「外援 AI」？（例如：單純問答、翻譯、草稿、不需讀 workspace 或執行本機工具）
2. 若適合：用 **browser** 工具（或既有瀏覽器控制技能）打開對應網址（如 https://claude.ai 或 https://chat.openai.com）。
3. 在網頁中輸入問題（打字、送出），等待回覆。
4. 擷取網頁上的回覆內容（snapshot / 讀取文字），整理後回給老蔡。

### 2.3 何時用瀏覽器 AI、何時用本機模型

| 情境 | 建議 |
|------|------|
| 簡單問答、翻譯、寫草稿、不需讀檔案或執行工具 | 可用瀏覽器開 Claude / ChatGPT，省 Token |
| 需要讀 MEMORY、USER、workspace 檔案或執行工具 | 用本機模型（OpenClaw），才能用記憶與工具 |
| 老蔡明確說「用 Claude 網頁」或「用 ChatGPT」 | 照指示用瀏覽器開對應網站 |

### 2.4 注意事項

- **登入狀態**：瀏覽器若已登入 ChatGPT / Claude，Agent 操作的是老蔡的帳號；未登入則可能只能看到登入頁，需先登入或改由本機模型處理。
- **速率與限制**：網頁版有該服務自己的 rate limit 與使用條款。
- **隱私**：問題會經過該站，不適合極敏感內容；敏感時改用本機模型。

已在 **TOOLS.md** 註明 Claude 網頁版可當外援省 Token；可再補上 ChatGPT 與「何時用瀏覽器、何時用本機」的簡短指引。

---

## 三、實作檢查清單

- [ ] **任務板後端**：確認 openclaw-console-hub 的 server 已啟動（如 `http://localhost:3001`），且 CORS 允許 Agent 或腳本呼叫。
- [ ] **Agent 呼叫方式**：在 workspace 提供腳本或 Skill，讓 Agent 能執行「列出任務、觸發執行、查 Run」；base URL 可配置（如環境變數 `TASK_BOARD_API_BASE=http://localhost:3001`）。
- [ ] **TOOLS.md**：寫明任務板 API base URL、可用指令（或端點），以及「用瀏覽器開 Claude / ChatGPT 省 Token」的時機與注意事項。
- [ ] **AGENTS.md（可選）**：一句提醒——需要觸發任務板執行時用腳本/Skill；需要省 Token 且問題適合時，可改用瀏覽器開 Claude / ChatGPT。

---

## 四、一句話總結

- **任務板執行功能**：已有 `POST /api/tasks/:taskId/run` 等 API；讓 Agent **能呼叫這些 API**（腳本或 Skill），就能控制任務板並觸發執行。
- **透過瀏覽器用 AI 省 Token**：Agent 用瀏覽器開 chat.openai.com / claude.ai，在網頁中輸入問題並擷取回覆，消耗網頁版額度而非 OpenClaw Token；適合簡單問答，需記憶或工具時仍用本機模型。

---

## 五、接下來怎麼執行（具體步驟）

### 任務板 + Agent 控制

1. **啟動任務板後端 API**  
   在 openclaw-console-hub 的 server 目錄：
   ```bash
   cd /path/to/openclaw-console-hub-main/server
   npm install   # 若還沒裝
   npm run dev  # 或 npm run build && npm start
   ```
   看到 `OpenClaw API http://localhost:3001` 即表示 API 已啟動。

2. **（可選）啟動任務板前端**  
   若要從瀏覽器看任務看板、執行紀錄：
   ```bash
   cd /path/to/openclaw-console-hub-main
   npm install && npm run dev
   ```
   前端需設定 `VITE_API_BASE_URL=http://localhost:3001` 才會接到上述 API（見專案 `.env` 或 API-INTEGRATION.md）。

3. **讓 Agent 控制任務板**  
   - 在 OpenClaw 對話中對小蔡說：「列出任務板上的任務」或「幫我觸發任務 XXX 執行」。  
   - 小蔡會依 AGENTS.md / TOOLS.md 使用 `scripts/task-board-api.sh`（例如 `list-tasks`、`run-task <id>`）。  
   - 若 API 未啟動，腳本會連線失敗，需先完成步驟 1。

4. **驗證**  
   本機終端可先手動測：
   ```bash
   cd ~/.openclaw/workspace
   ./scripts/task-board-api.sh list-tasks
   ```
   有回傳 JSON 任務列表即表示 API 與腳本都正常。

5. **腳本位置**  
   腳本同時存放在：
   - `~/.openclaw/workspace/scripts/task-board-api.sh`（Agent 使用）
   - `openclaw任務面版設計/scripts/task-board-api.sh`（專案版本控制）
   若需同步，可複製專案版到 workspace。

### 透過瀏覽器用 ChatGPT / Claude 省 Token

- **不需額外啟動**：小蔡已有瀏覽器控制能力時，直接請他「用 Claude 網頁幫我查一下 XXX」或「用 ChatGPT 回答這個問題」即可；他會依 TOOLS.md 開對應網站並操作。
- **注意**：瀏覽器需已登入該站（或小蔡能完成登入），否則可能只能看到登入頁。
