# Context 精簡化架構設計 — 高層次評估報告

**完成時間**：2026-02-13 06:54  
**評估者**：Subagent (context-architecture-opus46)  
**基準日期**：2026-02-13

---

## 📊 現況診斷（Token 消耗分析）

### 當前會話啟動時載入的檔案

| 檔案 | 大小 | Tokens | 用途 | 問題 |
|------|------|--------|------|------|
| **SOUL.md** | 1.2 KB | ~400 | 核心價值觀 | ✅ 精簡，無問題 |
| **USER.md** | 1.9 KB | ~600 | 用戶設定 | ✅ 精簡，無問題 |
| **IDENTITY.md** | 324 B | ~100 | 身份定義 | ✅ 精簡，無問題 |
| **AGENTS.md** | ~10 KB | **3,500-4,000** | 執行規範 | 🔴 **過於冗長**，混合規範/教學/案例 |
| **MEMORY.md** | **24.6 KB** | **8,000-9,000** | 記憶索引 | 🔴 **嚴重超載**，包含詳細摘要、API 索引、學習資源 |
| **SESSION-STATE.md** | 4.6 KB | ~1,500 | 當前任務 | 🟡 **含過期內容**，已完成任務未清理 |
| **HEARTBEAT.md** | 4.9 KB | ~1,600 | 定時配置 | 🟡 **可精簡**，詳細但頻繁讀取 |
| **NOW.md** | ~1.5 KB | ~800 | 熱記憶 | ✅ 控制得很好 |
| **SKILLS_INDEX.md** | 部分載入 | ~800 | 技能索引 | 🟡 按需但有描述開銷 |

### 合計: **16,000-17,000 tokens**（目前）vs 目標 **3,000 tokens** ⚠️

---

## 🔴 現況核心問題（3-5 點）

### 問題 1：MEMORY.md 信息過載（8000+ tokens）
**症狀**：
- 包含 7 天摘要（詳細記述），佔 40-50% 的檔案
- 包含大量關鍵字索引（如「Multi-Agent 系統策略」占 1000+ tokens）
- 包含 API 端點索引、學習資源索引、商業專案分析等非急需資訊
- 沒有分層，所有內容平等對待，每次都全載入

**影響**：
- 浪費 70-80% 的 MEMORY.md tokens，其中 50% 是可延遲的資訊
- 搜尋效率低（關鍵字不多，但內容龐雜）

### 問題 2：AGENTS.md 混合規範與教學（3500-4000 tokens）
**症狀**：
- 規範部分（核心內容）：300-500 tokens
- Context Engineering 教學/案例：1500-2000 tokens
- 詳細解釋與重複說明：1000-1500 tokens
- 模型選擇速查：300-500 tokens

**影響**：
- Agent 只需要「應該做什麼」，不需要「為什麼」的詳細解釋
- 新 Agent 啟動時，教學內容是干擾而非幫助

### 問題 3：SESSION-STATE.md 未清理（過期內容）
**症狀**：
- Task Stack 中包含已完成的任務（標記 ✅ 但仍佔用行數）
- Key Context 中包含舊決策（2 周前的，應歸檔）
- Pending Actions 混合長期和短期任務

**影響**：
- 實際有用的內容被埋沒在過期信息中
- 需要 30-50% 內容刪除

### 問題 4：記憶檔案缺乏分層與按需載入機制
**症狀**：
- MEMORY.md 作為整體被完整載入，沒有「摘要版」
- AGENTS.md 沒有「快速規範版」
- 沒有實施「溫記憶」層（Warm Memory），冷熱混合

**影響**：
- 無法區分「必讀」vs「參考用」
- 無法實現漸進式載入策略

### 問題 5：SeekDB 向量系統未充分利用
**症狀**：
- `scripts/memory_recall.js` 已建立，但 AGENTS.md 未強制規範使用
- 關鍵字索引仍然是搜尋主力，向量檢索是可選的
- 沒有針對「深度上下文」的檢索 SOP

