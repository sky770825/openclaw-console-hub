# Codex + Cursor I/O 閉環模式完整指南

> 版本: v2.1  
> 更新: 2026-02-14  
> 適用: Codex Agent + Cursor Agent

---

## 流程總覽

```
┌─────────────────────────────────────────────────────────────┐
│                     老蔡下指令                              │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  小蔡生成: task_id + run_id + idempotency_key              │
│  判斷: UI/前端 → Cursor | 後端/搜尋 → Codex               │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌───────────────┐               ┌───────────────┐
│     Codex     │               │    Cursor     │
│  (後端/搜尋)   │               │  (前端/改碼)   │
└───────┬───────┘               └───────┬───────┘
        ↓                               ↓
        └───────────────┬───────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  執行完成 → 呼叫 3011/api/telegram/force-test              │
│  → 小ollama (@ollama168bot) 直接發訊息給老蔡               │
└─────────────────────────────────────────────────────────────┘
```

---

## 角色分工

| 角色 | 職責 | 不做的 |
|------|------|--------|
| **小蔡** | 任務分派、task_id/run_id 生成、狀態監控、異常升級、idempotency 檢查 | ❌ 不加工結果、❌ 不當回覆窗口 |
| **Codex** | 搜尋/查詢、多工具鏈整合、後端修復、大型多步驟任務、系統分析 | ❌ UI/前端微調 |
| **Cursor** | 程式執行、修改、驗證、UI/前端微調、現有專案改碼、代碼審查 | ❌ 複雜系統故障排查 |
| **小ollama** | 結果通知（成功/失敗/摘要）→ 透過 @ollama168bot 發送 | ❌ 不執行複雜分析 |
| **老蔡** | ACK 確認（收到了/沒收到）、決策、升級確認 | - |

---

## 任務分配決策樹

```
老蔡下指令
    ↓
小蔡生成: TASK_ID=$(date +task_%s_name), RUN_ID=$RANDOM
    ↓
├─ UI/前端微調、現有專案改碼 → Cursor Agent 優先
├─ 系統故障排查、後端修復 → Codex 優先
├─ 多工具鏈整合、搜尋/查詢 → Codex 優先
├─ 大型多步驟任務 → Codex 主導，Cursor 做子任務
├─ Refactor 重構 → Cursor 優先
├─ Debug 除錯 → Cursor 優先
└─ < 30 秒能做完？ → 小蔡本地處理（省啟動費）
```

---

## Cursor vs Codex 詳細對照

| 維度 | Codex | Cursor |
|------|-------|--------|
| **強項** | 搜尋、分析、多工具整合 | 程式改碼、整合修改 |
| **回報風格** | 詳細分析 + 建議 | 實做結果 + PR/commit |
| **失敗重試** | 可嘗試替代搜尋/方案 | 改碼方案固定，失敗需升級 |
| **超時處理** | 考慮分段執行 | 考慮問題拆解 |
| **適用場景** | API 端點修復、資料庫遷移、網路搜尋整理、系統健康檢查 | 前端元件修改、Refactor、Debug、UI 改進、實驗性改動 |

---

## 統一回報格式（必填）

### 成功格式
```
【小蔡執行-${TASK_NAME}】
task_id: task_1771007460_xxx
run_id: run_2861
status: success
retry: 0|1
time: YYYY-MM-DD HH:mm:ss
summary: |
  執行結果摘要（50-100字）
  關鍵數據：A=xxx, B=yyy
✅ 任務完成
```

### 失敗格式
```
【小蔡執行-${TASK_NAME}】
task_id: task_1771007460_xxx
run_id: run_2861
status: failed|timeout
retry: 0|1
time: YYYY-MM-DD HH:mm:ss
summary: 任務執行失敗
error: |
  錯誤類型: xxx
  錯誤訊息: xxx
  建議: xxx
consecutive_failures: 1/2|1/3
❌ 執行失敗
```

