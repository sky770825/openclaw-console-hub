# SOP：網站商家部署（OpenCart 範例）- 小蔡指揮 Codex + Cursor 的標準流程

更新日期：2026-02-15  
適用範圍：商家網站/電商站部署、改版、維運（以 OpenCart 為例；可套用到 WordPress/WooCommerce/Shopify 自建替代方案）  
目標：把「一個任務」拆成可執行、可驗收、可回滾、可追溯的工作流，讓 AI 與 AI agent 之間用同一套語言協作，並避免 context 爆炸。

---

## 0) 核心原則（一定要遵守）

### 0.1 SSoT（Single Source of Truth）
1. **任務卡只存索引級資訊**（summary / nextSteps / evidenceLinks / projectPath / runPath / idempotencyKey）。  
2. **全量輸出一律落地寫檔**：  
   - `projects/<project>/runs/<YYYY-MM-DD>/<run_id>/RESULT.md`  
   - `projects/<project>/runs/<YYYY-MM-DD>/<run_id>/ARTIFACTS/`

原因：Telegram/對話只做索引，避免把整份規劃與長輸出塞進對話導致爆 context。

### 0.2 任務卡「Ready 合規門檻」（否則不要讓它進 ready）
當任務狀態要進 `ready` 時，必填欄位（後端會強制）：  
- `projectPath`
- `agent.type`
- `riskLevel`
- `rollbackPlan`
- `acceptanceCriteria[]`
- `deliverables[]`
- `runCommands[]`
- `modelPolicy`
- `executionProvider`
- `allowPaid`（boolean）

參考實作：`server/src/taskCompliance.ts`

### 0.3 冪等（Idempotency）
- 每次「執行」都要有 `run_id`，並建立 `idempotencyKey = <task_id>:<run_id>`。  
- 任務重跑 = 建新 run，而不是覆蓋舊 run 的輸出。

### 0.4 成本策略（預設省錢）
1. 預設走訂閱路徑：`Codex` / `Cursor`（subscription） + `OpenClaw/Ollama`（local）。  
2. `allowPaid=false` 代表**非必要不觸發按量付費 API**。  
3. 若必須用付費模型/外部 API，任務卡需明確寫：用途、上限、回滾、驗收。

---

## 1) 角色分工（AI-to-AI 溝通橋樑）

### 小蔡（Supervisor / Controller）
- 只做：分解任務、指派 agent、檢查合規欄位、控風險、控成本、控節奏。
- 不做：長文回覆、把 RESULT.md 全貼回對話、當回覆窗口。

### Codex（後端/架構/研究/整合）
- 做：架構設計、後端 API、資料整合、部署腳本、可重現的方案。
- 產出：`RESULT.md + ARTIFACTS/`，並將索引級摘要寫回任務卡（progress writeback）。

### Cursor（前端/UI/可用性/落地改碼）
- 做：UI 改版、表單、管理後台、可視化監控頁、流程導引。
- 產出：同上（寫檔 + 索引級 writeback）。

### Ollama（本地整理/報告/索引助手）
- 做：把 Codex/Cursor 的長輸出整理成「任務卡摘要」「nextSteps」「檔案索引」。
- 不做：當主要決策者（避免品質與安全風險）。

---

## 2) Projects / Runs 路徑規範（統一到系統現行結構）

### 2.1 固定工作區（projectPath）
**固定**：`projects/<project>/modules/<module>/`

OpenCart 部署建議命名：  
- `<project>`：商家/品牌代號（例：`zhushang-yangmei`）  
- `<module>`：系統子模組（例：`opencart-deploy`、`crm-sync`、`line-bot`、`admin-ui`）

例：  
`projectPath = projects/zhushang-yangmei/modules/opencart-deploy/`

### 2.2 每次執行輸出（runPath）
**固定**：`projects/<project>/runs/<YYYY-MM-DD>/<run_id>/`  
其中：  
- `RESULT.md = <runPath>/RESULT.md`  
- `ARTIFACTS/ = <runPath>/ARTIFACTS/`

> 注意：`runPath` 是「執行的落地路徑」，不是 module 路徑。

---

## 3) 任務卡格式（小蔡建立任務時要填）

### 3.1 最小可執行任務卡（建議 12 欄 + 可選欄）
必填（Ready gate）：  
- `projectPath`
- `agent.type`
- `riskLevel`
- `rollbackPlan`
- `acceptanceCriteria[]`
- `deliverables[]`
- `runCommands[]`
- `modelPolicy`
- `executionProvider`
- `allowPaid`

