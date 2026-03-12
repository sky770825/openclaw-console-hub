# Context 優化最佳實踐

> 如何高效管理 AI 會話 Context，避免 token 爆滿與成本失控

---

## 目錄
1. [Context 是什麼？](#context-是什麼)
2. [Checkpoint 觸發機制](#checkpoint-觸發機制)
3. [Context 壓縮策略](#context-壓縮策略)
4. [記憶檢索優化](#記憶檢索優化)
5. [實戰工作流程](#實戰工作流程)

---

## Context 是什麼？

Context（上下文）是 AI 能「看到」的所有資訊，包括：

| 來源 | 內容 | 估算大小 |
|------|------|---------|
| **System Prompt** | 技能定義、工具說明、核心指令 | 25-30k |
| **Skills** | 載入的 SKILL.md 內容 | 15-20k |
| **對話歷史** | 已發生的問答紀錄 | 50-60k |
| **Project Context** | AGENTS.md, SOUL.md, USER.md | ~2k |
| **工具輸出** | 搜尋結果、檔案內容、執行輸出 | 變動大 |

**總限制**：131k tokens（以 Kimi K2.5 為例）

### Context 爆炸的徵兆

- AI 回應變慢（>30 秒）
- 忘記對話前半部的內容
- 工具呼叫失敗或無回應
- 出現「Context 已滿」警告

---

## Checkpoint 觸發機制

Checkpoint 是「存檔點」，在 Context 危急時保存進度，讓你能安全開新會話繼續。

### 自動觸發門檻

| Context 使用率 | Tokens | 動作 |
|---------------|--------|------|
| 🟢 **< 50%** | < 65k | 正常運作，無需處理 |
| 🟡 **50-60%** | 65-78k | 新任務優先 spawn 子 Agent |
| 🟠 **60-70%** | 78-91k | **主動建議 `/new`** |
| 🔴 **70%** | ~91k | **強制執行 checkpoint** |
| 🚨 **≥ 85%** | ≥ 111k | **禁全量輸出 + 強制開新會話** |

### Checkpoint 執行指令

```bash
# 手動建立檢查點（在任務關鍵步驟前）
./scripts/checkpoint.sh create "任務名稱" "步驟描述"

# 範例
./scripts/checkpoint.sh create "PDF 處理" "合併前備份"

# 列出所有檢查點
./scripts/checkpoint.sh list

# 回滾到上一個檢查點
./scripts/checkpoint.sh rollback
```

### Checkpoint 包含什麼？

```
~/Desktop/小蔡/檢查點/
├── MM/DD_HH:MM-步驟名稱/
│   ├── backup.tar.gz      # 打包的備份
│   └── meta.json          # 檢查點元數據
└── checkpoint-db.json     # 檢查點索引
```

備份內容：
- `~/.openclaw/config/`
- `~/.openclaw/openclaw.json`
- `~/.openclaw/memory/`
- 指定的目標資料夾（`CHECKPOINT_TARGET`）

---

## Context 壓縮策略

當 Context 超過門檻，採取以下壓縮措施：

### 1. 對話歷史壓縮（70k 強制摘要）

**保留**：
- 用戶核心需求與目標
- 已確認的決策與結論
- 待辦事項與進行中任務

**捨棄**：
- 中間試錯過程
- 工具輸出的原始碼
- 已完成的子任務細節
- 錯誤與修正過程

**摘要格式**：
```markdown
[對話摘要]
- 目標：XXX
- 已完成：A, B, C
- 待處理：Y, Z
- 關鍵決策：使用 X 方案而非 Y
```

### 2. 工具輸出壓縮

| 工具 | 壓縮方法 |
|------|---------|
| `web_fetch` | 設 `maxChars: 5000` |
| `exec` | 只取前 20 行關鍵輸出 |
| `read` | 用 `limit`/`offset` 分段讀取 |
| `web_search` | 取前 3 個結果而非全部 |

**範例**：
```javascript
// 壓縮前（可能 10k+ tokens）
const result = await web_fetch({ url: "..." });

// 壓縮後（限制 5k tokens）
const result = await web_fetch({ 
  url: "...", 
  maxChars: 5000 
});
```

### 3. 開新會話（/new）

當 Context ≥ 70%，執行以下流程：

```
1. 摘要當前對話（關鍵結論）
2. 執行 checkpoint（保存進度）
3. 告知用戶建議 /new
4. 用戶執行 /new
5. 新會話載入摘要，繼續任務
```

**>85% 禁全量輸出規範**：
- ❌ 禁止輸出完整對話歷史
- ❌ 禁止長篇解釋（只給結論）
- ❌ 禁止多輪來回（單輪完成或開 /new）
- ✅ 工具輸出強制截斷

### 4. Skills 數量控制

每個載入的 Skill 約佔 1-2k tokens：

```bash
# 查看目前載入的 skills
ls ~/.openclaw/workspace/skills/

# 建議保留的核心 Skills（6-8 個）
核心清單：
- skill-creator      # 技能開發
- healthcheck        # 安全檢查
- session-logs       # 日誌分析
- github             # GitHub 操作
- tavily-search      # 網路搜尋
- playwright-scraper # 網頁抓取
```

**可考慮禁用的 Skills**：
- `apple-notes`, `apple-reminders`, `things-mac`（系統整合類）
- `weather`, `video-frames`（單一功能類）
- `himalaya`, `imsg`（通訊類，除非常用）

---

## 記憶檢索優化

### 預載白名單（開機必讀）

| 優先級 | 檔案 | 大小 | 說明 |
|--------|------|------|------|
| P0 | `AGENTS.md` | ~1k | 工作指南 |
| P0 | `SOUL.md` | ~500 | 人設與風格 |
| P0 | `USER.md` | ~500 | 老蔡檔案 |
| P1 | `MEMORY.md` | ~2k | 速查表（只讀索引段落）|
| P2 | `HEARTBEAT.md` | 變動 | 心跳任務（若空則跳過）|

**非白名單**（按需才讀）：
- `docs/` 其他文件
- `memory/*.md`（透過 QMD 搜尋）
- Session 歷史

### 深度記憶檢索（向量搜尋）

不要整檔讀入，使用 QMD 搜尋：

```bash
# 搜尋相關記憶
node scripts/memory_recall.js "查詢關鍵字"

# 或直接使用 qmd
qmd search "關鍵字" --collection memory
```

**工作流程**：
```
用戶詢問 → AI 判斷需要記憶 → QMD 搜尋相關段落 → 只載入相關內容
```

### 子 Agent 記憶隔離

Spawn 子 Agent 時，**不要傳遞完整 Context**：

```javascript
// ❌ 錯誤：傳遞太多 context
spawn({
  task: "...",
  context: fullConversationHistory  // 爆炸！
});

// ✅ 正確：只給必要資訊
spawn({
  task: "研究 XXX，重點關注 Y",
  label: "research-xxx"
});
```

### 回收摘要規範

子 Agent 回傳後，主會話只保留：

```markdown
## 研究結果（來自 research-xxx）
- 結論：...
- 關鍵數據：...
- 詳見：memory/2026-02-14-research-xxx.md
```

詳細內容寫入檔案，**不要留在 Context**。

---

## 實戰工作流程

### 場景 1：長篇研究任務

```
用戶：研究台灣電動車市場現況與趨勢

AI（Context 10%）：
├── Spawn 子 Agent A（市場規模研究）
├── Spawn 子 Agent B（競爭分析）
├── Spawn 子 Agent C（政策法規）
└── 等待結果

...子 Agent 執行中（Context 不增加）...

AI（Context 20%，收到結果）：
├── 整合三份報告
├── 寫入 memory/2026-02-14-ev-market.md
├── 摘要關鍵發現給用戶
└── Context 維持 25%
```

### 場景 2：Context 超標處理

```
用戶：繼續處理剛才的任務...

AI（檢測到 Context 72%）：
├── 執行 checkpoint
│   └── ./scripts/checkpoint.sh create "任務名" "Context 超標前"
├── 對話摘要：
│   - 目標：完成 XXX
│   - 進度：已完成 A, B，進行中 C
│   - 關鍵決策：使用 Y 方案
├── 告知用戶：
│   "Context 較高，建議執行 /new 後繼續。
│    已建立檢查點，摘要如下：..."
└── 用戶執行 /new

新會話（Context 15%）：
├── 載入摘要
├── 繼續任務 C
└── Context 維持健康
```

### 場景 3：多輪對話優化

```
監控指標（每 5 輪計算 p95）：

| 指標 | 健康門檻 | 超標處理 |
|------|---------|---------|
| p95 Context% | < 70% | 下一輪強制摘要 |
| p95 Tokens In | < 80k | 檢查冗餘載入 |
| Spawn Rate | > 30% | 維持現狀 |
```

---

## 快速參考卡

### Context 管理口訣

```
「70k 強制摘要、85k 禁輸出、
  白名單啟動、5輪看 p95」
```

### 緊急處理流程

| 緊急程度 | Context | 執行動作 |
|---------|---------|---------|
| 🟢 正常 | < 70k | 照常運作 |
| 🟡 注意 | 70-85k | 強制摘要 + 建議 /new |
| 🔴 緊急 | ≥ 85k | 禁全量 + checkpoint + 強制 /new |

### 常用指令

```bash
# 檢查當前 Context
openclaw status | grep Context

# 建立檢查點
./scripts/checkpoint.sh create "任務" "步驟"

# 搜尋記憶（不載入整檔）
node scripts/memory_recall.js "關鍵字"

# 開新會話（清除對話歷史）
# 在 OpenClaw 聊天中輸入: /new
```

### 壓縮檢查清單

- [ ] 對話歷史是否已摘要？
- [ ] 工具輸出是否設 `maxChars`？
- [ ] 大檔案是否用 `limit`/`offset` 分段讀取？
- [ ] 非必要 Skills 是否已禁用？
- [ ] 子 Agent 是否只傳必要 context？
- [ ] Checkpoint 是否已建立？

---

## 總結

| 策略 | 效果 | 實施難度 |
|------|------|---------|
| 減少 Skills 載入 | -10k ~ -15k | ⭐ 簡單 |
| 定期 `/new` | -50k ~ -60k | ⭐ 簡單 |
| 工具輸出限制 | -5k ~ -10k | ⭐⭐ 中等 |
| 對話自動摘要 | -20k ~ -30k | ⭐⭐⭐ 複雜 |
| 記憶向量檢索 | -5k ~ -10k | ⭐⭐ 中等 |

**核心原則**：
1. **Write**：中間結果寫入檔案，不要留在對話
2. **Select**：按需載入，不要預載所有東西
3. **Compress**：超過門檻就摘要/截斷
4. **Isolate**：複雜任務 spawn 子 Agent

---

> 📚 **相關文件**：
> - `docs/CONTEXT-OPTIMIZATION-PLAN.md` - 優化計畫詳情
> - `docs/CONTEXT-ENGINEERING.md` - 上下文工程規範
> - `scripts/checkpoint.sh` - Checkpoint 工具