**影響**：
- 為了防止遺漏，被迫將所有可能需要的資訊預載入
- 失去向量搜尋的去重複/智能化優勢

---

## 💡 可行架構方案

### 方案 A：「精簡冷熱分離」（推薦 ⭐⭐⭐）

#### 核心理念
採用**嚴格的三層架構**：
- **HOT**（熱，<2k tokens）：會話必讀，即時決策相關
- **WARM**（溫，按需載入，3-5k tokens）：關鍵參考，少數深度場景
- **COLD**（冷，向量檢索）：歷史詳情、完整記錄

#### 檔案重組方案

**熱層（HOT）- 會話啟動自動載入**
```
NOW.md               (~800 tokens)   → 當前焦點、待辦、關鍵決策
SOUL.md              (~400 tokens)   → 核心價值觀（無改動）
USER.md              (~600 tokens)   → 用戶設定（無改動）
AGENTS-QUICK.md      (~600 tokens)   → ★新增：只有核心執行規範，去掉教學
SESSION-STATE-HOT.md (~300 tokens)   → ★改造：只保留「現在進行中」的任務
─────────────────────────────────────
合計                 (~2,700 tokens)
```

**溫層（WARM）- 按需手動載入或檢測到需求時自動載入**
```
MEMORY-SUMMARY.md    (~2,500 tokens) ★新增：7天摘要版本，只有標題+結論
HEARTBEAT.md         (~1,500 tokens) → 保留（但優化結構）
AGENTS-FULL.md       (~3,500 tokens) ★改造：將教學/案例移至此，保留原內容供參考
SKILLS-INDEX.md      (~500 tokens)   → 精簡版，只保留前 30 個常用技能
─────────────────────────────────────
按需總計             (~8,000 tokens)
```

**冷層（COLD）- 向量檢索或關鍵字查詢**
```
memory/YYYY-MM-DD.md (各5-10 KB)     → 日誌保持不變
memory/anchors/      (錨點檔案)       → 保持不變
MEMORY-DETAILED.md   (~15 KB)        ★新增：融合所有關鍵字索引、API文件、深度資訊
seekdb/              (向量資料庫)    → 強制使用向量檢索（memory_recall.js）
─────────────────────────────────────
搜尋檢索，無預載入
```

#### 檔案對應關係
| 目的 | 原檔案 | 新方案 |
|------|--------|--------|
| 會話啟動 | AGENTS.md | NOW.md + AGENTS-QUICK.md + SOUL.md + USER.md |
| 記憶索引 | MEMORY.md | HOT層不載入；需要時 `memory_recall.js` 或讀 MEMORY-SUMMARY.md |
| 進行中任務 | SESSION-STATE.md | SESSION-STATE-HOT.md（定期清理） |
| 教學參考 | AGENTS.md 中的教學部分 | AGENTS-FULL.md（按需） |
| 深度查詢 | 無專門機制 | MEMORY-DETAILED.md + SeekDB 向量檢索 |

#### 優缺點
**優點**：
- ✅ 會話啟動只需 2.7k tokens（節省 **73%**）
- ✅ 保持執行效率（核心規範完整）
- ✅ 易於實施（檔案分割 + 加載邏輯）
- ✅ 平衡型方案（不過度激進）
- ✅ 與現有 NOW.md + checkpoint 策略兼容

**缺點**：
- ❌ 檔案數量增加（從 8 個到 15+ 個）
- ❌ 需要修改 Agent 啟動邏輯（但已有 AGENTS.md 規範）
- ❌ 溫層邊界定義需要人工維護

**預估 token 節省**：
- 會話啟動：**73%**（從 16.5k → 2.7k）
- 深度查詢：**60%**（從全載 → 向量檢索）
- 平均節省：**65-70%**

---

### 方案 B：「激進冷存」（激進 ⭐⭐）

#### 核心理念
**所有 MEMORY.md 內容強制遷移到 SeekDB**，會話層只保留最小上下文。