建議補充（提高可執行性）：  
- `taskType`：`research | development | ops | review`
- `complexity`：`S|M|L|XL`
- `tags`：包含至少一個 `domain:<slug>`（利於檢索與分流）
- `timeoutConfig`：timeout / maxRetries / fallbackStrategy

### 3.2 小蔡建立任務（HTTP 指令模板）
> 目標：讓小蔡可以「只靠一段 JSON」就把任務卡建到可執行狀態。

```bash
curl -sS -X POST http://127.0.0.1:3011/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "OpenCart 商家站部署：環境建立 + 安裝 + 基本設定",
    "status": "ready",
    "owner": "小蔡",
    "priority": 1,
    "scheduleType": "manual",
    "tags": ["domain:ecommerce", "opencart", "deploy"],

    "projectPath": "projects/zhushang-yangmei/modules/opencart-deploy/",
    "agent": { "type": "codex" },
    "riskLevel": "medium",
    "allowPaid": false,
    "executionProvider": "subscription/codex-native",
    "modelPolicy": "subscription-only + local-ollama-for-summaries",

    "deliverables": [
      "projects/zhushang-yangmei/docs/runbook.md（更新部署/驗收/回滾）",
      "ARTIFACTS/ 部署腳本與設定檔（不含密鑰）",
      "RESULT.md（含完整步驟、驗收與回滾）"
    ],
    "runCommands": [
      "cd projects/zhushang-yangmei/modules/opencart-deploy",
      "bash ./deploy.sh --dry-run",
      "bash ./verify.sh"
    ],
    "acceptanceCriteria": [
      "可透過網域成功打開首頁與後台登入頁",
      "可在後台建立商品並在前台可瀏覽",
      "HTTPS 正常、基本 SEO 設定完成（title/meta/robots/sitemap）",
      "可回滾到部署前版本（文件化 + 可操作）"
    ],
    "rollbackPlan": "以備份快照/資料庫 dump 回滾；必要時 DNS 指回舊站；回滾後跑 verify.sh"
  }'
```

注意：如果你想強制 Cursor 做前端 UI，除了 `agent.type=cursor`，建議同時加上 tags：`frontend/ui/react/css` 等（目前選擇器對 cursor 可能仍會走 auto 規則）。

---

## 4) OpenCart 商家部署 SOP（全流程）

### Phase 0：需求收斂（小蔡）
輸入（必問清楚，否則後續全浪費）：  
1. 網域/品牌：網域是否已購買？DNS 由誰管？  
2. 主機：VPS/雲主機/代管？作業系統？是否允許 Docker（你目前偏好不用）  
3. 流量/性能：預估訪客、SKU 數量、圖片量、峰值時段  
4. 功能清單：金流、物流、發票、會員、促銷、SEO、分析、客服（LINE/Email）  
5. 合規/資安：個資、後台權限、備份策略、日誌保留  

產出（索引級寫回任務卡即可）：  
- scope（做哪些/不做哪些）  
- 風險等級（riskLevel）  
- 驗收條件（acceptanceCriteria）  

### Phase 1：專案落地（系統自動 + 小蔡檢查）
當任務進 `ready`：系統會自動建立 project skeleton（若不存在）：  
- `projects/<project>/README.md`
- `projects/<project>/docs/STATUS.md`
- `projects/<project>/docs/runbook.md`
- `projects/<project>/.env.example`

小蔡檢查：`projectPath` 命名是否正確（project/module 對不對）。

### Phase 2：方案設計（Codex）
Codex 在 `RESULT.md` 必須產出：
1. 架構選型（無 Docker 版本優先）
2. 安裝步驟（可重現，含版本）
3. 金流/物流/SEO/分析的設定清單（哪些先做、哪些延後）
4. 安全基線（最低限度）
5. 回滾策略（具體可操作）

### Phase 3：實作與配置（Codex + Cursor）
拆成「可並行」的兩條線（避免互卡）：
1. Codex（後端/部署線）
   - 環境建置、安裝腳本、備份/回滾腳本、驗收腳本
2. Cursor（前端/營運線）
   - 主題/版面調整、首頁區塊、表單、追蹤碼、內容模板

交付物落地：
- `modules/opencart-deploy/`：腳本與設定（不含密鑰）
- `runs/<date>/<run_id>/ARTIFACTS/`：本次執行產物（log、diff、清單）
- `runs/<date>/<run_id>/RESULT.md`：本次執行紀錄與結論

### Phase 4：驗收（小蔡 + 系統）
驗收要「機器可跑 + 人類可看」兩種：
1. 機器可跑：`verify.sh`（或等價腳本）  
2. 人類可看：驗收 checklist（後台登入、商品上架、結帳流程、SEO、速度）

### Phase 5：寫回任務卡（索引級 writeback）
只寫索引級，不要把 RESULT.md 全貼回任務卡。

