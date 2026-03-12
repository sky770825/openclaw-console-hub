# 任務板自檢與自主排程系統 - 建立完成報告

## ✅ 系統建立完成

### 已建立的 5 個核心文檔

```
taskboard/
├── 1️⃣  self-check.md (4.9 KB)
│   └─ 自我檢查機制：進度清單、缺口識別、品質審核
│
├── 2️⃣  auto-task-rules.md (7.2 KB)
│   └─ 自動任務生成：信息蒐集、缺口轉化、優先級判定
│
├── 3️⃣  session-start-checklist.md (8.3 KB)
│   └─ 會話啟動檢查：快速診斷、決策分支、上下文恢復
│
├── 4️⃣  session-context-template.md (13 KB)
│   └─ 記憶機制：上下文格式、記憶延續、Context 管理
│
├── 5️⃣  controller.md (22 KB)
│   └─ 主控框架：架構圖、決策樹、子代理交派、整合流程
│
└── 📋 SYSTEM-SETUP-GUIDE.md (本文件)
```

---

## 📖 系統使用指南

### 快速開始 (5 分鐘)

#### 步驟 1: 驗證系統已正確安裝

```bash
# 檢查所有必要文件
ls -1 taskboard/{self-check,auto-task-rules,session-start-checklist,session-context-template,controller}.md

# 應該看到 5 個文件
```

#### 步驟 2: 新對話開始時

```
使用主代理的時候，自動執行：

□ 1. 運行會話啟動檢查清單
    參考: taskboard/session-start-checklist.md

□ 2. 快速評估系統狀態 (2-3 分鐘)
    - 掃描 taskboard/running/ 和 taskboard/pending/
    - 計算健康度指標
    - 判斷是否需要子代理

□ 3. 根據結果做出決策
    - 情景 A (HEALTHY): 列出優先任務，等待用戶指令
    - 情景 B (WARNING): 生成解除阻塊任務，詢問是否啟動子代理
    - 情景 C (CRITICAL): 自動啟動子代理全面自檢

□ 4. 加載上次會話記憶
    檔案: taskboard/session-context-latest.json
    格式: 簡化版本或詳細版本
    
□ 5. 向用戶呈現優先清單和建議
□ 6. 等待用戶指令或自動執行
```

#### 步驟 3: 發現缺口時

```
自動流程（參考 taskboard/auto-task-rules.md）：

缺口類型           →  蒐集行動              →  生成的任務
─────────────────────────────────────────────────────
需求模糊           →  查詢規格文檔          →  TASK-{}-SPEC
技術棧未定         →  調研可用方案          →  TASK-{}-TECHSTACK
成功標準缺失       →  定義驗收標準          →  TASK-{}-ACCEPTANCE
依賴項不明         →  製作依賴圖            →  TASK-{}-DEPS
無人有技能         →  技能差距分析          →  TASK-{}-SKILLGAP
資源不足           →  資源規劃              →  TASK-{}-RESOURCES
流程銜接問題       →  設計流程圖            →  TASK-{}-WORKFLOW

優先級自動計算公式：
PRIORITY = (IMPACT × URGENCY × READINESS × STRATEGIC) / BLOCKERS
- > 60 分 → HIGH
- 40-60 → MEDIUM
- < 40 → LOW
```

#### 步驟 4: 啟動子代理時

```
(參考 taskboard/controller.md - 第 3 節)

自動觸發（無需用戶確認）：
✓ 健康度 = CRITICAL
✓ 3+ 個任務被阻塊 > 2 小時
✓ 新系統驗證運行

需要用戶確認：
✓ 健康度 = WARNING
✓ 1-2 個任務需要立即處理
✓ 需要決策分析

子代理會：
1. 執行 self-check.md 的完整檢查流程
2. 掃描所有任務，識別缺口
3. 根據 auto-task-rules.md 分析並優先級排序
4. 生成新任務並推薦行動
5. 返回結構化報告
```

---