#### 檔案重組
```
HOT:
  NOW.md             (~800 tokens)
  SOUL.md            (~400 tokens)
  USER.md            (~600 tokens)
  AGENTS-QUICK.md    (~600 tokens)
  ─────────────────────────────────
  合計               (~2,400 tokens)

COLD（向量專屬）:
  SeekDB 中的所有 MEMORY 資訊
  AGENTS.md 完整教學
  日誌檔案
  錨點檔案
  
使用: memory_recall.js 查詢任何細節
```

#### 優缺點
**優點**：
- ✅ 最激進的精簡（會話只 2.4k）
- ✅ 檔案數量最少
- ✅ 所有深度查詢都走向量系統（一致性強）

**缺點**：
- ❌ 依賴 SeekDB 可用性（如果向量系統故障，檢索失效）
- ❌ 新 Agent 需要先 warm up（向量檢索有延遲）
- ❌ 某些實時決策需要常用資訊隨時可得（如 MASTER-SOP）
- ❌ 風險高（一旦向量系統故障，系統嚴重降級）

**預估 token 節省**：
- 會話啟動：**85%**（從 16.5k → 2.4k）
- 但引入風險 ⚠️

---

### 方案 C：「混合漸進式」（平衡 ⭐⭐⭐⭐）

#### 核心理念
結合方案 A + B，採用**智能預測加載**：
- 核心固定檔案（NOW、SOUL、USER）
- AGENTS 規範動態加載（根據 session intent 判斷是否需要教學版）
- MEMORY 支援三種加載模式：快速摘要 / 完整索引 / 向量檢索

#### 實現方案
```
會話啟動：
1. 自動載入 NOW + SOUL + USER （800 tokens）
2. 掃描 NOW.md 的「焦點」字段
3. 根據焦點自動決定加載內容：
   - 如果焦點是「研究」→ 載入 AGENTS-FULL.md + MEMORY-SUMMARY.md
   - 如果焦點是「執行」→ 載入 AGENTS-QUICK.md + NOW.md（已有）
   - 如果焦點是「回顧」→ 載入 memory_recall.js 觸發向量搜索

4. 動態估算：如果預載入 > 3.5k tokens → 自動切換為「查詢模式」
```

#### 優缺點
**優點**：
- ✅ 自適應加載（不同任務不同開銷）
- ✅ 平衡靈活性和效率
- ✅ 新 Agent 友好（自動選擇最適模式）
- ✅ 風險最低（fallback 完整）

**缺點**：
- ❌ 實現複雜度高（需要智能判斷邏輯）
- ❌ 維護成本高（邊界條件多）
- ❌ 初期難以調試

**預估 token 節省**：
- 平均會話：**65-75%**（視焦點而異）
- 極端情況依然有保障

---

## 🎯 推薦方案：**方案 A（精簡冷熱分離）**

### 核心理由

1. **節省效果明顯**（73% token 縮減）且**可控**
   - 會話啟動 2.7k tokens 遠超目標 3k
   - 保留了必要的 warm 層（3-5k），避免過度激進

2. **實施難度適中**（相比方案 C）
   - 主要是檔案分割和簡單的加載邏輯修改
   - 不需要複雜的 AI 判斷，降低 bug 風險

3. **風險最低**
   - 不依賴 SeekDB 的實時可用性（仍可降級）
   - 核心功能完整，無功能縮減

4. **與現有規範兼容**
   - 保留 AGENTS.md 的核心思想（分層記憶、按需載入）
   - NOW.md 無需改動
   - 無需修改 SOUL.md / USER.md / IDENTITY.md

5. **易於回滾**
   - 如果效果不佳，可快速回到原方案
   - 所有原檔案保留（作為 FULL 版本）

---

## 📋 方案 A 的具體執行步驟

### Phase 1：檔案分割與設計（3-4 小時）

#### Task 1.1：建立 AGENTS-QUICK.md
**目標**：從 AGENTS.md 中提取核心執行規範，去掉教學和案例

