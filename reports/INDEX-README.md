# 記憶庫索引系統 v2

## 概述

本系統為記憶庫建立統一索引與分類，提升搜尋效率。

- **總檔案數**: 178 個
- **分類數**: 11 個類別
- **生成時間**: 2026-02-14
- **任務 ID**: memory-index-20260214

---

## 📁 分類結構

```
memory/
├── INDEX-v2.md          # 新版 Markdown 索引
├── INDEX-v2.json        # 新版 JSON 索引
├── qmd.md               # 快速搜尋導航
├── decisions/           # 戰略決策 (3)
├── learnings/           # 學習記錄 (6)
├── tasks/               # 任務追蹤 (113)
├── results/             # 執行結果 (9)
├── specs/               # 技術規格 (14)
├── system/              # 系統檔案 (8)
├── anchors/             # 錨點檔案 (3)
├── checkpoints/         # 檢查點 (10)
├── intelligence/        # 情報分析 (5)
└── archive/             # 已歸檔 (5)
```

---

## 🚀 快速開始

### 1. 查看統計

```bash
./scripts/memory_search.sh stats
```

### 2. 搜尋檔案

```bash
# 搜尋特定類別
./scripts/memory_search.sh specs insightpulse

# 搜尋所有檔案
./scripts/memory_search.sh all autopilot

# 顯示最近檔案
./scripts/memory_search.sh recent 20

# 依日期搜尋
./scripts/memory_search.sh date 2026-02-10 2026-02-14
```

### 3. 重建索引

```bash
./scripts/build_memory_index_v2.sh
```

---

## 📊 分類說明

| 類別 | 數量 | 用途 |
|------|------|------|
| **decisions** | 3 | 戰略決策、方向調整、商業模式 |
| **learnings** | 6 | 技術學習、SOP、市場研究 |
| **tasks** | 113 | 每日任務、Autopilot 任務、任務佇列 |
| **results** | 9 | 執行報告、結果摘要、評估 |
| **specs** | 14 | S-系列規格書、產品設計、Roadmap |
| **system** | 8 | 索引檔案、系統配置、腳本 |
| **anchors** | 3 | 錨點檔案（完整任務上下文） |
| **checkpoints** | 10 | 會話檢查點（自動備份） |
| **intelligence** | 5 | GitHub 情報、市場分析 |
| **archive** | 5 | 已歸檔的歷史檔案 |
| **other** | 2 | 未分類檔案 |

---

## 🔍 檔案命名規則

### 自動分類依據

系統根據以下規則自動分類檔案：

1. **路徑優先**: `autopilot-results/`、`anchors/`、`checkpoints/` 等
2. **檔名模式**: 
   - `S-*.md` → specs
   - `TASK-*.md`, `t[0-9]*.md` → tasks
   - `*strategy*`, `*decision*` → decisions
   - `*research*`, `*sop*` → learnings
   - `2026-??-??.md` → tasks
3. **內容分析**: 從檔案標題提取資訊

---

## 🛠️ 維護操作

### 回滾方法

如需回滾到舊系統：

```bash
# 刪除新索引
rm memory/INDEX-v2.md memory/INDEX-v2.json memory/qmd.md

# 使用舊索引
cat memory/INDEX.md
```

### 定期重建

建議在以下情況重建索引：
- 新增大量檔案後
- 檔案結構變更後
- 每日自動排程（可加入 cron）

---

## 📈 效能指標

- **索引生成時間**: < 2 秒
- **搜尋回應時間**: < 1 秒
- **支援檔案數**: 無限制（已測試 178 個）

---

*系統版本: v2.0 | 執行者: 達爾 | 任務 ID: memory-index-20260214*
