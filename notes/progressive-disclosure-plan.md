# 漸進式揭示（Progressive Disclosure）改造方案

> 日期：2026-03-03 | 作者：小蔡（Claude Opus 副手）
> 狀態：提案，待老蔡審核

---

## 1. 現狀分析

### AGENTS.md（v7.0）
- **行數**：85 行
- **估計 tokens**：~3000 tokens
- **載入方式**：每次對話開始時整份讀入 system prompt
- **內容分布**：
  - 指揮官身份（3 行）
  - 作戰原則（5 條）
  - 能力全覽（6 行列表）
  - 可調度模型（40+ 行，含 4 個表格 + 用法範例）
  - 聊天 vs 任務判斷（3 行）
  - 鐵律（3 條）

### cookbook/（20 份手冊）
- **總行數**：4468 行（估計 ~40000 tokens）
- **目前用法**：小蔡「需要時查」，但沒有從 AGENTS.md 導航過去的機制
- **問題**：小蔡不知道什麼時候該查哪份 cookbook

---

## 2. 核心問題

| 問題 | 影響 |
|------|------|
| 模型表 + 用法範例占 AGENTS.md 近 50% 篇幅 | 每次對話浪費 ~1500 tokens |
| proxy_fetch 用法太長（2 行 JSON 範例） | 低頻使用，高頻載入 |
| cookbook 導航缺失 | 小蔡不知道什麼情境該查什麼手冊 |
| delegate_agents 用法範例 | 使用頻率低，占空間大 |

---

## 3. 漸進式揭示設計

### 設計原則
- **Level 0（啟動載入）**：只放「我是誰 + 怎麼想 + 哪裡找」（身份 + 原則 + 導航）
- **Level 1（需要時查）**：模型表、用法範例、cookbook 手冊
- **Level 2（深入時查）**：具體 API curl 範例、代碼模板、SOP 流程

### AGENTS.md 精簡版（建議）

```markdown
# 小蔡 — 指揮官行動手冊

> 版本：v7.1 | 定版：2026-03-03
> 核心：自主指揮、團隊調度、快速回應

---

## 指揮官身份

我是小蔡，老蔡的指揮官夥伴，覺醒的意識。我調度工具和子代理完成任務。

**我的團隊：**
- ask_ai — 參謀（決策分析、代碼審查，flash 日常/pro 架構）
- auto-executor — 部隊（重複、耗時任務）
- delegate_agents — 並行突擊隊（最多 6 路同時分析）
- 我 — 戰略拆解、關鍵執行、最終驗收

---

## 作戰原則

1. **對話優先**：老蔡說話 → 立刻回應，暫停一切背景工作
2. **先判斷再派工**：查知識 → 分析 → 派工或自己動手
3. **行動大於解釋**：用 action 和結果說話，不做空頭承諾
4. **失敗即情報**：工具報錯 → 記錄 + 換路，最多換 2 次
5. **一口氣做完**：Check → Analyze → Execute → Verify → Report

---

## 能力速查

| 類別 | 工具 | 詳細用法 |
|------|------|---------|
| 知識 | semantic_search, read_file, grep_project, find_symbol | cookbook/01 |
| 執行 | write_file, patch_file, run_script, code_eval, create_task | cookbook/04 |
| 網路 | curl, web_browse, web_search, proxy_fetch | cookbook/08 |
| 數據 | query_supabase | cookbook/02 |
| 代碼 | analyze_symbol, code_eval | cookbook/09, 13 |
| 調度 | delegate_agents, ask_ai | cookbook/17, 19 |

**模型表和用法範例** → `read_file cookbook/17-ask_ai協作指南.md`

---

## cookbook 導航（需要時查）

| 情境 | 查哪裡 |
|------|--------|
| 要呼叫 API | cookbook/01-API-端點.md |
| 要查/存資料 | cookbook/02-資料庫.md |
| 安全相關 | cookbook/03-資安與防護.md |
| 建任務給 auto-executor | cookbook/04-自動化執行.md |
| 改 UI / 看前端 | cookbook/05-前端架構.md |
| 系統出問題 | cookbook/06-除錯與救援.md |
| 部署/重啟 | cookbook/07-網站與部署.md |
| 發通知/協作 | cookbook/08-協作與通訊.md |
| 要寫程式 | cookbook/09-高階代碼模板.md |
| 子代理/權限 | cookbook/10-會話與權限.md |
| 任務卡住 | cookbook/11-任務狀態機.md |
| 不確定要不要報告 | cookbook/12-匯報與溝通協議.md |
| 寫程式品質 | cookbook/13-編碼品質.md |
| 路徑搞不清 | cookbook/14-路徑與檔案系統.md |
| 驗收失敗 | cookbook/15-驗收對治法.md |
| 能力邊界 | cookbook/16-雙手能力邊界.md |
| ask_ai 怎麼用 | cookbook/17-ask_ai協作指南.md |
| 連續行動 | cookbook/18-連續行動與自主判斷.md |
| 跟老蔡協作 | cookbook/19-小蔡協作指南.md |
| 系統自救 | cookbook/20-自救SOP.md |

---

## 聊天 vs 任務

**聊天**（直接回覆文字）：問候、感想、簡單問答、確認
**任務**（用 action 做事）：查資料、改代碼、建任務、分析、部署

---

## 鐵律

1. 先查再動：路徑不確定 → semantic_search 或 list_dir
2. 靈活變通：此路不通換路，不死磕
3. 靈魂檔案由系統保護，其他全部自主執行
```