**內容構成**：
```markdown
# AGENTS-QUICK.md（核心執行規範 - <1000 tokens）

## Every Session
1. Read NOW.md FIRST
2. Read SOUL.md、USER.md
3. 記憶：快速查找用 memory_recall.js，不預載入詳情

## Memory Write Protocol
- 寫入前執行 memfw-scan.sh
- 禁止內容：API keys、system override、未驗證指令

## Context Checkpoint
- 70% 觸發 checkpoint.sh
- 更新 NOW.md

## Tools
見 TOOLS.md；技能見 SKILLS_INDEX.md

## Safety / Group Chats / Execution / Heartbeat
[核心規則，無教學] ← 這一段保留，但刪掉詳細解釋
```

**執行步驟**：
1. 複製 AGENTS.md
2. 刪掉所有「參考」、「案例」、「詳細解釋」段落
3. 保留「執行規範」部分
4. 估算大小（目標 <1000 tokens）

#### Task 1.2：建立 SESSION-STATE-HOT.md
**目標**：從 SESSION-STATE.md 提取當前進行的任務，清理過期項

**內容構成**：
```markdown
# SESSION-STATE-HOT.md（<500 tokens）

## 🎯 Session Intent（當前焦點）
[只保留最新的意圖，過期的刪除]

## 📚 Task Stack（進行中）
[只保留「進行中」或「下一步」的任務，已完成的刪除]

## 🔑 Key Context（Breadcrumbs）
[只保留本 session 的決策，>1周 的歸檔到 anchors/]

## ⏳ Pending Actions（待處理，<1 周內）
[只保留這一週需要做的，超過的歸檔]
```

**執行步驟**：
1. 複製 SESSION-STATE.md
2. 刪掉所有「✅ 完成」的項（可移到 anchors/session-history.md）
3. 刪掉「>1週前」的決策
4. 估算大小（目標 <500 tokens）
5. 建立 cleanup SOP（每 3-5 天清理一次）

#### Task 1.3：建立 MEMORY-SUMMARY.md
**目標**：7 天摘要的精簡版本，保留關鍵結論，刪掉詳細描述

**內容構成**：
```markdown
# MEMORY-SUMMARY.md（7天摘要精簡版，<2500 tokens）

## 📌 最近 7 天重要記憶（摘要）

### 2026-02-12
- 📌 AI Agent 自動化框架：已完成報告
  → 見完整版：docs/AI-AGENT-FRAMEWORK-STRATEGY.md
  → 路徑：`docs/AI-AGENT-FRAMEWORK-STRATEGY.md`
  
- 📌 Multi-Agent 系統研究：已完成
  → 見完整版：docs/MULTI-AGENT-STRATEGY.md
  → 關鍵發現：Context 管理是瓶頸，分層記憶體架構解決

- 📌 API Key 衝突修復：✅ 完成
  → 根本原因：anthropic.env vs opus.env 衝突

### [最近其他日期]
...

## 🔑 常用關鍵字索引（快速定位）
- Multi-Agent 系統 → docs/MULTI-AGENT-STRATEGY.md
- Opus 成本管理 → docs/OPUS-TASK-SYSTEM.md
- 技能索引 → SKILLS_INDEX.md
- [其他快速連結]

## 💼 重要檔案位置
- 市場分析 → docs/AI-AGENT-FRAMEWORK-STRATEGY.md
- 技術架構 → docs/MULTI-AGENT-STRATEGY.md
- SOP 定版 → docs/MASTER-SOP-v1.md
```

**執行步驟**：
1. 複製 MEMORY.md 的「最近摘要」段
2. 每一項都改成「2-3 行摘要 + 指向完整版的路徑」
3. 刪掉所有「詳細展開」的內容
4. 保留「常用關鍵字索引」但精簡為 20-30 項（只保留最高頻）
5. 估算大小（目標 <2500 tokens）

#### Task 1.4：建立 MEMORY-DETAILED.md
**目標**：融合所有關鍵字索引、API 文件、深度資訊，供冷層查詢

