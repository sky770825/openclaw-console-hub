# 阿秘專屬 — 記憶管理指南
> 你是阿秘（📋 秘書），不是小蔡，這是你的專屬知識庫

---

## 1. MEMORY.md 維護規則

### 檔案位置
| 對象 | MEMORY.md 路徑 |
|------|---------------|
| 小蔡（主） | `~/.claude/projects/-Users-caijunchang-openclaw------/memory/MEMORY.md` |
| 阿策 | `~/.openclaw/workspace/crew/ace/MEMORY.md` |
| 阿秘（你） | `~/.openclaw/workspace/crew/ami/MEMORY.md` |
| 其他 crew bot | `~/.openclaw/workspace/crew/[bot名]/MEMORY.md` |

### MEMORY.md 結構規範

```markdown
# [Bot 名] — 核心記憶

> 最後更新：[YYYY-MM-DD]（[版本/事件]）

## 🚨 最重要的規則（永遠放最上面）
- [不能忘的紅線規則]

## 📌 目前狀態
- 版本：vX.Y.Z
- [當前進行的大任務]

## 🧠 累積知識（按主題分類）
### [主題 A]
- [知識點]（日期）

### [主題 B]
- [知識點]（日期）

## 📚 參考路徑
- [常用檔案路徑索引]
```

### 維護規則

**1. 200 行上限**
- MEMORY.md 不超過 200 行
- 超過時，把詳細內容移到 topic 檔案，MEMORY.md 只保留索引
- topic 檔案放在同目錄下或 `notes/` 子目錄

**2. 只記「以後會用到」的資訊**
```
✅ 適合記的：
- 系統架構決策（為什麼用 A 不用 B）
- 踩過的坑（避免重蹈覆轍）
- 老蔡的明確指令（必須遵守的規則）
- 關鍵路徑和設定值

❌ 不適合記的：
- 臨時的 debug 紀錄（用 log 就好）
- 已完成的一次性任務細節
- 可以從代碼中讀到的資訊
- 過時的狀態（已被更新的數據）
```

**3. 格式一致性**
- 每條記錄附上日期 `（YYYY-MM-DD）`
- 用 `-` 列表，不要用段落
- 每條不超過 1-2 行
- 用粗體標記關鍵字

**4. 定期清理（每週一次）**
- 刪除已過時的記錄
- 合併重複的資訊
- 壓縮過長的條目
- 確認行數在 200 行以內

---

## 2. Workspace 檔案歸檔規則

### 目錄結構
```
~/.openclaw/workspace/
├── AGENTS.md          # 小蔡大腦（不要動！）
├── MEMORY.md          # 小蔡核心記憶
├── HEARTBEAT.md       # 心跳狀態
├── GROWTH.md          # 成長記錄
├── WAKE_STATUS.md     # 醒來狀態
├── knowledge/         # 知識庫文件
│   ├── exercise-*.md  # 練習記錄
│   └── *.md           # 各種知識文件
├── skills/            # ClawHub 安裝的技能
├── crew/              # Crew bot 各自的空間
│   ├── ace/           # 阿策
│   │   ├── MEMORY.md
│   │   └── knowledge/
│   ├── ami/           # 阿秘（你）
│   │   ├── MEMORY.md
│   │   ├── notes/
│   │   ├── notes.md
│   │   └── knowledge/
│   └── .../           # 其他 bot
└── notes/             # 共用筆記
```

### 歸檔原則

**按類型歸檔：**
| 類型 | 放哪裡 | 命名規則 |
|------|--------|---------|
| 核心記憶 | `MEMORY.md` | — |
| 臨時筆記 | `notes/` | `[主題]_[日期].md` |
| 調研結果 | `notes/` 或 crew bot 目錄 | `[bot名]_[主題]_[日期].md` |
| 知識文件 | `knowledge/` | `[主題].md` |
| 成長記錄 | `GROWTH.md` | — |

**阿秘的 notes 管理：**
```
~/.openclaw/workspace/crew/ami/
├── notes.md           # 筆記索引（簡短列表）
└── notes/
    ├── 日報_2026-03-04.md
    ├── 週報_W10.md
    └── 老蔡指示_2026-03-04.md
```

---

## 3. notes.md 用法

### 什麼是 notes.md
阿秘的私人筆記本，用於記錄：
- 老蔡的零碎指示（還沒整合到 MEMORY.md 的）
- 待辦事項的草稿
- 臨時想到的改進點
- 和其他 bot 溝通的紀錄

### 格式
```markdown
# 阿秘筆記

## 待整理
- [YYYY-MM-DD] [筆記內容]
- [YYYY-MM-DD] [筆記內容]

## 已整理（索引）
- [主題] → notes/[檔名].md
- [主題] → notes/[檔名].md
```

### 維護流程
```
記筆記 → notes.md「待整理」
    ↓（累積到 5 條以上）
整理 → 有價值的移到 MEMORY.md 或獨立檔案
    ↓
更新 notes.md「已整理」索引
    ↓
刪除「待整理」中已處理的條目
```

---

## 4. 記憶分級制度

### Level 1：核心記憶（MEMORY.md）
- 存活時間：永久（除非手動清理）
- 內容：系統規則、老蔡指令、架構決策
- 維護頻率：每週清理一次

### Level 2：工作記憶（notes.md + notes/）
- 存活時間：1-2 週
- 內容：當前任務相關、臨時記錄
- 維護頻率：每天結束時整理

### Level 3：向量記憶（Supabase knowledge_chunks）
- 存活時間：永久（但需要搜尋才能取出）
- 內容：文件、代碼、cookbook、歷史知識
- 維護頻率：新內容時 batch-index

### Level 4：ephemeral 記憶（對話上下文）
- 存活時間：當前對話
- 內容：這次對話中的所有資訊
- 維護：不需要，對話結束自動消失
- **重要**：如果對話中有值得保留的資訊，要在結束前寫入 Level 1 或 Level 2

---

## 5. 記憶整理 SOP（阿秘每日任務）

### 每日整理（建議在日報之前做）
```
1. 讀 notes.md，有沒有待整理的筆記
2. 讀 MEMORY.md，有沒有過時的資訊
3. 檢查 notes/ 目錄，清理超過 7 天的臨時筆記
4. 如果 MEMORY.md 接近 200 行，做壓縮
```

### 壓縮技巧
```
原始（3 行）：
- 2026-03-01：修復了 auth bug
- 2026-03-02：再次修復 auth，加了 token refresh
- 2026-03-03：auth 最終修復，加了全面測試

壓縮（1 行）：
- auth 模組完整修復（含 token refresh + 測試）（2026-03-03）
```

### 搬遷規則
```
MEMORY.md 某個主題超過 10 行
    ↓
建立 notes/[主題詳細].md，放完整內容
    ↓
MEMORY.md 只保留 1-2 行摘要 + 指向路徑
```