**必填欄位：**
- ✅ task_id
- ✅ run_id
- ✅ status
- ✅ time
- ✅ summary
- ✅ consecutive_failures（失敗時必填）

---

## 自動升級機制

### Codex 升級條件
```
連續 2 次 timeout   → [ESCALATE_Codex]
連續 3 次 failed    → [ESCALATE_Codex]
(不再重試)
```

### Cursor 升級條件（更嚴格）
```
連續 1 次 syntax error   → [ESCALATE_Cursor]（代碼問題嚴重）
連續 2 次 test failed    → [ESCALATE_Cursor]（改動有問題）
連續 2 次 timeout        → [ESCALATE_Cursor]（性能問題）
連續 3 次 git conflict   → [ESCALATE_Cursor]（改動衝突）
```

### 升級通知格式
```
【ESCALATE_Codex/Cursor】
task_id: task_1771007460_xxx
consecutive_failures: 2 (timeout) | 3 (failed)
last_error: [錯誤摘要]
recommendation: [升級建議]
action: 已停止重試，等待人工介入
```

---

## 使用範例

### 範例 1：前端改碼 → Cursor
```bash
# 小蔡派任務
TASK_ID="task_$(date +%s)_ui-fix"
RUN_ID="run_$RANDOM"

# Cursor 執行:
# 1. 修改 React 元件
# 2. 執行測試
# 3. 呼叫 API 發送結果
```

### 範例 2：API 修復 → Codex
```bash
# 小蔡派任務
TASK_ID="task_$(date +%s)_api-fix"
RUN_ID="run_$RANDOM"

# Codex 執行:
# 1. 診斷問題
# 2. 修改後端代碼
# 3. 重啟服務驗證
# 4. 呼叫 API 發送結果
```

---

## 小蔡監控原則

| 情況 | 小蔡動作 |
|------|---------|
| 任務啟動 | ✅ 派任務，顯示 task_id/run_id |
| 執行中 | ❌ 靜默，不轉述 |
| 成功完成 | ❌ 不發言（由 @ollama168bot 回報） |
| 失敗/超時 | ✅ 介入，通知老蔡 |
| 符合升級條件 | ✅ 發送 ESCALATE 通知 |
| 需要決策 | ✅ 發言詢問 |

---

## 成本對照

| 任務類型 | 推薦 Agent | 預估成本 |
|---------|-----------|---------|
| 前端微調 | Cursor | ~$0.30 |
| API 修復 | Codex/Cursor | ~$0.30 |
| 資料庫遷移 | Codex | ~$0.40 |
| 網路搜尋整理 | Codex | ~$0.20 |
| Refactor | Cursor | ~$0.30 |
| 系統健康檢查 | Codex | ~$0.20 |

**省錢原則：**
- ✅ 工具導向（Input 為主）→ 便宜
- ❌ 生成導向（Output 多）→ 貴 3 倍
- ✅ I/O 閉環模式 → 省 30-40%

---

## 相關檔案

- **本文件**: `memory/2026-02-14-codex-cursor-io-loop.md`
- **Codex 詳細規則**: `memory/2026-02-14-codex-io-loop.md`
- **任務板 API**: `http://127.0.0.1:3011`
- **通知 Bot**: @ollama168bot

---

## 附錄：落地執行規範 v1.1

### A) 專案唯一真相（Project SSoT）強制規則

**1) 每張任務卡必填 `project_path`**
- 格式：`projects/<project>/modules/<module>/`
- 沒填 `project_path`：任務不得進入 `ready/running`

**2) 每次執行必建 `run_path`**
- 格式：`projects/<project>/runs/<YYYY-MM-DD>/<run_id>/`
- 所有執行產出（log、結果、摘要）只能寫到對應 `run_path`

**3) 最小專案骨架（首次建立專案時）**
- `projects/<project>/README.md`
- `projects/<project>/modules/<module>/`
- `projects/<project>/docs/`
- `projects/<project>/handoff.md`（短摘要 + 下一步）

---