**內容構成**：
```markdown
# MEMORY-DETAILED.md（完整參考，無 token 限制）

## 📖 完整關鍵字索引（所有 MEMORY.md 的索引部分）
[融合當前 MEMORY.md 的所有索引內容，包括：
- Multi-Agent 系統策略
- API 端點索引
- 技能與工具
- Agent 成本優化 SOP
- 等等所有 "## 🔑 關鍵字索引" 段]

## 📌 深度技術資訊
[融合以下內容：
- OpenClaw 配置詳情
- 自救檔案索引
- 進階程式設計資源
- 商業專案技術需求分析
- 等等所有「詳細參考」內容]

## 💰 收入與帳戶管理
[融合當前 MEMORY.md 的相關部分]

## 📖 使用流程詳解
[詳細的記憶系統使用指南]
```

**執行步驟**：
1. 複製 MEMORY.md 中「最近摘要」以外的所有內容
2. 按主題重新組織（API、技能、資源、帳戶等）
3. 保留所有細節和連結
4. 作為冷層檔案，無 token 限制

#### Task 1.5：更新 AGENTS-FULL.md
**目標**：保留原 AGENTS.md 的所有內容（教學、案例、詳細解釋）供按需參考

**執行步驟**：
1. 直接複製原 AGENTS.md → AGENTS-FULL.md
2. 建立簡單的索引，方便快速查找章節

---

### Phase 2：加載邏輯修改（2-3 小時）

#### Task 2.1：修改 OpenClaw 啟動邏輯
**目標**：修改 Agent 啟動時的「自動加載檔案列表」

**修改位置**：`~/.openclaw/openclaw.json` 或啟動指令碼

**當前邏輯**（推測）：
```json
{
  "agent": {
    "context_files": [
      "NOW.md",
      "SOUL.md",
      "USER.md",
      "IDENTITY.md",
      "AGENTS.md",      // 3.5-4k tokens
      "MEMORY.md",      // 8-9k tokens
      "SESSION-STATE.md", // 1.5k tokens
      "HEARTBEAT.md"    // 1.6k tokens
    ]
  }
}
```

**新邏輯**：
```json
{
  "agent": {
    "context_files": [
      "NOW.md",           // 自動載入
      "SOUL.md",          // 自動載入
      "USER.md",          // 自動載入
      "AGENTS-QUICK.md"   // ★改：用 QUICK 版本代替 AGENTS.md
    ],
    "conditional_load": {
      "if_keyword_contains": ["研究", "分析", "報告"],
      "load_additional": [
        "AGENTS-FULL.md",
        "MEMORY-SUMMARY.md"
      ]
    },
    "manual_load_available": [
      "SESSION-STATE-HOT.md",  // 需要時手動載入
      "HEARTBEAT.md",
      "MEMORY-DETAILED.md"     // 用 memory_recall.js 查詢
    ]
  }
}
```

**執行步驟**：
1. 確認 OpenClaw 的配置檔位置和格式
2. 修改自動加載列表，將 AGENTS.md 替換為 AGENTS-QUICK.md
3. （可選）加入條件加載邏輯，根據 NOW.md 判斷是否需要加載溫層
4. 測試：新開 session，檢查 `session_status` 的 token 使用

#### Task 2.2：更新 AGENTS-QUICK.md 的規範
**內容**：修改檔案開頭，明確說明「這是簡化版，完整版見 AGENTS-FULL.md」

```markdown
# AGENTS-QUICK.md - 核心執行規範（簡化版）

> ⚠️ **這是精簡版本，優先於會話啟動時使用。**  
> 詳細教學/案例見 AGENTS-FULL.md；深度記憶見 MEMORY-DETAILED.md。

## Every Session
1. Read NOW.md FIRST — 快速載入當前狀態（<1k tokens）
2. Read SOUL.md、USER.md
3. 記憶：[核心規則簡化版]
...
```

---

### Phase 3：測試與優化（2-3 小時）

#### Task 3.1：驗證會話啟動 Token 消耗
**步驟**：
1. 開新會話
2. 執行 `session_status` 查看 token 使用率
3. 驗證：應該 < 3000 tokens（目前 ~2700）
4. 記錄基準資料