```bash
curl -sS -X PATCH http://127.0.0.1:3011/api/tasks/<TASK_ID>/progress \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "review",
    "runId": "<RUN_ID>",
    "summary": "完成 OpenCart 安裝與基本設定；已產出 deploy/verify/rollback 腳本；待你人工驗收結帳流程。",
    "nextSteps": [
      "1) 依 RESULT.md 驗收 checklist 走一次",
      "2) 確認金流/物流第三方帳號是否齊全",
      "3) 驗收通過後改狀態為 done 並安排每日備份排程"
    ],
    "evidenceLinks": [
      "projects/zhushang-yangmei/runs/2026-02-15/<RUN_ID>/RESULT.md"
    ]
  }'
```

### Phase 6：上線後監控與迭代（小蔡）
每週例行要有（可做成 cron 任務）：
- 可用性（網站能否打開、後台能否登入）
- 備份成功率（是否可還原）
- 風險事件（異常登入、錯誤率飆升）
- 成本（是否觸發到付費模型/第三方 API）

---

## 5) 小蔡 → Codex / Cursor 的「標準指令」模板（可直接複製）

### 5.1 指派 Codex（後端/架構/部署）
```
【任務】{task_name}
【目標】把 OpenCart 部署流程 SOP 化並可重現，產出 deploy/verify/rollback 腳本
【工作區】{projectPath}
【本次 run】{runPath}（RESULT.md + ARTIFACTS/）
【必填輸出】
1) 在 {runPath}/RESULT.md 寫完整步驟、決策理由、驗收與回滾
2) 在 {runPath}/ARTIFACTS/ 放腳本/紀錄（不含密鑰）
3) 完成後呼叫 PATCH /api/tasks/{task_id}/progress 寫回 summary/nextSteps/runId（索引級）
【限制】
- 不要把長輸出貼回 Telegram
- 不要寫死 token/密鑰；只允許 .env.example
【驗收】以任務卡 acceptanceCriteria 為準
```

### 5.2 指派 Cursor（前端/UI/流程）
```
【任務】{task_name}
【目標】完成 OpenCart 前台/主題/頁面模板的可用性提升（手機端優先）
【工作區】{projectPath}
【本次 run】{runPath}
【必填輸出】
1) 在 {runPath}/RESULT.md 寫你改了哪些頁面、為何這樣改、如何驗收
2) 在 {runPath}/ARTIFACTS/ 放 UI 截圖清單或變更摘要
3) PATCH /api/tasks/{task_id}/progress 回寫索引級 summary/nextSteps
【限制】避免引入無用功能；不能用就移除或用 feature flag 關閉
```

---

## 6) 兩種操作模式（小蔡如何「嚴格指揮」或「讓 agent 自行發揮」）

### Mode A：嚴格 SOP 模式（推薦用在 P0 / 上線 / 高風險）
- 任務卡寫到「可直接照做」：runCommands / acceptanceCriteria / rollbackPlan 都要具體。  
- Agent 不得自行擴 scope（除非先寫在 nextSteps 等你批准）。  
- 一切輸出落地 `RESULT.md`，任務卡只存索引。

### Mode B：自主發揮模式（推薦用在研究/草案/低風險）
- 任務卡只定義：目標 + 邊界（禁止事項）+ 最少交付物。  
- 允許 agent 產出「候選方案」與「決策表」放在 `RESULT.md`。  
- 小蔡負責把候選方案轉成下一張可執行任務卡（補齊合規欄位後才進 ready）。

---

## 7) 常見失敗點與保護措施（部署類任務）

1. **任務卡缺欄位 → 進不了 ready / 生成垃圾卡**  
   - 解法：永遠用本文件的 POST /api/tasks 模板；先填滿再建。
2. **輸出只在聊天 → 無法追溯、無法接續**  
   - 解法：強制落地 `runPath/RESULT.md`，再用 progress writeback 寫索引。
3. **同一件事被重跑/重複改**  
   - 解法：run_id + idempotencyKey；重跑必須產生新 run。
4. **把密鑰寫進 repo/對話**  
   - 解法：只允許 `.env.example`；真正密鑰由你手動放入安全位置。

---

## 8) 下一步建議（把 SOP 真的用起來）
1. 先挑 1 個 OpenCart 部署任務，用本 SOP 建一張「可執行」任務卡（直接 `status=ready`）。  
2. 跑一次 `POST /api/tasks/:id/run`，確保 runPath/RESULT.md/ARTIFACTS 能自動建立。  
3. 要求 Codex/Cursor 完成後一定要 `PATCH /api/tasks/:id/progress` 寫回索引級摘要。

