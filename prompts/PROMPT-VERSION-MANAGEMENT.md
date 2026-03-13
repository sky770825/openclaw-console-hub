# Prompt 版本管理系統

> 版本：v1.0 | 2026-03-13
> 維護者：達爾
> 核心概念：不同模型需要不同的 prompt 風格，但核心事實必須一致

---

## 概述

系統維護兩套 prompt 版本：
- **根目錄 (workspace/)** — Claude 優化版（主力），自然語言、不用大寫強調
- **local-models/** — 本地模型優化版（Mistral/DeepSeek），精簡、結構化、可用大寫強調

兩套版本的**核心事實**（身份、團隊、工具、規則）必須完全相同，只有**表達方式**不同。

---

## 目錄結構

```
~/.openclaw/workspace/
├── AGENTS.md          ← Claude 優化版（根）
├── SOUL.md            ← Claude 優化版（根）
├── IDENTITY.md        ← Claude 優化版（根）
├── USER.md            ← Claude 優化版（根）
├── TOOLS.md           ← Claude 優化版（根）
└── prompts/
    ├── PROMPT-VERSION-MANAGEMENT.md  ← 此文件
    ├── claude/
    │   └── PROMPTING-GUIDE.md        ← Claude 提示最佳實踐
    ├── local-models/
    │   ├── AGENTS.md                 ← 本地模型版本
    │   ├── SOUL.md                   ← 本地模型版本
    │   ├── IDENTITY.md               ← 本地模型版本
    │   ├── USER.md                   ← 本地模型版本
    │   ├── TOOLS.md                  ← 本地模型版本
    │   └── PROMPTING-GUIDE.md        ← 本地模型提示最佳實踐
    └── sync-history.jsonl            ← 同步紀錄
```

---

## Claude vs 本地模型 提示差異

### Claude（Opus 4.6 / Sonnet 4.6）
- 自然語言風格，像跟人說話
- 不需要大寫強調（模型會過度解讀）
- 解釋「為什麼」比列規則更有效
- 可以用長段落，模型理解力強
- 範例：「當主人說話時，立刻回應，暫停背景工作」

### 本地模型（Mistral-7B / DeepSeek-R1-7B）
- 結構化格式，Markdown 標題 + 清單
- 可用大寫強調關鍵規則：`IMPORTANT:`, `ALWAYS:`, `NEVER:`
- 精簡為主，每條規則一行
- 減少冗餘說明，直接給指令
- 範例：「ALWAYS: 主人說話 → 立刻回應，停止背景工作」

---

## 同步規則

### 核心事實（必須完全一致）
- 達爾的身份、角色、團隊組成
- 工具清單和 API 端點
- 安全規則和權限範圍
- 主人的偏好和設定

### 可以不同的部分
- 語氣和表達方式
- 格式（段落 vs 清單）
- 強調方式（自然語言 vs 大寫標記）
- 範例的詳細程度

---

## 每夜同步審查

**排程**：每日 02:00 CST
**執行者**：達爾（心跳或 cron）
**步驟**：

1. 讀取根目錄所有 .md 核心檔案
2. 讀取 local-models/ 對應檔案
3. 提取每個檔案的「核心事實」（身份、規則、工具等）
4. 比對兩邊的核心事實是否一致
5. 如發現 drift：
   - 記錄到 sync-history.jsonl
   - 通知主人（Telegram，Medium 優先級）
   - 等待確認後修復，或自動修復（若 drift 為單方面新增）
6. 如一致：記錄 "sync OK" 到 sync-history.jsonl

---

## 模型切換指令

在 Telegram 中：
- `/model claude` — 使用根目錄 prompt（Claude 優化版）
- `/model local` — 使用 local-models/ prompt（本地模型優化版）

切換時自動：
1. 備份當前根目錄 prompt 到對應模型資料夾
2. 將目標模型的 prompt 複製到根目錄
3. 重新載入系統 prompt
4. 通知主人切換完成

---

## 版本歷史

每次修改核心 prompt 時，達爾應：
1. 在 sync-history.jsonl 記錄：哪個檔案、什麼改動、為什麼
2. 確保兩邊版本同步更新

---

*「同一個靈魂，不同的語言。」*