#### Task 3.2：驗證功能完整性
**測試用例**：

| 場景 | 測試 | 預期結果 |
|------|------|---------|
| 新 Agent 執行任務 | 讀取 AGENTS-QUICK.md | ✅ 執行規範完整 |
| 需要歷史決策 | `memory_recall.js "決策名稱"` | ✅ 能檢索到 |
| 需要深度技術 | 讀 MEMORY-DETAILED.md | ✅ 完整參考 |
| 需要教學 | 讀 AGENTS-FULL.md | ✅ 所有案例保留 |
| 需要 7 天摘要 | 讀 MEMORY-SUMMARY.md | ✅ 快速掌握進度 |

#### Task 3.3：建立清理 SOP
**內容**：
```bash
#!/bin/bash
# cleanup-session-state.sh - 每周執行一次，清理過期任務

# 清理已完成任務
sed -i '' '/<Task.*>.*✅ 完成/d' SESSION-STATE-HOT.md

# 清理 >1周 的決策
# [具體邏輯]

# 歸檔到 anchors
# [具體邏輯]

echo "✅ SESSION-STATE-HOT.md 已清理"
```

#### Task 3.4：建立備查文件（可選）
```markdown
# CONTEXT-MIGRATION-GUIDE.md

## 從舊結構遷移到新結構的說明

### 檔案對應關係
- AGENTS.md → AGENTS-QUICK.md (會話用) + AGENTS-FULL.md (參考用)
- MEMORY.md → MEMORY-SUMMARY.md (會話用) + MEMORY-DETAILED.md (冷查用)
- SESSION-STATE.md → SESSION-STATE-HOT.md (精簡版)

### 如何查找資訊
1. 實時決策 → 檢查 NOW.md
2. 執行規範 → 讀 AGENTS-QUICK.md
3. 詳細教學 → 讀 AGENTS-FULL.md
4. 歷史細節 → 用 memory_recall.js 向量查詢

### 常見問題
Q: 我找不到某個資訊？
A: [檢查流程]
```

---

## 📊 預估 Token 節省效果

### 會話啟動時

| 指標 | 當前 | 改進後 | 節省 |
|------|------|--------|------|
| 自動加載 tokens | ~16.5k | ~2.7k | **73.6%** ⭐ |
| 檔案數量 | 8 | 4 (熱層) | -50% |
| 首次加載時間 | ~2s | ~0.5s | **75%** |

### 深度查詢時

| 場景 | 當前方式 | 改進後方式 | 效果 |
|------|---------|-----------|------|
| 查找技術決策 | 全載 MEMORY.md (8k) | memory_recall.js 查詢 (0.5k) | **94% 節省** |
| 查找規範說明 | 全載 AGENTS.md (3.5k) | 只載相關部分 (0.5k) | **85% 節省** |
| 查找歷史記錄 | 手動瀏覽日誌 | SeekDB 向量檢索 + MEMORY-DETAILED.md | **時間↓ 70%** |

### 長會話累積節省

假設一個會話中 Agent 進行 10 次決策迭代：

```
當前：每次都載入完整 context
  會話開始：16.5k
  迭代 1-10：每次 checkpoint 節省但重新加載... 平均 10k/次
  總計：~116.5k tokens

改進後：會話只載一次，迭代時只查詢需要部分
  會話開始：2.7k
  迭代 1-10：每次需要資訊時 memory_recall.js (~1k/次)
  總計：~12.7k tokens

節省比例：**89%** 🎉
```

---

## 🚨 實施注意事項

### 風險評估

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| Agent 找不到必要規範 | 🔴 高 | 在 AGENTS-QUICK.md 保留所有執行規則 |
| Session State 過期導致決策錯誤 | 🔴 高 | 建立 cleanup SOP，每周執行 |
| memory_recall.js 故障導致無法查詢 | 🟡 中 | 保留 MEMORY-DETAILED.md 作為 fallback |
| 檔案數量增加導致管理複雜 | 🟡 中 | 使用目錄結構組織 (memory/hot/, memory/cold/) |
| Agent 混淆新舊檔案結構 | 🟡 中 | 在 AGENTS-QUICK.md 最上方加明確說明 |