## 🔧 系統架構簡圖

```
用戶指令
    │
    ↓
┌─────────────────────────────────────┐
│  主代理 (Main Agent)                │
│  ├─ session-start-checklist        │ ← 快速診斷
│  └─ 決策樹判斷                      │
└────────────┬────────────────────────┘
             │
             ├─ 是否需要子代理？
             │
     ┌───────┴────────┐
     │                │
   否 (HEALTHY)      是 (WARNING/CRITICAL)
     │                │
     ↓                ↓
  列出優先         spawn_subagent
  任務清單         (self-check-agent)
     │                │
     │                ↓
     │         ┌─────────────────┐
     │         │  子代理執行：   │
     │         │ ├─ self-check  │
     │         │ ├─ 缺口分析    │
     │         │ ├─ 任務生成    │
     │         │ └─ 報告結果    │
     │         └────────┬────────┘
     │                  │
     └──────────┬───────┘
                │
                ↓
        更新記憶 & 呈現結果
                │
                ↓
        等待用戶下一個指令
```

---

## 📊 系統工作流程概覽

### 工作週期

```
1️⃣  會話初始化 (5 分鐘)
    ├─ 檢查系統狀態
    ├─ 加載記憶
    ├─ 計算健康度
    └─ 做出初步決策

2️⃣  主動自檢 (10-30 分鐘，可選)
    ├─ 啟動子代理（如果需要）
    ├─ 掃描所有任務
    ├─ 識別缺口和瓶頸
    ├─ 自動生成解決方案
    └─ 返回報告

3️⃣  任務執行 (按需)
    ├─ 用戶選擇優先任務
    ├─ 系統分配人員和資源
    ├─ 監控進度
    └─ 實時更新狀態

4️⃣  會話結束 (2 分鐘)
    ├─ 保存會話記憶
    ├─ 更新進度指標
    ├─ 記錄決策
    └─ 準備下次對話

5️⃣  定期審核 (每天或每周)
    ├─ 檢查已完成任務品質
    ├─ 更新項目進度
    ├─ 識別新的風險
    └─ 規劃下一步工作
```

---

## 🎯 各文檔的詳細用途

### 1. `self-check.md` - 自我檢查機制

**何時使用**：每次系統需要診斷自身狀態
**主要內容**：
- 進度檢查清單（IN_PROGRESS / BLOCKED / UNASSIGNED）
- 缺口識別規則（4 種類型）
- 品質審核機制（完整性、標準、維護性、驗收）
- 健康度指標評分

**使用例**：
```
子代理執行自檢：
"我需要對所有任務進行檢查診斷"
→ 參考 self-check.md 第 1-3 節
→ 掃描 taskboard/running/, pending/, done/
→ 識別缺口（INFO_GAP, SKILL_GAP, PROCESS_GAP, DEPENDENCY_GAP）
→ 生成報告
```

### 2. `auto-task-rules.md` - 自動任務生成

**何時使用**：發現缺口後如何轉化為具體任務
**主要內容**：
- 信息蒐集策略（文件搜索、結構化查詢、人工驗證）
- 缺口→任務的轉化規則和模板
- 優先級自動計算公式
- 完整的缺口→任務流程圖

**使用例**：
```
發現 INFO_GAP（需求模糊）：
→ 參考 auto-task-rules.md
→ 自動執行信息蒐集
→ 查詢規格文檔、類似案例
→ 生成 TASK-{}-RESEARCH 子任務
→ 優先級 = HIGH（因為阻塊主任務）
→ deadline = 當天
```

### 3. `session-start-checklist.md` - 會話啟動檢查

**何時使用**：每次新對話開始（或主代理接收新指令）
**主要內容**：
- 快速檢查清單（4 個檢查項）
- 詳細檢查流程（Phase 1-4）
- 3 種情景決策（A/B/C）
- 檢查結果輸出格式

