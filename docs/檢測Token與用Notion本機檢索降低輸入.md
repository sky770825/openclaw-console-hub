# 檢測 Token 消耗 + 用 Notion／本機檢索降低輸入

> 訴求：基礎輸入就 19K，希望 (1) 能實際檢測每次對話的 Token 消耗；(2) 用 Notion 或本機快速檢索取代「前期一次載入大量內容」，避免每次費用隨 19K 疊上去。

---

## 一、如何檢測 Token 消耗

### 1.1 看 `openclaw status`（最直觀）

執行：

```bash
openclaw status
```

輸出裡會有類似：

```
Sessions: agent:main:main · Tokens: 23k/1049k (2%)
```

- **23k** = 該 session **最近一輪**送進模型的 **input（context）token 數**。
- 分母 = 該模型的 context 上限。

**用法**：開一個新視窗或新會話 → 發一則簡單訊息（例如「你好」）→ 立刻跑 `openclaw status`，看 Tokens 數字。再發一則任務型訊息（例如「幫我查一下…」）→ 再跑一次，比較 full 時是否跳到 18k～24k。

### 1.2 看 session transcript 的 usage（精準）

每輪回覆寫入 session 檔時，會帶 **usage**（若 provider 有回傳）。

- **路徑**：`~/.openclaw/agents/main/sessions/` 下對應 session 的 transcript（例如 `.jsonl` 或內含 usage 的檔）。
- **欄位**：找 `usage.input` 或 `input_tokens`，即該輪 **input token**。

你可以在發幾則測試訊息後，打開該 session 的 transcript，看每一輪的 `usage.input` 變化（例如第一輪 18,484、第二輪 18,701…），對應「每次溝通 Token 消耗」實測。

### 1.3 開 Cache Trace（可選，除錯用）

OpenClaw 有 **diagnostics.cacheTrace**，可把每輪的 prompt / system / messages 寫到 log，方便事後估算或對照 token。

在 `~/.openclaw/openclaw.json` 加上：

```json
"diagnostics": {
  "cacheTrace": {
    "enabled": true,
    "filePath": "logs/cache-trace.jsonl",
    "includeMessages": true,
    "includePrompt": true,
    "includeSystem": true
  }
}
```

或環境變數：`OPENCLAW_CACHE_TRACE=true`。  
寫入位置預設在 state dir 的 `logs/cache-trace.jsonl`。可用來對照「哪一輪送了什麼」與後續估算 token（例如 1 中文字 ≈ 1 token、英文字約 4 字 1 token）。

### 1.4 建議的快速檢測流程

1. 確認 **primary 模型** 為 Gemini 2.5 Flash：`openclaw config get agents.defaults.model.primary`
2. **新開視窗**（或新會話）→ 發「你好」→ 跑 `openclaw status` → 記下 Tokens（應較低，light）
3. 再發「幫我記一下今天要做的事」→ 再跑 `openclaw status` → 記下 Tokens（full，約 18k～24k）
4. 若有 session 檔，可再打開該 session 的 transcript 看 `usage.input` 對應上述兩則

這樣就能實際「用對話檢測」每次的 Token 消耗。

---

## 二、用 Notion／本機檢索取代大量前期載入（降低輸入 Token）

目前 19K 主要來自 **7 個 bootstrap 檔**（見 [OpenClaw-17K-Token來源明細](./OpenClaw-17K-Token來源明細.md)）：SOUL、HEARTBEAT、AGENTS、MEMORY、TOOLS、USER、IDENTITY。要避免「每次一開始就 19K」，可以：

- **少送進 bootstrap**：只送「索引／一句摘要」，詳細改由 **Notion 或本機檢索** 按需取。
- **本機**：用 **memory_search**、**memory_read_snippet** 只拉需要的段落。
- **Notion**：詳細內容放 Notion，MEMORY.md 只寫「關鍵字 → Notion 頁面 ID」；需要時請 Agent 用 **Notion API** 查該頁，只把查到的片段當工具結果塞進對話。

下面依「誰來取代」分項。

### 2.1 MEMORY：索引在本地，詳細在 Notion 或 MEMORY_FULL，按需檢索

- **MEMORY.md**：只留 **關鍵字 + 對應路徑或 Notion 頁面 ID**（幾百字以內）。不寫完整段落。
- **詳細內容**：放在 **Notion**（推薦）或 **MEMORY_FULL.md**（且不要讓 bootstrap 載入 MEMORY_FULL）。
- **流程**：  
  - 每輪 bootstrap 只帶 **MEMORY.md 的短索引** → 輸入 token 大降。  
  - 當使用者問到「之前說過／決定過／待辦…」時，Agent 依索引做 **memory_search**（本機）或 **Notion API 查該頁**，只把 **查到的幾段** 當 tool 結果加入對話。  
- 這樣「大量記憶」不會在一開始就 19K 進去，而是**按需**才加入，由 Notion 或本機快速檢索取代。

### 2.2 其他大檔（SOUL、HEARTBEAT、AGENTS、TOOLS、USER）可精簡或改索引