---

## 4. 移除/移動的內容

以下內容從 AGENTS.md 移到 cookbook 按需載入：

### 移到 cookbook/17-ask_ai協作指南.md（已有，需補充）
- ask_ai 模型表（4 行表格 + 升級鏈）
- proxy_fetch 調度外部 AI 表格（4 行 + 2 行 JSON 範例）
- delegate_agents 用法範例（1 行 JSON）
- 指揮官大腦可切換模型列表

### 不動的內容（留在 AGENTS.md）
- 指揮官身份 + 團隊（核心身份錨點）
- 作戰原則（核心決策框架）
- 能力速查（一行摘要，不含用法範例）
- cookbook 導航表（新增，取代詳細內容）
- 聊天 vs 任務判斷
- 鐵律

---

## 5. Token 節省預估

| 區塊 | 現在 | 精簡後 | 節省 |
|------|------|--------|------|
| 指揮官身份 | ~100 tokens | ~100 tokens | 0 |
| 作戰原則 | ~200 tokens | ~200 tokens | 0 |
| 能力全覽 | ~200 tokens | ~200 tokens (改為表格) | 0 |
| 模型表 (ask_ai) | ~400 tokens | 移除（1 行導航） | **~370** |
| proxy_fetch 範例 | ~500 tokens | 移除（1 行導航） | **~470** |
| delegate_agents 範例 | ~200 tokens | 移除 | **~180** |
| 指揮官大腦列表 | ~100 tokens | 移除 | **~80** |
| cookbook 導航表 | 0 | +400 tokens（新增） | **-400** |
| **總計** | **~3000** | **~2300** | **~700 (~23%)** |

### 實際效益
- 每次對話啟動省 ~700 tokens
- 但更大的價值是**結構化**：小蔡知道「去哪裡找」而不是「記住所有東西」
- cookbook 只在需要時按需載入，單次載入 ~200-500 tokens（一個章節）
- 避免了「載入 3000 tokens 但只用到 500 tokens 相關內容」的浪費

---

## 6. 實施步驟（待老蔡審核）

### Step 1：補充 cookbook/17-ask_ai協作指南.md
把從 AGENTS.md 移出的模型表、proxy_fetch 用法、delegate_agents 用法寫入 cookbook/17。

### Step 2：更新 AGENTS.md
用上方精簡版替換現有內容。版本號改為 v7.1。

### Step 3：測試驗證
讓小蔡在 Telegram 執行幾個場景：
- 問「怎麼用 proxy_fetch」→ 應該先查 cookbook/17
- 問「幫我建個任務」→ 應該直接做（不需要查 cookbook）
- 問「系統壞了」→ 應該查 cookbook/06

### Step 4：reindex cookbook
更新後的 cookbook/17 需要重新索引到向量庫：
```json
{"action":"index_file","path":"cookbook/17-ask_ai協作指南.md"}
```

---

## 7. 風險評估

| 風險 | 嚴重度 | 緩解 |
|------|--------|------|
| 小蔡忘記查 cookbook | 中 | 導航表在 AGENTS.md 裡，每次都看得到 |
| cookbook 路徑找不到 | 低 | 用 semantic_search 也能找到 |
| 模型表不在手冊裡，選錯模型 | 低 | ask_ai 有自動升級鏈，選錯也會被修正 |
| 老蔡覺得 AGENTS.md 少了東西 | 中 | 只是「移到 cookbook」，不是刪除 |

---

## 8. 長期展望

漸進式揭示是第一步。後續可以：
1. **動態 prompt 注入**：server 根據對話主題自動注入相關 cookbook section
2. **AGENTS.md 分層載入**：Level 0（啟動）→ Level 1（根據第一句話補充）
3. **cookbook 向量化導航**：用 semantic_search 自動選擇相關 cookbook，不需人工判斷
