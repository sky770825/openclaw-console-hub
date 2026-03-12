# 記憶系統 v2 快速參考

## 三層架構總覽

```
┌────────────────────────────────────────┐
│  SESSION-STATE.md                      │
│  熱記憶（像 RAM，Session 專用）          │
│  • 當前任務堆疊（Task Stack）           │
│  • 會話意圖（Session Intent）           │
│  • 麵包屑線索（Breadcrumbs）            │
│  • 待辦事項（Pending）                  │
└────────────────────────────────────────┘
                   ↓ 完成任務
┌────────────────────────────────────────┐
│  memory/anchors/anchor-xxx.md          │
│  錨點檔案（任務完整歷史）                │
│  • 為什麼做（背景）                      │
│  • 做了什麼（過程）                      │
│  • 結果如何（結論）                      │
│  • 可重建完整上下文                      │
└────────────────────────────────────────┘
                   ↓ 定期摘要
┌────────────────────────────────────────┐
│  MEMORY.md                             │
│  冷記憶（長期索引）                      │
│  • 7天摘要（快速回顧）                   │
│  • 關鍵字索引（快速查找）                │
│  • 歸檔機制（7天後轉存）                 │
└────────────────────────────────────────┘
```

## 何時寫入哪一層？

| 場景 | 寫入位置 | 例子 |
|------|---------|------|
| 當前任務進度 | SESSION-STATE.md | Task Stack 更新 |
| 找到重要參考 | SESSION-STATE.md → Breadcrumbs | Factory.ai 文檔連結 |
| 完成一個任務 | anchors/anchor-xxx.md | 改進記憶系統完成 |
| 每日重要事件 | MEMORY.md → 最近摘要 | 2026-02-11 完成 v2 架構 |
| 關鍵決策/教訓 | MEMORY.md → 關鍵字索引 | 停用 Trello |

## Breadcrumbs 怎麼寫？

**不要這樣寫**（塞完整內容）：
```
❌ Factory.ai 說：「LLMs attend only to the tokens...」
```

**要這樣寫**（只寫線索）：
```
✅ 參考：Factory.ai「Compressing Context」文檔
   關鍵概念：Anchor Messages、雙閾值機制
   連結：https://factory.ai/news/compressing-context
```

## Task Stack 格式

```markdown
| Level | Task | Status | Anchor Point |
|-------|------|--------|--------------|
| 0 | 主要目標 | 🟡 進行中 | `anchor://xxx` |
| 1 | 子任務 A | ✅ 完成 | - |
| 1 | 子任務 B | 🟡 進行中 | - |
| 2 | 子子任務 | ⏸️ 暫停 | - |
```

符號說明：
- ✅ 完成
- 🟡 進行中
- ⏸️ 暫停
- 🔴 阻塞

## 常用路徑

```bash
# 熱記憶
~/.openclaw/workspace/SESSION-STATE.md

# 冷記憶索引
~/.openclaw/workspace/MEMORY.md

# 錨點檔案
~/.openclaw/workspace/memory/anchors/

# 每日記錄
~/.openclaw/workspace/memory/YYYY-MM-DD.md

# 歸檔
~/.openclaw/workspace/memory/archive/
```

## 記憶生命週期

```
對話進行 → SESSION-STATE（即時更新）
    ↓
任務完成 → 建立錨點檔案（完整記錄）
    ↓
每日結束 → 摘要寫入 MEMORY（快速回顧）
    ↓
7天後 → 移入 archive（長期保存）
```

---

*記憶系統 v2 | 2026-02-11*
