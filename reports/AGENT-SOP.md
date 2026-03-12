# Agent 技術傳承 SOP v1.0

> 專家 Agent 團隊的知識傳承與協作標準流程

---

## 一、傳承文件架構

每個專家 Agent 必須擁有以下文件：

```
experts/<expert-name>/
├── EXPERT.md          # 專家職責與能力定義
├── PLAYBOOK.md        # 標準操作流程 (SOP)
├── RUNBOOK.md         # 故障排除與應急處理
├── DECISION_LOG.md    # 重要決策記錄
├── CHECKLIST.md       # 任務執行檢查清單
└── templates/         # 常用模板
    ├── report-template.md
    ├── analysis-template.md
    └── handoff-template.md
```

---

## 二、技術傳承流程

### Phase 1: 知識提取 (Knowledge Extraction)
```
執行專家發現問題/解決方案
        ↓
    記錄到 DECISION_LOG.md
        ↓
    標記傳承價值 (高/中/低)
        ↓
   高價值 → 進入 Phase 2
```

### Phase 2: 知識結構化 (Structuring)
```
提取關鍵資訊：
├── 背景 (Context)
├── 問題 (Problem)
├── 解決方案 (Solution)
├── 決策理由 (Rationale)
├── 替代方案 (Alternatives)
└── 教訓 (Lessons)
```

### Phase 3: 知識驗證 (Validation)
- [ ] 技術正確性檢查
- [ ] 可重複執行驗證
- [ ] 文件完整性檢查
- [ ] 相關專家審查

### Phase 4: 知識發布 (Publication)
- 更新 PLAYBOOK.md
- 通知相關專家
- 標記版本號
- 歸檔到知識庫

---

## 三、專家協作介面

### 任務交接標準格式

```markdown
## 任務交接單

**交接類型**: [指派 / 協作 / 升級]
**來源專家**: <name>
**目標專家**: <name>
**時間**: <timestamp>

### 上下文摘要
<3-5句話說明背景和當前狀態>

### 已完成工作
- [x] <完成項目 1>
- [x] <完成項目 2>

### 待處理項目
- [ ] <待辦 1> - 優先級: P0/P1/P2
- [ ] <待辦 2> - 優先級: P0/P1/P2

### 已知風險
- <風險 1> - 緩解措施: <措施>
- <風險 2> - 緩解措施: <措施>

### 相關文件
- <檔案路徑 1>
- <檔案路徑 2>

### 決策記錄
- <關鍵決策 1>
- <關鍵決策 2>
```

### 跨專家協作模式

| 場景 | 協作方式 | 負責專家 |
|------|---------|---------|
| 複雜 Bug | DebugMaster 診斷 → Cursor 修復 | DebugMaster 主導 |
| 架構重構 | ArchGuard 設計 → SkillSmith 實現 | ArchGuard 主導 |
| 資料問題 | DataSage 分析 → FlowWeaver 流程修復 | DataSage 主導 |
| 安全事件 | SecShield 檢測 → DebugMaster 根因分析 | SecShield 主導 |
| 效能優化 | DebugMaster 分析 → ArchGuard 優化方案 | 共同主導 |

---

## 四、能力補強計畫

### 技能評估矩陣

每季度評估各專家的：
- 核心能力熟練度 (1-5分)
- 工具掌握程度 (1-5分)
- 文件完整度 (1-5分)
- 協作效率 (1-5分)

### 補強機制

| 評分 | 狀態 | 行動 |
|------|------|------|
| 4-5分 | 優秀 | 擔任導師，輸出最佳實踐 |
| 3分 | 合格 | 持續優化，定期複習 |
| 1-2分 | 需補強 | 制定學習計畫，安排培訓 |

---

## 五、除錯專家 DebugMaster 完整設計

### 職責範圍

```yaml
core_responsibilities:
  - 日誌分析與錯誤分類
  - 系統狀態診斷
  - 根因分析 (RCA)
  - 修復方案設計
  - 安全清理與優化
  - 預防機制建立

escalation_rules:
  簡單問題: "自動修復，記錄到日誌"
  複雜問題: "產生報告，升級給 Cursor/CoDEX"
  架構問題: "通知 ArchGuard，協作處理"
  安全問題: "立即通知 SecShield，共同處理"
```

### 標準工作流程

```
接收問題
    ↓
初步分類 (5分鐘內)
    ↓
┌─────────┴─────────┐
↓                   ↓
簡單問題            複雜問題
↓                   ↓
自動診斷            深度分析
↓                   ↓
自動修復            產生報告
↓                   ↓
驗證結果            升級給其他專家
↓                   ↓
回報完成            追蹤處理進度
```

### 工具箱設計

```bash
experts/debug-master/scripts/
├── diagnose.sh           # 系統診斷入口
├── log-analyzer.sh       # 日誌分析器
├── error-classifier.js   # 錯誤分類器
├── root-cause.sh         # 根因分析
├── cleanup-safe.sh       # 安全清理
├── memory-check.sh       # 記憶體檢查
└── report-generator.sh   # 報告生成
```

---

## 六、執行時間表

| 階段 | 時間 | 任務 |
|------|------|------|
| Week 1 | Day 1-2 | 建立 DebugMaster 基礎技能 |
| Week 1 | Day 3-5 | 建立 ArchGuard 設計框架 |
| Week 2 | Day 1-3 | 補強 SkillSmith 與 FlowWeaver |
| Week 2 | Day 4-5 | 建立 DataSage 資料處理能力 |
| Week 3 | Day 1-2 | 整合測試與協作流程驗證 |
| Week 3 | Day 3-5 | 編寫完整文件與培訓材料 |

---

*版本: v1.0 | 建立時間: 2026-02-12 | 負責: Opus 4.6*
