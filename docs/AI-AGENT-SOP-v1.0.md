# AI Agent 專案執行 SOP（標準作業程序）

> 適用：Code (Claude Code) / Desk / Cursor + MCP
> 版本：v1.0
> 基於：I/O 閉環模式 v2.1 + AGENTS.md 溝通標準

---

## 🎯 SOP 核心理念

```
「好的指揮 = 明確的目標 + 完整的上下文 + 可驗證的交付」
```

**指揮原則：**
1. **不隨便派工**——每個任務都要經過深度拆解
2. **單一真相源**——AGENTS.md + project_path + run_path
3. **閉環驗證**——執行 → 回報 → 確認 → 結案

---

## 第一階段：專案啟動與目標拆解

### Step 1: 建立專案骨架（首次）

```
projects/
└── <project-name>/
    ├── README.md
    ├── AGENTS.md          ← 核心溝通檔
    ├── handoff.md         ← 交接摘要
    ├── docs/
    ├── modules/
    │   ├── <module-a>/
    │   └── <module-b>/
    └── runs/              ← 執行記錄
```

**AGENTS.md 最小版本：**
```markdown
# AGENTS.md

## 專案概覽
- 技術棧: React + Node.js
- 部署: Vercel + Railway

## Do / Don't
- ✅ 使用 TypeScript 嚴格模式
- ❌ 不要新增未批准依賴

## 常用命令
npm run lint:file <path>  # 單一檔案（快）
npm run build             # 完整建置（慢）

## 專案結構
- modules/web/ - 前端
- modules/api/ - 後端
```

---

### Step 2: 專案目標深度拆解（5W2H）

| 維度 | 問題 | 輸出 |
|------|------|------|
| **Why** | 為什麼要做？ | 目標聲明（1-2 句） |
| **What** | 具體要做什麼？ | 功能清單 |
| **Who** | 誰受益？ | 使用者故事 |
| **When** | 時間限制？ | 時程規劃 |
| **Where** | 在哪個模組？ | 模組對應 |
| **How** | 技術方案？ | 技術決策 |
| **How Much** | 成本風險？ | 資源評估 |

**範例：**
```
目標：建立自動化部署系統

Why: 減少人工部署錯誤
What: GitHub Actions + Vercel MCP + 通知
Who: 開發團隊
When: 2 週內 MVP
Where: .github/workflows/
How: MCP 工具整合
How Much: 風險低，成本可控
```

---

### Step 3: 任務分解

**任務卡必填欄位：**
```yaml
task_id: task_$(date +%s)_name
epic: [所屬主題]
title: [簡短標題]
description: [詳細描述]
acceptance_criteria:
  - [條件 1]
  - [條件 2]
assigned_agent: codex|cursor|ollama
project_path: projects/<p>/modules/<m>/
risk_level: low|medium|high
allow_paid: true|false
```

---

## 第二階段：任務指派（指揮核心）

### 指派前必確認清單

- [ ] 目標是否清晰可驗證？
- [ ] 上下文是否完整（AGENTS.md + project_path）？
- [ ] 交付標準是否明確？
- [ ] 回滾方案是否準備？
- [ ] Agent 是否選對（Codex vs Cursor）？

---

### 指派給 Codex（後端/整合/搜尋）

**適用：** API 開發、資料庫遷移、系統排查、多工具整合

**模板：**
```
【任務指派｜Codex】
═══════════════════════════════════════════
task_id: task_1771007460_api-refactor
run_id: run_2861
project_path: projects/backend/modules/auth/
run_path: projects/backend/runs/2026-02-14/run_2861/

【目標】
重構認證模組，session-based 改為 JWT

【背景】
- 目前 express-session，無法水平擴展
- 參考：modules/auth/src/session.ts

【具體要求】
1. 實作 JWT 簽發與驗證
2. 保留現有 API 介面
3. 新增 token 過期處理

【交付標準】
- [ ] 所有測試通過
- [ ] 新增 JWT 測試（>80% 覆蓋）
- [ ] API 文件更新
- [ ] 本地可驗證

【可用工具】
- GitHub MCP、Postgres MCP

【限制】
allowPaid: false

【回報】
1. 寫入 run_path/RESULT.md
2. 結構：commands / acceptance / rollback / summary
3. 回報小ollama
═══════════════════════════════════════════
```

