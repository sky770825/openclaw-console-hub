# 目前每次溝通 Token 消耗 — 實測演示（依你現有檔案）

以下依你**目前的設定與 session 資料**，拆解「每次一來一往」大約會消耗多少 **input token**（送進模型的 context）。

---

## 一、實際數字（從你機器上的 session）

### 1. `openclaw status` 顯示

```
Sessions: agent:main:main · Tokens: 23k/1049k (2%)
```

- **23k** = 目前這個 session **最近一輪請求**送進模型的 **input（context）token 數**。
- **1049k** = 模型 gemini-2.5-flash 的 context 上限。

所以在你**現有設定、現有對話長度**下，**每次溝通大約會用掉約 18k～24k input token**（會隨對話輪數與 tool 結果增加而上升）。

### 2. 從 transcript 逐輪看（同一 session 77eb3fd8…）

同一 session 的幾則助理回覆裡，`usage.input` 如下（單位：token）：

| 輪次 | input (token) | 說明 |
|------|----------------|------|
| 第 1 輪回覆 | 18,484 | 系統 + 開場 + 第一則使用者訊息 |
| 第 2 輪 | 18,701 | + 一則問「18k in 是哪些資料」 |
| 第 3 輪 | 19,087 | + 一則問「這些18k in嗎？」 |
| 第 4 輪 | 19,558 | + 一則問「壓到1000 token」 |
| 之後（含 tool 呼叫） | 20,170 → 21,192 → … → **24,426** | 每多一輪對話 + tool 結果，input 約 +500～2000 |

結論：**在你目前的檔案與設定下，每次溝通大約消耗 18k～24k input token**（依對話長度與是否呼叫工具而變）。

---

## 二、這 18k～24k 從哪裡來？（拆解）

你 session 裡有 **systemPromptReport**，可換算成約略 token（約 1 token ≈ 3.5 字元，中英混用）：

| 項目 | 字元數 (chars) | 約略 token |
|------|----------------|------------|
| **系統提示本體**（規則、Runtime、Tooling 等） | 約 18,325（nonProjectContextChars） | **~5.2k** |
| **注入的 workspace 檔案**（AGENTS.md, SOUL.md, USER.md, MEMORY.md, HEARTBEAT.md, TOOLS.md, IDENTITY.md, BOOTSTRAP） | 約 16,683（projectContextChars） | **~4.8k** |
| **Skills 列表與說明**（27 個 skill 的 name + description + location） | 9,607 | **~2.7k** |
| **工具列表 + schema**（read, edit, exec, browser, message, memory_search …） | 1,984 + 14,868 | **~4.8k** |
| **系統提示小計** | **約 35,008** | **~10k** |
| **對話歷史 + 本輪使用者訊息 + 中間的 tool 結果** | 隨輪數與工具輸出變動 | **~8k～14k**（你目前這段約 30 行的 transcript） |

加總與實測一致：**系統約 10k + 對話/tool 約 8k～14k ≈ 18k～24k input/次**。

---

## 三、若改成「少帶歷史 + QMD 提取」會變多少？

若照前面文件做：

- **contextPruning**：只保留最近 1 則助理、tool 結果 TTL 過期就丟。
- **compaction**：提早壓縮，讓「未壓縮的最近對話」約 4k。
- **不改系統提示與 workspace 注入**：系統那塊仍是約 **10k**。

則單次請求大約會變成：

- 系統提示 + 注入：**~10k**
- 最近 1～2 輪 + 壓縮摘要（或只留本輪）：**~1k～4k**
- 若 agent 呼叫 **memory_search**，只帶回 3～5 筆精簡結果：**~0.5k～2k**

→ **總計約 11k～16k input/次**（比現在 18k～24k 少一截）。

若再進一步**精簡 workspace 注入**（例如 AGENTS.md、SOUL.md、HEARTBEAT.md 縮短或部分改為「需要時再 memory_search」），系統那塊有機會壓到約 **6k～8k**，總計就有機會壓到 **約 8k～12k/次**，甚至配合更激進的 compaction 往 **~4k～6k** 靠近（見「每次溝通Token控制在4K或更少」那份）。

---

## 四、一句話總結（依你目前檔案）

- **現在**：每次溝通約 **18k～24k input token**（隨輪數與 tool 變多而增加）。
- **主要來源**：系統提示與注入約 **~10k**，其餘是**對話歷史 + tool 結果**（~8k～14k）。
- **要變少**：少帶歷史（contextPruning + compaction）+ 必要時用 QMD 按需提取；若再精簡 workspace 檔案，有機會壓到約 **8k～12k** 或更低。

以上數字皆來自你目前的 `~/.openclaw/openclaw.json`、workspace 檔案與 `agents/main/sessions/` 的 transcript 與 systemPromptReport。
