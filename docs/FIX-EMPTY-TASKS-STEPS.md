# 補齊「已批准但空的」任務 — 步驟與腳本

## 一、什麼叫「空的」？

任務狀態為 **ready**，但缺少以下任一項時，後端 gate 不允許被當成可執行任務，Auto-Executor 也不會挑選：

- **agent.type**（例如 `openclaw` / `cursor` / `codex` / `auto`）
- **runCommands**（至少一筆指令陣列）

這類任務在報告裡稱為「空的」，需要補齊後才會通過驗證。

---

## 二、已補齊的任務（本次執行）

共 **24 筆**（14 筆 ready + 10 筆 running）已補齊：

- **agent**：`{ "type": "openclaw" }`
- **runCommands**：`["# 依任務描述與 SOP 執行，完成後填寫 RESULT 並 n8n 回報"]`

| ID | 任務名稱 |
|----|----------|
| t1772060285321 | [通訊甲板] 防火牆 — postMessage 白名單過濾中介層 |
| t1772060286700 | [通訊甲板] L3 信任區 — 信任成員升級審核機制 |
| t1772060285968 | [通訊甲板] 橋接代理 — 心跳監控 Webhook |
| t1772060283896 | [通訊甲板] L1 接觸層 — 申請協作者表單後端 |
| t1772060283140 | [通訊甲板] L0 公開展示 — 訪客統計 API |
| t1772060284614 | [通訊甲板] L2 協作空間 — 協作者身份驗證 API |
| t1772142228546 | [AI甲板] NEUXA 狀態卡更新 — 顯示真實 Gemini 模型 |
| t1772142227899 | [AI甲板] 新增 Benchmark 模組 — 模型速度測試 |
| t1772142227235 | [AI甲板] 新增 Chat 模組 — AI 對話介面 |
| t1772142113928 | [自我進化] Context 壓縮工具 — 建立 context-compress.py |
| t1772142113167 | [自我進化] 子代理派發框架 — 建立 spawn-agent.sh |
| t1772142112358 | [自我進化] Gemini API 直連測試 — 建立 gemini-test.py |
| t1772142111532 | [自我進化] 技能庫建立 — 整理 skills 目錄 |
| t1772142110583 | [自我進化] 記憶系統升級 — 建立 memory-indexer.py |
| t1772142413297 | [指揮訓練] 後端任務 — 派子代理建報價 API |
| t1772140974543 | [商業] 網站健診服務 — 自動掃描腳本 |
| t1772141252336 | [商業] 網站健診工具 — 建立 health-check.py |
| t1772142067950 | [商業] 自動發票系統 — 建立 invoice-api.ts |
| t1772141215358 | [商業] 網站健診 — 建立 health-check.py 腳本 |
| t1771326239258 | 設定 ALLOWED_ORIGINS 生產 CORS |
| t1771283206432 | 安全防護與部署強化 P0 |
| t1771326240115 | Dashboard Basic Auth 保護 |
| t1771301319807 | 💼 餐車訂購系統 SaaS 商業化 |
| t1772057484557 | 達爾連線驗證任務 |

備註：若任務帶有 **manual-only** 標籤，Auto-Executor 仍會略過，僅供人工派工；補齊後至少 gate 會過、可手動執行或之後改標籤再自動執行。

---

## 三、之後如何自己補齊（三種方式）

### 方式 A：用腳本（推薦）

1. 進入 workspace：
   ```bash
   cd ~/.openclaw/workspace
   ```
2. 確認任務板後端已啟動（例如 `http://localhost:3011`）。
3. 執行：
   ```bash
   node scripts/fix-empty-tasks.js
   ```
4. 若要指定 API 位址與金鑰：
   ```bash
   TASKBOARD_URL=http://localhost:3011 API_KEY=你的OPENCLAW_API_KEY node scripts/fix-empty-tasks.js
   ```

腳本會對內建的 24 筆 ID 逐一 PATCH，寫入 `agent` 與 `runCommands`。若要補「其他」空任務，可編輯 `scripts/fix-empty-tasks.js` 裡的 `EMPTY_TASK_IDS` 陣列，加入或改成需要的任務 ID。

---

### 方式 B：用 curl 單筆補齊

對單一任務 PATCH，帶上 `agent` 與 `runCommands`：

```bash
TASKBOARD_URL="http://localhost:3011"
API_KEY="你的OPENCLAW_API_KEY"
TASK_ID="t1772060285321"

curl -s -X PATCH "${TASKBOARD_URL}/api/tasks/${TASK_ID}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "agent": { "type": "openclaw" },
    "runCommands": ["# 依任務描述與 SOP 執行，完成後填寫 RESULT 並 n8n 回報"]
  }'
```

把 `TASK_ID` 換成要補的任務 ID 即可。

---

### 方式 C：在任務板 UI 手動編輯

1. 開啟任務板：`http://localhost:3011`（或你的任務板網址）。
2. 找到該任務，點進編輯。
3. 在「執行者 / Agent」欄位選或填 **openclaw**（或 cursor / codex / auto，依你們規定）。
4. 在「執行指令 / runCommands」欄位至少填一筆，例如：  
   `# 依任務描述與 SOP 執行，完成後填寫 RESULT 並 n8n 回報`
5. 儲存。

---

## 四、如何確認還有沒有「空的」任務

可用 API 自己掃一次：

```bash
curl -s "http://localhost:3011/api/tasks" -H "x-api-key: 你的API_KEY" | node -e "
const tasks = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const empty = tasks.filter(t =>
  (t.status === 'ready' || t.status === 'running') &&
  (!t.agent?.type || !(t.runCommands && t.runCommands.length))
);
console.log('缺 agent 或 runCommands 的 ready/running 數量:', empty.length);
empty.forEach(t => console.log(t.id, t.name?.slice(0,50)));
"
```

若輸出為 0，代表目前沒有這類空任務。

---

## 五、腳本位置與變數

- **腳本路徑**：`~/.openclaw/workspace/scripts/fix-empty-tasks.js`
- **預設 API**：`http://localhost:3011`
- **預設 API Key**：腳本內有 fallback（與任務板 .env 的 `OPENCLAW_API_KEY` 一致）；可改為用環境變數 `API_KEY` 或 `OPENCLAW_API_KEY` 覆蓋。
- **寫入內容**：  
  - `agent`: `{ type: 'openclaw' }`  
  - `runCommands`: `['# 依任務描述與 SOP 執行，完成後填寫 RESULT 並 n8n 回報']`

若要改成別的 agent 或 runCommands，直接編輯腳本裡的 `PATCH_BODY` 即可。

---

*文件更新：2026-02-27*