**使用例**：
```
新對話開始：
□ 1. 檢查 taskboard/running/ 有多少任務
□ 2. 檢查子代理狀態
□ 3. 如果 running 為空 → 啟動自檢
□ 4. 如果有任務積壓 → 並行處理

結果範例：
- 健康度: HEALTHY
- 優先任務: [TASK-001, TASK-002, TASK-003]
- 行動建議: 繼續執行 TASK-001，待命 TASK-002
```

### 4. `session-context-template.md` - 記憶機制

**何時使用**：保存/加載會話上下文和項目記憶
**主要內容**：
- 會話初始化檢查條件
- 詳細和簡化的上下文 JSON 模板
- 記憶延續清單
- Context 爆炸時的應急方案
- 記憶文件生命周期管理

**使用例**：
```
會話結束前：
→ 生成 session-context-{session_id}.json（詳細版）
→ 更新 session-context-latest.json（快速版）
→ 記錄決策到 decision-log.json

下次對話開始：
→ 加載 session-context-latest.json
→ 提取優先任務和待決策項
→ 向用戶呈現：「上次進度：完成 60%，進行中 3 個，阻塊 1 個」
```

### 5. `controller.md` - 主控框架

**何時使用**：設計和實現整個系統的集成邏輯
**主要內容**：
- 系統架構概覽
- 完整控制流程圖和決策樹
- 子代理交派的標準流程和通信格式
- 核心邏輯 pseudocode
- 日常維運命令和故障排查

**使用例**：
```
實現主代理的主要邏輯：

1. session_start() 
   ├─ 執行 session-start-checklist
   ├─ 計算健康度
   └─ 做出決策

2. decide(health)
   ├─ if HEALTHY → continue_normal
   ├─ if WARNING → prompt_user
   └─ if CRITICAL → spawn_subagent_urgent

3. spawn_subagent(task_type)
   └─ 發送任務交派單
   └─ 等待並處理結果

4. save_session_memory()
   └─ 生成上下文 JSON
   └─ 保存決策日誌
```

---

## 💡 常見使用情景

### 情景 1: 新項目啟動

```
用戶：「我有個新項目，需要系統幫我規劃」

系統流程：
1. 接收項目信息 → 建立初始任務板
2. 執行 self-check → 識別缺口（需求、技能、資源）
3. 根據 auto-task-rules → 自動生成準備性子任務
4. 計算優先級 → 列出當週執行清單
5. 保存記憶 → 建立項目檔案

輸出：
- 優先級清單（按 IMPACT × URGENCY 排序）
- 缺口修復計畫
- 人員分配建議
- 預計完成時間
```

### 情景 2: 中途遇到阻塊

```
用戶：「TASK-001 卡住了，我不知道怎麼辦」

系統流程：
1. 執行 self-check → 分析 TASK-001 的阻塊原因
2. 識別缺口 → 是 INFO_GAP? SKILL_GAP? DEPENDENCY?
3. 根據 auto-task-rules → 自動生成解除方案
4. 詢問是否啟動並行子代理
5. 生成新的 RESEARCH 或 SUPPORT 任務

輸出：
- 阻塊原因分析
- 3 個可能的解決方案及成本
- 建議優先順序
- 預計解決時間
```

### 情景 3: 定期檢查

```
用戶：「給我做個週報，看看進度如何」

系統流程：
1. 加載記憶 → 回顧本週工作
2. 執行 self-check → 掃描所有任務
3. 計算指標：
   - 完成率
   - 阻塊率
   - 按時率
   - 品質評分
4. 識別本週的成就和風險
5. 規劃下週優先事項
6. 保存週報到檔案

輸出：
- 週報摘要（完成 60%，計劃達成率 85%）
- 進度趨勢圖
- 關鍵成就 (3 個)
- 待解決的風險 (2 個)
- 下週優先事項 (5 個)
```

---

## 🚀 系統優勢