### B) 交付物最小集合（DoD：Definition of Done）

每次執行（不論 Codex/Cursor）必產出：
- `projects/<project>/runs/<date>/<run_id>/RESULT.md`

**RESULT.md 固定結構（不可省略）：**

1. **commands** - 可重現的執行指令（含必要環境變數說明，不可硬寫 Token）
2. **acceptance** - 驗收清單（條列）+ 成功判定（pass/fail）
3. **rollback** - 明確回滾方式（例如 git 指令 / 備份還原 / 停服務）
4. **summary** - 300-800 字摘要：做了什麼、變更點、風險、下一步

**規則：**
- 缺 commands + acceptance 不算完成
- 缺 rollback 不允許標記為 done（除非 riskLevel=low 且寫明「無需回滾原因」）

---

### C) 任務卡寫回（Writeback）強制欄位

任務完成後，必回寫任務卡（或任務板 API）以下欄位：

| 欄位 | 說明 |
|------|------|
| `summary` | 對應 RESULT.md summary |
| `evidenceLinks` | RESULT.md 路徑、commit hash、或關鍵輸出檔 |
| `nextSteps` | 下一步行動 |
| `agent` | `codex\|cursor\|ollama` |
| `modelUsed` | 實際使用的模型/路由結果 |
| `run_id` | 執行識別 |
| `project_path` | 專案路徑 |
| `run_path` | 執行路徑 |
| `status` | done/review 等 |

**規則：**
- Telegram 只做「通知」，任務卡才是「可執行摘要」的承載點

---

### D) 防重複（Idempotency）規則

每次執行必帶：
- `task_id`
- `run_id`
- `idempotencyKey = ${task_id}:${run_id}`

**規則：**
- 若相同 idempotencyKey 已存在：
  - ✅ 允許：補寫回（writeback）或補充 evidence
  - ❌ 禁止：重跑實作（避免重複執行/重複扣費/洗版）

---

### E) 模型政策與 Agent 標籤一致性

**概念澄清：**
- `agent=Codex/Cursor` 是「執行者」標籤，不等於模型
- 任務卡需新增兩欄：
  - `executionProvider`: `subscription\|paid_api\|local`
  - `allowPaid`: `true\|false`（預設 false）

**強制規則：**
- Codex/Cursor 任務預設 `executionProvider=subscription`
- 未標 `allowPaid=true` 的任務：
  - 禁止使用 Gemini/Opus/Claude 等付費 API（除非是 free tier）
- 若要升級付費模型，必須：
  - riskLevel=P0 且老蔡確認
  - 寫明「為何需要付費」與「預估成本上限」

---

### F) 派工模板（小蔡直接照填即可）

#### 給 Codex（後端/整合/搜尋/修復）

```
任務指令：
1. 在 projects/<project>/modules/<module>/ 完成 <需求>
2. 將結果寫入 projects/<project>/runs/<date>/<run_id>/RESULT.md
3. 必附：commands / acceptance / rollback / summary
4. 完成後回寫任務卡欄位：summary/evidenceLinks/nextSteps/run_id/project_path/run_path
```

#### 給 Cursor（前端/UI/重構/除錯）

```
任務指令：
1. 在 projects/<project>/modules/<module>/ 完成 <UI/前端需求>
2. 本機可跑驗證（寫入 acceptance）
3. 結果寫入 runs/.../RESULT.md，並回寫任務卡同上
```

#### 給 Ollama（整理/寫回）

```
任務指令：
1. 讀取 runs/.../RESULT.md 與輸出檔
2. 生成精簡摘要 + nextSteps
3. 執行任務卡 writeback（只寫欄位，不重跑任務）
```

---

### G) 升級條件（落地阻擋）

**保留現有規則：**
- Codex：`2x timeout` 或 `3x failed`
- Cursor：`1x syntax error` 或 `2x test failed`