| 檔案 | 目前約 | 做法（取代「前期一次載入」） |
|------|--------|------------------------------|
| **HEARTBEAT.md** | ~3.3k 字 | 只留「何時做什麼」短條；長程式碼移到 `scripts/`，改為「需要時執行 xxx」。 |
| **SOUL.md** | ~3.9k 字 | 留核心原則；長範例/說明移到 SOUL_FULL 或 Notion，改為「必要時再讀」。 |
| **AGENTS.md** | ~3.1k 字 | 精簡重複的 Memory/Heartbeat 說明；或拆成 AGENTS_INDEX + 按需讀取。 |
| **TOOLS.md** | ~2k 字 | 技能詳表改為「見 SKILLS_INDEX 或 Notion」；只留最常用路徑、任務板。 |
| **USER.md** | ~1.9k 字 | 縮成「稱呼、時區、事業一句、偏好 bullet」；細節放 USER_FULL 或 Notion，按需讀。 |

「按需讀」= Agent 用 **memory_search**（本機）或 **Notion API** 查關鍵字／頁面，只把結果當 tool 結果帶入，不事先全部塞進 bootstrap。

### 2.3 確保 light bootstrap 有開（閒聊不帶 19K）

- 設定：`agents.defaults.casualChatLightBootstrap: true`（預設即 true）。
- 效果：**一般聊天**只送 IDENTITY + 精簡 USER，不送 MEMORY、AGENTS、SOUL、TOOLS、HEARTBEAT，第一輪就不會 19K。

### 2.4 進階：用 agent:bootstrap 勾子少送或截斷大檔

若你會寫 OpenClaw plugin，可註冊 **agent:bootstrap**，在組裝 context 前：

- **從 bootstrap 拿掉 MEMORY.md**：改由 Agent 完全用 memory_search / Notion 按需取。
- 或把 **MEMORY.md / HEARTBEAT / SOUL** 的 content 換成「只有前 N 字」或「索引版」，再送進 context。

這樣可進一步把「前期固定載入」壓到 8k～12k 甚至更低，其餘靠 Notion 或本機檢索取代。

---

## 三、建議執行順序（由你這邊用對話檢測 + 逐步降 Token）

1. **先檢測**  
   - 用上面「一、1.4」：新視窗發「你好」→ `openclaw status`；再發任務型一句 → 再 status；有需要再開 cacheTrace 或看 transcript usage。  
   - 記錄：light 時約多少、full 時約多少（目前約 18k～24k）。

2. **先做不寫程式的**  
   - 確認 **casualChatLightBootstrap: true**。  
   - **MEMORY.md** 精簡成「關鍵字 → Notion 頁面 ID 或 path」索引；詳細改放 Notion（或 MEMORY_FULL 且不載入）。  
   - 在 AGENTS/USER 裡寫清楚：問到過去的事先 **memory_search** 或 **查 Notion**，再回答。  
   - 再測一次：full 時 input 應會降（例如少掉 2～3k）。

3. **再縮其他大檔**  
   - 依「二、2.2」精簡 HEARTBEAT、SOUL、AGENTS、TOOLS、USER；長文移 Notion 或 *_FULL，改為按需讀。  
   - 每改一輪就發一兩則測試 + `openclaw status`，看 Token 是否再降。

4. **（可選）**  
   - 用 **agent:bootstrap** 勾子排除 MEMORY 或改為索引版，進一步把前期輸入壓到約 8k～12k。

這樣就同時做到：**由你這邊用對話實際檢測 Token**，以及**用 Notion／本機檢索取代大量前期載入，避免每次 19K 一直疊上去**。

---

## 四、方案 2 實測估算（本機 workspace 跑過）

專案裡有腳本 **`scripts/estimate-bootstrap-tokens.js`**，會讀你 **OpenClaw workspace**（預設 `~/.openclaw/workspace`）的 bootstrap 檔，算出「現狀」與「方案 2 精簡後」的預估 token。

**你本機剛跑完的結果（約略）：**

| 項目 | 現狀 | 方案2（精簡/索引 + Notion 按需） |
|------|------|----------------------------------|
| **Bootstrap 檔合計** | 約 14,800 token | 約 4,900 token |
| **可省（僅 bootstrap）** | — | **約 9,900 token** |
| **第一輪 input 粗估**（bootstrap + 系統其餘 ~5k + 一則短訊） | **約 19,900 token** | **約 10,000 token** |

也就是說：**照方案 2 做**（MEMORY 只留索引、其餘大檔縮成短版或改 Notion/按需讀），**第一輪輸入可從約 20k 降到約 10k**；之後每多一輪對話會再疊一點，但基礎從 10k 起跳而不是 19k，費用會明顯降。

**你要自己再測一次時：**

```bash
cd /Users/caijunchang/openclaw任務面版設計
node scripts/estimate-bootstrap-tokens.js
```

若 workspace 不在預設路徑，可傳目錄：`node scripts/estimate-bootstrap-tokens.js /path/to/workspace`。

---

## 相關文件

- [OpenClaw-17K-Token來源明細](./OpenClaw-17K-Token來源明細.md)
- [目前每次溝通Token消耗-實測演示](./目前每次溝通Token消耗-實測演示.md)
- [動態載入與按需記憶-可行做法](./動態載入與按需記憶-可行做法.md)
- [OpenClaw連上Notion-說明](./OpenClaw連上Notion-說明.md)（Notion 讀寫 + MEMORY 索引）
