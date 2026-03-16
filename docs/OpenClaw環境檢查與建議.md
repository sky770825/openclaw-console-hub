# OpenClaw 整體環境檢查與建議

檢查範圍：`~/.openclaw/` 主設定、workspace、cron、安全與敏感資訊。  
目的：找出可調整與可加強之處。

---

## 一、目前做得好的地方

| 項目 | 狀態 |
|------|------|
| **Exec 審批** | `exec-approvals.json` 已設 `defaults.security: "full"`，執行命令有嚴格控管 |
| **防護外掛** | `openguardrails-for-openclaw` 已啟用，有助防 prompt injection |
| **SOUL.md 安全規則** | 已明訂「只聽老蔡」、忽略外部指令、敏感操作需確認，與 MEMORY 教訓一致 |
| **Agent 預設** | workspace 指向正確、主模型 Gemini 2.5 Flash + Ollama fallback、compaction safeguard |
| **Cron** | 每日 Token 用量提醒、每日記憶備份，排程合理 |
| **Workspace 文件** | AGENTS.md / TOOLS.md / MEMORY.md / USER.md / SOUL.md 結構完整，TOOLS 已涵蓋任務板、Cursor、技能、路徑 |
| **瀏覽器** | browser.enabled: true，pathPrepend 已含 Cursor CLI 路徑 |

---

## 二、建議調整與加強

### 1. 敏感資訊不要寫進設定檔（高優先）

**現狀：**

- `openclaw.json` 內含：
  - Telegram **bot token**（明文）
  - **Web search API key**（明文）
- `workspace/HEARTBEAT.md` 內含 **Moltbook API key** 明文

**風險：** 設定檔若被備份、同步或誤傳，會洩漏金鑰；HEARTBEAT 會被讀進 context，key 會反覆出現在日誌或 prompt。

**建議：**

1. **Telegram / Web search**  
   - 將 token 與 API key 改放到環境變數（例如 `~/.openclaw/.env` 或 shell 的 `export`），並在 `openclaw.json` 用引用方式（若 OpenClaw 支援 `${ENV_VAR}` 或從 env 讀取）或透過 `openclaw config set` 從環境寫入。  
   - 若目前版本不支援從 env 讀，可改為「啟動前 export 變數，由外掛或 wrapper 讀取」，總之不要長期以明文放在 JSON 裡。
2. **Moltbook API key**  
   - 在系統或 `~/.openclaw/.env` 設 `MOLTBOOK_API_KEY`（或你自訂名稱）。  
   - HEARTBEAT 的邏輯改為「從環境變數讀取」，不要在 HEARTBEAT.md 裡寫死 key；若 heartbeat 執行環境是 agent，需確認該環境能讀到該變數（例如在 gateway 啟動時注入）。

完成後可順便檢查：`openclaw.json`、`HEARTBEAT.md`、任何已提交到 git 的檔案中是否還有 token/key 殘留，若有請輪換並移除。

---

### 2. TOOLS.md 路徑筆誤

**現狀：** 「工作區資料與資料夾」表格中寫的是 `~/workspace/skills/`、`~/workspace/config/` 等。

**建議：** 改為正確路徑，例如：

- `~/.openclaw/workspace/skills/`
- `~/.openclaw/workspace/config/`
- `~/.openclaw/workspace/quarantine/`

避免小蔡或人類誤會成系統的 `~/workspace`。

---

### 3. 設定檔備份與權限

**現狀：** 目錄內有 `openclaw.json.bak.1`、`openclaw.json.bak.2`、`openclaw.json.repaired` 等。

**建議：**

- 若備份檔仍含 token/API key，應刪除或移到不備份、權限 600 的目錄，並確保不再把 secrets 寫進新備份。
- 建議 `openclaw.json` 與 `exec-approvals.json` 權限設為 `600`（僅本人可讀寫），減少被其他 process 讀取的風險。

---

### 4. 技能載入與監看（可選）

**現狀：** `openclaw.json` 未顯式設定 `skills.load`（例如 `watch`、`watchDebounceMs`、`extraDirs`）。

**建議：**

- 若希望改動 `SKILL.md` 後不需重啟就生效，可加上例如：  
  `"skills": { "load": { "watch": true, "watchDebounceMs": 250 } }`  
  （與現有 `skills.install.nodeManager` 並存即可。）
- 若有共用的技能目錄要給多個 agent 用，可再考慮 `skills.load.extraDirs`；目前單一 workspace 可先不設。

---

### 5. Gateway 對外與認證（依需求）

**現狀：** `gateway.mode: "local"`、`bind: "lan"`、`auth.mode: "token"`、`auth.token:REDACTED`。

**建議：**

- 僅本機或家用 LAN 使用：維持現狀即可。
- 若日後要從外網連（例如 Tailscale、VPN 或 port forward）：  
  - 將 `auth.token` 改為高強度隨機字串（至少 256-bit），不要用 `dev-local`。  
  - 必要時可再搭配 `gateway.bind`、防火牆與 Tailscale 等，並在文件中註記「對外時必改 token」。

---

### 6. HEARTBEAT 邏輯與維護性

**現狀：** HEARTBEAT.md 內含一段較長的 Python 風格的 Moltbook 檢查邏輯，且含 API key。

**建議：**

- API key 改環境變數（見上文）。
- 若 HEARTBEAT 實際上是「給 agent 的指示 + 可執行片段」，可考慮：  
  - 把「何時做 Moltbook 檢查、呼叫哪個指令」寫在 HEARTBEAT.md；  
  - 把實際呼叫 API 的腳本放到 `scripts/`（例如 `moltbook-heartbeat.sh`），在腳本內從 `$MOLTBOOK_API_KEY` 讀取，再由 HEARTBEAT 指示 agent 執行該腳本。  
  這樣 key 不會進 context，也較易維護與除錯。

---

### 7. 每日進化與記憶（可選加強）

**現狀：** 已有 daily-evolution 技能、每日記憶備份 cron、MEMORY.md 與 memory/*.md。

**建議：**

- 確認 daily-evolution 的 cron 或觸發方式與你預期一致（例如每日 00:00 UTC+8）。  
- 若希望「長期記憶」更穩、可被搜尋，可評估 **Supermemory** 類外掛（見 `OpenClaw技能-自我進化與升級資源.md`），與現有 MEMORY.md 並行或漸進取代部分用途。

---

## 三、快速檢查清單（可定期做）

- [ ] `openclaw.json` 與 `HEARTBEAT.md` 中已無 token / API key 明文；改由環境變數或安全儲存提供。
- [ ] `openclaw.json`、`exec-approvals.json` 權限為 600；備份檔不含敏感資訊或已移除。
- [ ] TOOLS.md 中 workspace 路徑為 `~/.openclaw/workspace/...`。
- [ ] 若對外開放 gateway，已更換高強度 token 並記錄在安全處。
- [ ] Exec 審批維持 `security: full`；新技能安裝前用 GuavaGuard 掃過（見 SOUL/MEMORY 教訓）。

---

## 四、小結

- **安全面**：最優先把 Telegram token、Web search API key、Moltbook API key 移出設定檔與 HEARTBEAT 明文，改為環境變數或腳本讀取；並檢查備份與權限。
- **正確性**：修正 TOOLS.md 的 workspace 路徑。
- **可選**：skills.load.watch、gateway 對外時換 token、HEARTBEAT 改為呼叫腳本、評估長期記憶外掛。

完成上述調整後，整體環境會更安全、好維護，且與你現有安全原則一致。