**新增（落地阻擋）：**
- 若任務沒有 `project_path` 或沒有 `runs/.../RESULT.md`：
  - ❌ 不得進入 Stage 2/Stage 3
  - ❌ 不得標記 done
  - ✅ 必須先補齊可驗收交付物

---

🐣 小蔡 | 2026-02-14 更新（新增落地規範 v1.1）


---

## 附錄：小ollama 最終回報格式 v2（完整，推薦）

用途：任務完成後由 **@ollama168bot** 回報給老蔡。原則是「Telegram 只放索引 + 摘要」，全量內容落在本地 `run_path/`。

### Telegram 回報（完整但不貼長文）

```txt
✅ 任務完成 | <task_name>
task_id: <task_id>
run_id: <run_id>
idempotencyKey: <task_id>:<run_id>

agent: codex|cursor|ollama
executionProvider: subscription|local|paid_api
modelUsed: <model>

status: SUCCESS|FAILED|TIMEOUT
durationSec: <n>
startedAt: <ISO8601>
finishedAt: <ISO8601>

riskLevel: low|medium|high
project_path: projects/<project>/modules/<module>/
run_path: projects/<project>/runs/<YYYY-MM-DD>/<run_id>/

summary:
- <5-12 行>

evidenceLinks:
- <run_path>/RESULT.md
- <run_path>/ARTIFACTS/<...>

nextSteps:
- 1) ...
- 2) ...

acceptance:
- [PASS] ...
- [FAIL] ...

rollback:
- <回滾指令或策略>
```

### 本地落地（免 token，全量內容）

- `run_path/RESULT.md`：commands / acceptance / rollback / summary（完整版）
- `run_path/ARTIFACTS/`：輸出檔、截圖、報表、生成內容
- 若 FAILED：`run_path/ERROR.txt`（最多前 200 行關鍵錯誤）

---

## 附錄：Context 防爆規範（強制版）

目標：避免把長 log/長報告塞進對話與 Telegram，造成 context 爆炸與不必要 token 消耗。

### 1) 回報分層（必遵守）

A) 對話/Telegram（索引級回報）只能包含：
- `task_id` / `run_id` / `status`
- `project_path` / `run_path`
- `summary`（<= 8 行）
- `nextSteps`（<= 5 條）
- `evidenceLinks`（只放路徑/檔名，不貼內容）

禁止：貼長 log、貼長報告全文、貼程式碼全文、貼大量工具輸出。

B) 本地檔案（全量內容）：
- `run_path/RESULT.md`
- `run_path/ARTIFACTS/*`
- `run_path/ERROR.txt`（失敗時）

### 2) 子代理回覆限制（Codex/Cursor）
- 子代理回覆只能回「索引級回報」
- 細節一律寫入 `RESULT.md` 或 `ARTIFACTS/`

### 3) /new + handoff（換會話規則）
- context > 70%：checkpoint（摘要寫檔 + 寫索引）
- context > 85%：強制 `/new + handoff`（handoff 只帶摘要 + 路徑）

handoff（10 行內）：
- what_changed（3 行）
- where（project_path + run_path）
- next（3 行）
- risks（1 行）
- owner（1 行）

---

## 附錄：小蔡派工最短指令（Telegram 快速版）

### 給 Codex

```txt
【最短派工｜Codex】
task_id:<id> run_id:<rid>
project:projects/<p>/modules/<m>/
run:projects/<p>/runs/<date>/<rid>/
做:<一句話需求>
交付:寫 RESULT.md(含commands/acceptance/rollback/summary)+回報小ollama附路徑
限制:allowPaid=false, 不依賴Docker
```

### 給 Cursor

```txt
【最短派工｜Cursor】
task_id:<id> run_id:<rid>
project:projects/<p>/modules/<m>/
run:projects/<p>/runs/<date>/<rid>/
做:<一句話UI需求>
交付:寫 RESULT.md(含commands/acceptance/rollback/summary)+(有畫面就截圖到ARTIFACTS/)+回報小ollama附路徑
限制:allowPaid=false
```
