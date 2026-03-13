# 用 QMD 記憶減少每次溝通的 Token

你的想法對：**把重要資訊存進 QMD，每次溝通只按需從 QMD 提取**，這樣送進模型的 context 會比「整段對話歷史都塞進去」小很多，Token 消耗就會比較少。

OpenClaw 已經支援這套做法，只要把「寫入記憶」和「縮小 session context」都設好即可。

---

## 一、為什麼這樣會省 Token

| 做法 | 每次請求送進模型的內容 | 大概 Token |
|------|------------------------|------------|
| **現在（整段歷史都帶）** | 系統提示 + 完整對話歷史 + 工具結果 + 本輪訊息 | ~18K |
| **改為：少帶歷史 + 從 QMD 提取** | 系統提示 + 最近 1～2 輪 + **僅「記憶搜尋結果」** + 本輪訊息 | 可壓到幾 K |

也就是說：**不送整段歷史，改送「和本輪問題相關的那幾段記憶」**，總量就會少很多。

---

## 二、OpenClaw 怎麼配合這件事

### 1. 記憶存在哪裡、誰在索引

- **寫入**：Agent 會把「該記下來的事」寫到 workspace 的 **MEMORY.md** 或 **memory/*.md**（例如 `memory/2026-02-08.md`）。
- **索引**：你用 **QMD** 時，QMD 會索引這些檔案；`memory_search` 查的就是這個索引（語意搜尋）。
- **壓縮前先寫記憶**：OpenClaw 的 **pre-compaction memory flush** 會在「壓縮對話」前跑一輪，把重要內容寫進 memory，所以壓縮後舊對話雖不見，重點仍會留在 QMD 裡。

### 2. 每次溝通時怎麼「從 QMD 提取」

- Agent 本身有 **memory_search**、**memory_get** 兩個工具。
- 系統提示裡已經有一段 **「Memory Recall」**：  
  **在回答和「過往工作、決定、日期、人、偏好、待辦」有關的問題前，要先對 MEMORY.md + memory/*.md 做 memory_search，再用 memory_get 只拉需要的行。**
- 所以流程是：  
  - 你問的問題 → 模型先決定要不要查記憶 → 呼叫 `memory_search(query)` → 只把「搜尋結果」放進本輪 context → 再回答。  
- 放進去的只有「和 query 相關的那幾段」，不是整段 18K 歷史，所以 **Token 會少很多**。

---

## 三、你需要做的設定

### 1. 確保用 QMD 當記憶後端（你已有可略過）

在 `~/.openclaw/openclaw.json` 的 `memory` 區塊：

```json
"memory": {
  "backend": "qmd",
  "qmd": {
    "command": "qmd",
    "includeDefaultMemory": true
  }
}
```

- 這樣 `memory_search` 會查 QMD 的索引。  
- 若 QMD 沒裝或沒連上，會退回 builtin，一樣能省 token，只是索引實作不同。

### 2. 讓 session 少帶歷史（關鍵）

若 session 還是帶滿 18K 歷史，省 token 的效果有限。要**同時**把「每次送進模型的對話長度」壓短：

- **contextPruning**：例如只保留最近 1～2 則助理回覆、tool 結果用 TTL 過期。  
- **compaction**：提早壓縮，讓「未壓縮的最近對話」只占約 4K～8K。

這樣一來，模型每輪收到的「對話歷史」很少，需要時再靠 **memory_search** 從 QMD 補足，總 token 就會明顯下降。

範例（和「每次溝通 Token 控制在 4K 或更少」那份一致）：

```json
"agents": {
  "defaults": {
    "contextPruning": {
      "mode": "cache-ttl",
      "ttl": "10m",
      "keepLastAssistants": 1,
      "softTrim": { "maxChars": 2000 }
    },
    "compaction": {
      "reserveTokensFloor": 1044904
    }
  }
}
```

（`reserveTokensFloor` 依你模型 context 大小調整，見 `每次溝通Token控制在4K或更少.md`。）

### 3. 可選：限制單次記憶搜尋帶入的長度

若擔心一次 `memory_search` 回傳太多、又把 token 撐高，可以在 QMD 設定裡加限制（若你的版本支援）：

```json
"memory": {
  "backend": "qmd",
  "qmd": {
    "command": "qmd",
    "includeDefaultMemory": true,
    "limits": {
      "maxResults": 5,
      "maxInjectedChars": 2000
    }
  }
}
```

- **maxResults**：最多回傳幾筆結果。  
- **maxInjectedChars**：這些結果加總最多多少字元（約可換算成 token）。  

這樣「從 QMD 提取」的那一塊也會有上限，整體 token 更好控制。

---

## 四、流程整理（為什麼會比較少）

1. **平常**  
   - 對話寫進 session transcript。  
   - 重要內容被寫進 **MEMORY.md / memory/*.md**（你手動請 agent 記，或靠 pre-compaction memory flush）。  
   - QMD 索引這些檔案。

2. **每次新訊息**  
   - 送進模型的只有：系統提示 + **很少的最近對話**（因 pruning + compaction）+ 本輪使用者訊息。  
   - 若問題和「以前的事」有關，模型會呼叫 **memory_search**，只把「與 query 相關的片段」當成 tool 結果塞進 context。  
   - 所以總 context = 小 session + 小段記憶結果 + 本輪訊息 → **比 18K 少很多**。

3. **結果**  
   - 記憶存在 QMD，每次溝通改為「到 QMD 裡按需提取」；  
   - Token 消耗會比較少，而且長期資訊不會因為 session 壓縮而消失。

---

## 五、相關文件

- **QMD 連線與檢查**：`docs/QMD記憶索引-連線與檢查.md`  
- **每次溝通壓到約 4K token**：`docs/每次溝通Token控制在4K或更少.md`  
- **Session / compaction 說明**：  
  https://docs.openclaw.ai/reference/session-management-compaction  

總結：**可以**把這些記憶存放在 QMD（透過 MEMORY.md / memory/*.md），並在每次溝通時讓 agent 到 QMD 裡提取；配合「少帶 session 歷史」的設定，Token 消耗就會比較少。