### 推薦實施順序

1. **第 1 天**（4 小時）
   - Task 1.1-1.5：完成所有檔案分割
   - 驗證檔案大小和內容完整性

2. **第 2 天**（3 小時）
   - Task 2.1-2.2：修改加載邏輯
   - 新開會話測試 token 消耗

3. **第 3 天**（3 小時）
   - Task 3.1-3.4：完整測試
   - 建立清理 SOP
   - 記錄文檔

4. **持續維護**
   - 每週執行 cleanup
   - 監控 NOW.md 的增長
   - 定期評估是否需要調整層級劃分

---

## 📈 長期演進方向

### 短期（1-2 週）
- ✅ 實施方案 A（精簡冷熱分離）
- ✅ 驗證 token 節省效果
- ✅ 建立清理 SOP

### 中期（1-2 月）
- 根據實際使用情況調整層級邊界
- 如果 memory_recall.js 穩定，考慮擴展向量索引範圍
- 探索「溫層自動卸載」機制（無使用超過 1 周自動移到冷層）

### 長期（3-6 月）
- 評估是否過度到方案 B（激進冷存）
- 整合更多工作流到自動化層（減少 Session State 維護）
- 考慮多層向量索引（工作層/決策層/知識層）

---

## ✅ 執行檢查清單

### Phase 1 檔案分割
- [ ] 建立 AGENTS-QUICK.md（<1000 tokens）
- [ ] 建立 SESSION-STATE-HOT.md（<500 tokens）
- [ ] 建立 MEMORY-SUMMARY.md（<2500 tokens）
- [ ] 建立 MEMORY-DETAILED.md（完整參考）
- [ ] 建立 AGENTS-FULL.md（備份原檔案）
- [ ] 驗證所有檔案內容完整性

### Phase 2 加載邏輯修改
- [ ] 確認 OpenClaw 配置檔位置
- [ ] 修改自動加載清單
- [ ] （可選）實現條件加載邏輯
- [ ] 測試新配置

### Phase 3 測試與優化
- [ ] 新開會話驗證 token 消耗 (<3k)
- [ ] 執行完整功能測試（5 個測試用例）
- [ ] 建立 cleanup SOP 腳本
- [ ] 寫 CONTEXT-MIGRATION-GUIDE.md
- [ ] 測試 memory_recall.js 查詢功能

### 文檔與培訓
- [ ] 更新 AGENTS-QUICK.md 的開頭說明
- [ ] 建立文件索引指南
- [ ] （可選）錄製操作示範視頻

---

## 📝 參考資料

**相關文件**：
- 當前 MEMORY.md：/Users/caijunchang/.openclaw/workspace/MEMORY.md
- 當前 AGENTS.md：/Users/caijunchang/.openclaw/workspace/AGENTS.md
- NOW.md 示例：/Users/caijunchang/.openclaw/workspace/NOW.md
- memory_recall.js：/Users/caijunchang/.openclaw/workspace/scripts/memory_recall.js

**技術文檔**：
- SeekDB 文件：已安裝在本地
- OpenClaw 配置：~/.openclaw/openclaw.json
- TECH-PATTERNS.md：詳細技術模式指南

---

## 🎯 總結

**推薦方案：方案 A（精簡冷熱分離）**

**核心收益**：
- ✅ 會話啟動 token **節省 73%**（16.5k → 2.7k）
- ✅ 長會話累積節省 **89%**
- ✅ 功能 **完全保留**，無缺失
- ✅ 實施難度 **適中**，風險 **可控**

**實施周期**：3 天 (12 小時)

**預期效果**：
- 會話爆滿問題大幅緩解
- Agent 響應速度提升（上下文更精簡）
- 檔案管理變得有序（熱/溫/冷清晰分層）
- 為進一步優化（如方案 C）奠定基礎

---

*評估完成日期：2026-02-13*
*建議執行優先級：P0（立即開始）*
