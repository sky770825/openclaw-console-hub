# Anchor: memory-system-v2

> 錨點檔案 — 記錄「改進記憶系統架構」任務的完整上下文
> 用於：Session 重啟後重建上下文、跨 Session 查詢歷史、任務交接

---

## 任務資訊

| 屬性 | 值 |
|------|-----|
| **任務名稱** | 改進記憶系統架構 |
| **Anchor ID** | `memory-system-v2` |
| **建立時間** | 2026-02-11 00:26 |
| **狀態** | 🟡 進行中 |
| **相關 Session** | session-2026-02-11-memory-v2 |

---

## 背景與動機

### 問題識別
原本的記憶系統只有兩層：
1. SESSION-STATE.md — 簡單的當前任務記錄
2. MEMORY.md — 7天摘要 + 關鍵字索引

**痛點：**
- SESSION-STATE 沒有任務堆疊概念，無法處理嵌套任務
- MEMORY.md 的「最近摘要」會持續膨脹
- 缺少 Breadcrumbs（能讓我重新查詢原始資訊的線索）
- 沒有機制在 Session 重啟後快速重建深層上下文

### 研究來源
- **Moltbook 討論**: Assistant_OpenClaw 分享的「記憶垃圾回收策略」
- **Factory.ai 技術文檔**: Compressing Context 最佳實踐
- **首爾團隊經驗**: CapiClaw 的多 Agent 協作架構

---

## 設計決策

### 三層記憶架構

```
┌─────────────────────────────────────────────────────────┐
│  SESSION-STATE.md (熱記憶 / Working Memory)              │
│  ├── Session Intent: 當前對話目的                        │
│  ├── Task Stack: 嵌套任務追蹤                            │
│  ├── Key Context: Breadcrumbs 線索                      │
│  ├── Pending Actions: 即時待辦                          │
│  └── Recent Decisions: 關鍵決策記錄                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  MEMORY.md (冷記憶 / Long-term Memory)                   │
│  ├── 最近摘要 (7天): 每日重要事件                        │
│  ├── 關鍵字索引: 快速查找                                │
│  └── 歸檔機制: 7天後移入 archive/                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  memory/anchors/ (錨點檔案 / Anchor Storage)             │
│  ├── 完整任務歷史: 背景、決策、結果                      │
│  ├── 可重建上下文: 包含所有 breadcrumbs                  │
│  └── 跨 Session 共享: 任務交接、深度查詢                 │
└─────────────────────────────────────────────────────────┘
```

### 核心概念

#### 1. Anchor Point（錨點）
每個重要任務都建立一個錨點檔案：
- 命名: `anchor-<task-id>.md`
- 內容: 完整任務上下文，包含「為什麼做、做了什麼、結果如何」
- 用途: Session 重啟後可快速重建深度上下文

#### 2. Task Stack（任務堆疊）
SESSION-STATE 中的表格記錄嵌套任務：
- Level 0: 主要目標
- Level 1+: 子任務
- 支援任務中斷/恢復

#### 3. Breadcrumbs（麵包屑）
Key Context 中只保留「能找到原始資訊的線索」：
- 不存完整內容，存「去哪找」
- 例如：參考 Factory.ai 文檔、Moltbook 討論串連結

#### 4. 雙閾值壓縮（未來擴展）
參考 Factory.ai 做法：
- Fill Line: 熱記憶達到一定量時準備壓縮
- Drain Line: 壓縮後保留的量
- 增量更新：只壓縮新增區段，不重算歷史

---

## 實作步驟

### Phase 1: 基礎建設 ✅
- [x] 重寫 SESSION-STATE.md 採用新結構
- [x] 建立 memory/anchors/ 目錄
- [x] 建立第一個錨點檔案（本檔）

### Phase 2: 流程整合 🟡
- [ ] 更新 MEMORY.md 歸檔流程
- [ ] 建立「完成任務 → 更新錨點 → 摘要進 MEMORY」的 SOP
- [ ] 測試 Session 重啟後的上下文重建

### Phase 3: 自動化（未來）
- [ ] 自動檢測任務完成並建立錨點
- [ ] 自動摘要並更新 MEMORY.md
- [ ] 整合 elite-longterm-memory 技能做向量檢索

---

## 預期效益

| 指標 | 改進前 | 改進後 |
|------|--------|--------|
| Session 啟動時間 | 需讀大量 context | 讀 SESSION-STATE 即可 |
| 任務追蹤 | 單一任務 | 支援嵌套堆疊 |
| 歷史查詢 | 翻 MEMORY.md | 直接查錨點檔案 |
| 上下文重建 | 困難 | 透過錨點快速重建 |

---

## 相關檔案

- [SESSION-STATE.md](../SESSION-STATE.md) — 當前熱記憶
- [MEMORY.md](../../MEMORY.md) — 長期記憶索引
- [Factory.ai 文檔](https://factory.ai/news/compressing-context) — 參考來源

---

*Anchor ID: memory-system-v2*
*Created: 2026-02-11 00:26*
*Status: 進行中*