```
✅ 自動化
   - 自動識別缺口和風險
   - 自動生成解決方案
   - 自動計算優先級
   - 自動調度並發任務

✅ 透明化
   - 清晰的進度可視化
   - 明確的決策依據
   - 完整的決策日誌
   - 可追蹤的任務流

✅ 智能化
   - 根據情況自適應調整
   - 學習歷史經驗
   - 主動預警風險
   - 優化排程策略

✅ 可擴展
   - 模塊化設計
   - 易於定制規則
   - 支持複雜項目
   - 多人協作友好
```

---

## 📝 檔案快速查詢表

| 我想要... | 參考文件 | 相關章節 |
|----------|--------|---------|
| 檢查系統狀態 | self-check.md | 第 4 節 |
| 生成新任務 | auto-task-rules.md | 第 2-3 節 |
| 啟動新對話 | session-start-checklist.md | Phase 1-2 |
| 三種情景決策 | session-start-checklist.md | Phase 3 |
| 保存記憶 | session-context-template.md | 第 2-3 節 |
| 加載記憶 | session-context-template.md | 第 5 節 |
| 子代理交派 | controller.md | 第 3 節 |
| 完整流程 | controller.md | 第 2 節 |
| Context 管理 | session-context-template.md | 第 3-4 節 |
| 故障排查 | controller.md | 第 8 節 |

---

## 🔍 系統監控指標

```
實時監控項目：
📊 完成率 = done_tasks / total_tasks
📊 進度率 = (done + (running × progress%)) / total_tasks
📊 阻塊率 = blocked_tasks / active_tasks
📊 健康度 = (完成率 × 60%) + ((1 - 阻塊率) × 40%)

警告閾值：
🟢 HEALTHY   > 75 分
🟡 WARNING  50-75 分
🔴 CRITICAL < 50 分

需要採取行動的情況：
⚠️  有 1+ 個任務卡住 > 2 小時 → 啟動快速診斷
🚨 有 3+ 個任務被阻塊 → 啟動並行子代理
⛔ 健康度 < 40 分 → 立即 escalation
📈 完成率 < 30% 且無進展迹象 → 重新評估計畫
```

---

## 📞 技術支持

### 如果系統無法啟動

```
檢查清單：
□ 所有 5 個 .md 文件都存在 → ls taskboard/*.md
□ 目錄結構完整 → ls -la taskboard/{running,pending,done}/
□ 記憶文件可讀取 → cat taskboard/session-context-latest.json
□ 沒有權限問題 → chmod +r taskboard/*.md
□ JSON 格式有效 → jq '.' taskboard/session-context-latest.json
```

### 如果子代理無法執行

```
檢查清單：
□ 子代理框架已啟動
□ 任務交派單格式正確（參考 controller.md 第 3.2 節）
□ deadline 足夠長（建議至少 15 分鐘）
□ 輸入數據完整且可訪問
□ 子代理有足夠的資源
```

---

## 📚 進階主題

### 自定義優先級公式

編輯 `auto-task-rules.md` 第 3 節，調整各項權重：
```
PRIORITY = (IMPACT × W1 + URGENCY × W2 + READINESS × W3) / BLOCKERS

默認: W1=W2=W3=1/3
可調整: 根據項目需要調整權重
```

### 擴展缺口類型

編輯 `self-check.md` 第 2 節，添加新的缺口類型：
```
新增: INFRASTRUCTURE_GAP
特徵: 基礎設施不足
識別: 檢查系統資源使用情況
解決: 申請或升級資源
```

### 定制記憶格式

編輯 `session-context-template.md` 第 2 節，修改 JSON 結構：
```
添加項: "team_sentiment": "positive|neutral|negative"
用途: 跟蹤團隊士氣
更新: 每個會話自動評估
```

---

## ✨ 系統建立完成

所有 5 個核心檔案已成功建立。系統已準備好投入使用！

**下一步**：
1. 在主代理中整合 `controller.md` 的邏輯
2. 建立初始任務板（或從現有任務遷移）
3. 運行第一次完整自檢
4. 收集用戶反饋並迭代改進

祝您使用愉快！🎉