---

### 指派給 Cursor（前端/UI/重構）

**適用：** React 元件、UI 調整、CSS、Debug、原型開發

**模板：**
```
【任務指派｜Cursor】
═══════════════════════════════════════════
task_id: task_1771007460_ui-login
run_id: run_2862
project_path: projects/web/modules/auth-ui/
run_path: projects/web/runs/2026-02-14/run_2862/

【目標】
重新設計登入頁面

【具體要求】
1. 更新 LoginForm 元件
2. 使用新設計系統
3. 響應式設計
4. 表單驗證優化

【參考】
- ✅ 好範例：modules/ui/components/Modal.tsx
- ❌ 避免：硬編碼顏色

【交付標準】
- [ ] 視覺符合設計
- [ ] 功能正常
- [ ] 響應式正常
- [ ] 截圖存 ARTIFACTS/

【回報】
1. 寫入 RESULT.md
2. 截圖存 ARTIFACTS/
3. 回報小ollama
═══════════════════════════════════════════
```

---

### 指派給 Ollama（整理/寫回）

**適用：** 結果整理、任務卡更新、監控報告

**模板：**
```
【任務指派｜Ollama】
═══════════════════════════════════════════
task_id: task_1771007460_summary
source_run_path: projects/backend/runs/2026-02-14/run_2861/

【目標】
讀取執行結果，生成摘要並寫回任務卡

【輸入】
- source_run_path/RESULT.md

【輸出】
1. 摘要（300 字內）
2. nextSteps（3-5 條）
3. 更新任務卡
═══════════════════════════════════════════
```

---

## 第三階段：執行與監控

### 正常流程

```
指派 → 執行中（靜默）→ 完成 → 小ollama回報 → 主人 ACK → 結案
```

### 異常升級條件

**Codex：** 2x timeout 或 3x failed

**Cursor（更嚴格）：** 1x syntax error、2x test failed、2x timeout

**升級通知：**
```
【ESCALATE_Codex】
task_id: task_1771007460_xxx
consecutive_failures: 2 (timeout)
last_error: [摘要]
action: 等待人工介入
```

---

## 第四階段：驗證與結案

### RESULT.md 必含結構

```markdown
# RESULT.md

## commands
# 可重現的執行指令
npm run test:file src/auth/jwt.test.ts

## acceptance
- [PASS] 測試通過
- [PASS] 文件更新

## rollback
git checkout -- src/auth/

## summary
做了什麼、變更點、風險、下一步
```

### 結案檢查清單

- [ ] RESULT.md 結構完整
- [ ] 任務卡已更新
- [ ] 主人已 ACK

---

## 附錄：快速參考

### 任務分配決策樹

```
主人指令 → 達爾分析
    ├─ UI/前端 ────────→ Cursor
    ├─ 後端/API ───────→ Codex
    ├─ 系統排查 ───────→ Codex
    ├─ 多工具整合 ─────→ Codex
    ├─ 重構/除錯 ──────→ Cursor
    ├─ 整理/寫回 ──────→ Ollama
    └─ <30 秒 ─────────→ 達爾本地
```

### 指揮用語

**✅ 好的指令：**
- 「在 `project_path` 實作 [功能]，交付 [標準]」
- 「參考 [好範例]，避免 [壞範例]」

**❌ 避免：**
- 「弄一下那個功能」（太模糊）
- 「隨便測試一下」（沒標準）

### 快速命令

```bash
# 生成 ID
TASK_ID="task_$(date +%s)_name"
RUN_ID="run_$RANDOM"

# 建立路徑
mkdir -p "projects/p/runs/$(date +%Y-%m-%d)/$RUN_ID/ARTIFACTS"
```
