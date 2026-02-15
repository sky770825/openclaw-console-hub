# OpenClaw 修復紀錄報告

本文件整理本次會話中完成的修復與設定變更，供日後排查與修復時參考。

---

## 一、修復總覽

| 項目 | 問題 | 修復方式 |
|------|------|----------|
| 預設模型 | 需改回 Gemini 2.5 Flash | 改 `openclaw.json`、`defaults.ts`、`dev.ts` |
| Gateway bind | 填 `0.0.0.0` 導致無效、Bot 不啟動 | 改為 `"lan"`，並設定 `gateway.auth.token` |
| Gateway 認證 | 非 loopback 時強制要 token，未設則拒絕啟動 | 在 config 加 `gateway.auth.token`，或啟動時 `--token` |
| Health check / token mismatch | Control UI 或 macOS app 連線時未帶 token | 設定檔加 auth、Control UI 預設本機 token |
| 完整重啟 | 需一次停止並重新啟動 Gateway | 依下方「重啟步驟」執行 |

---

## 二、設定檔修改

### 2.1 主設定：`~/.openclaw/openclaw.json`

**用途**：macOS app、Telegram 通道、本機 Gateway（非 dev）皆讀此檔。

**必要欄位（gateway 區塊）**：

```json
"gateway": {
  "mode": "local",
  "bind": "lan",
  "port": 18789,
  "auth": {
    "mode": "token",
    "token": "REDACTED"
  },
  "tailscale": { "mode": "off", "resetOnExit": false }
}
```

**注意**：
- `bind` 僅接受：`"loopback"` | `"lan"` | `"auto"` | `"custom"` | `"tailnet"`，**不可**填 `"0.0.0.0"`。
- 使用 `"lan"` 時**必須**有 `gateway.auth.token`（或 password），否則 Gateway 會拒絕啟動。
- 若改用自訂 token，請與啟動指令、Control UI、macOS app 一致。

### 2.2 Dev 設定：`~/.openclaw-dev/openclaw.json`

**用途**：使用 `OPENCLAW_STATE_DIR=~/.openclaw-dev` 時的 dev 環境。

- 預設模型可設為：`agents.defaults.model.primary": "google/gemini-2.5-flash"`。
- 若 dev 也要對外連線，同樣需 `gateway.bind": "lan"` 與 `gateway.auth.token`。

---

## 三、程式碼修改（openclaw-main 專案）

### 3.1 預設模型改為 Gemini 2.5 Flash

| 檔案 | 修改內容 |
|------|----------|
| `src/config/defaults.ts` | 別名 `gemini-flash` → `google/gemini-2.5-flash`，新增 `gemini-2.5-flash` 別名 |
| `src/cli/gateway-cli/dev.ts` | 新建 dev 設定時，`model.primary` 改為 `"google/gemini-2.5-flash"` |

### 3.2 瀏覽器工具 open/navigate 接受 `url` 別名（修復 targetUrl required）

| 檔案 | 修改內容 |
|------|----------|
| `src/agents/tools/browser-tool.ts` | `open` 與 `navigate`：若未傳 `targetUrl`，改為讀取 `url`；兩者皆無或為空時才拋出「targetUrl required」 |
| `src/agents/tools/browser-tool.schema.ts` | Schema 新增選填欄位 `url`，作為 `targetUrl` 的別名，供 MCP/擴充功能等傳 `url` 時仍可導航 |

**原因**：部分呼叫端（如 Cursor 的 browser MCP、Chrome 擴充 relay）對 navigate/open 只傳 `url`，未傳 `targetUrl`，導致工具回傳「targetUrl required」。改為同時接受 `targetUrl` 或 `url` 後，兩種寫法皆可。

### 3.3 Control UI 本機連線預設 token

| 檔案 | 修改內容 |
|------|----------|
| `ui/src/ui/storage.ts` | 當 Gateway URL 為 127.0.0.1 或 localhost 且未填 token 時，預設使用 `dev-local`，避免 health check「gateway token mismatch」 |

**生效方式**：需重新 build Control UI（`pnpm build`），或從 Overview 手動填寫 Gateway Token 再 Connect。

---

## 四、重啟與啟動指令

### 4.1 停止 Gateway

```bash
cd /path/to/openclaw-main
node openclaw.mjs gateway stop
```

若為手動起的 process（非 launchd），可再清 port：

```bash
lsof -ti :18789 | xargs kill
lsof -ti :19001 | xargs kill
```

### 4.2 啟動 Gateway（主設定 ~/.openclaw，port 18789）

```bash
cd /path/to/openclaw-main
node openclaw.mjs gateway --port 18789 --token dev-local --verbose
```

背景執行時可加 `&` 或由 macOS app 的「Install」裝成 launchd 服務。

### 4.3 啟動 Gateway（Dev 環境）

```bash
cd /path/to/openclaw-main
OPENCLAW_STATE_DIR=~/.openclaw-dev node openclaw.mjs gateway --port 18789 --token dev-local --verbose
```

### 4.4 確認 Gateway 已就緒

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/
# 應得到 200
```

---

## 五、常見錯誤與對照解法

| 錯誤訊息或現象 | 可能原因 | 解法 |
|----------------|----------|------|
| `Invalid --bind (use "loopback", "lan", ...)` | `gateway.bind` 填了 `"0.0.0.0"` | 改為 `"lan"`（或 loopback / auto / custom / tailnet） |
| `Refusing to bind gateway to lan without auth` | bind 非 loopback 但未設 token | 在 `openclaw.json` 加 `gateway.auth.token` 或啟動時 `--token` |
| `gateway token mismatch (provide gateway auth token)` | 客戶端連線未帶 token 或 token 不符 | 1) `~/.openclaw/openclaw.json` 加 `gateway.auth.token`<br>2) Control UI 在 Overview 填同一 token 後 Connect<br>3) 若已改 storage.ts，需重新 build UI |
| `Gateway daemon command failed` | launchd 啟動失敗或未裝服務 | 檢查 port 是否被佔用、config 是否有效；必要時手動啟動 gateway 再於 app 內 Install |
| Bot 沒反應 | 預設模型無 API key 或 Ollama 未開 | 將預設模型改為已設定 key 的（如 Gemini 2.5 Flash），或先確認 Ollama 有在跑 |
| `Unsupported channel: whatsapp` | dev 環境略過 channels | 使用主環境（不加 OPENCLAW_STATE_DIR=~/.openclaw-dev）再執行 `channels login` |
| **`targetUrl required`**（navigate / open） | 呼叫端傳的是 `url` 而非 `targetUrl`（如 Cursor MCP、擴充功能） | 從 openclaw-main 起已相容：`open` / `navigate` 同時接受 `targetUrl` 或 `url`，任一個有值即可 |
| **`device identity required`**（WS code=1008，Chrome 擴充連 Gateway 被關閉） | 擴充連線時未帶有效的 Gateway 共用密鑰（token/password），Gateway 要求 device identity 或 token | 1) 在擴充設定中填入與 `openclaw.json` 相同的 `gateway.auth.token`（如 `dev-local`），並確認擴充在 WebSocket connect 時有帶上該 token<br>2) 若擴充無法帶 token，需在 openclaw-main 支援「允許指定 origin（如 chrome-extension://...）僅用 token 通過、跳過 device identity」 |
| **瀏覽器控制經常失敗**（連不到服務、no tab、tab not found、timeout 等） | Gateway 未開、擴充未掛分頁、token 未帶、targetId 失效 | 見 **`docs/瀏覽器控制經常失敗-排查說明.md`**：依錯誤類型對照解法，並依「建議流程」操作（先開 Gateway → 擴充帶 token → 在目標分頁點擴充掛上 → 必要時先 action=tabs） |
| **任務執行經常中斷、沒有回應** | Gateway/工具逾時（如 10s／30s）、模型 API 逾時、連線中斷、context 過長觸發 compaction、Run 卡住未回報 | 見 **`docs/任務執行中斷與沒有回應-排查說明.md`**：依現象對照原因、可調 timeout 與 compaction、日誌排查步驟 |
| **Telegram 傳給 OpenClaw 沒有反應** | 私訊未配對（dmPolicy: pairing）、群組未 @ bot 或不在 allowlist、主模型 429 額度用完導致 fallback 很慢 | 見 **`docs/Telegram傳給OpenClaw沒有反應-排查.md`**：配對、群組 @／白名單、API 429、日誌確認 |

---

## 六、相關文件

- **大家經常遇到的問題總覽**：`docs/大家經常遇到的OpenClaw問題.md`（依主題與情境索引所有常見問題與對應說明）
- **網路與官方整理（常見問題集中方向 + 必學技能）**：`docs/網路與官方-常見問題與必學技能.md`
- **Gateway 外部連線與 bind**：`docs/Gateway-外部連線-bind設定說明.md`
- **Bot 沒回應檢查**：`docs/bot沒回應-檢查.md`
- **瀏覽器控制經常失敗**：`docs/瀏覽器控制經常失敗-排查說明.md`
- **QMD 記憶索引是否連上**：`docs/QMD記憶索引-連線與檢查.md`
- **任務執行中斷與沒有回應**：`docs/任務執行中斷與沒有回應-排查說明.md`
- **Telegram 傳給 OpenClaw 沒有反應**：`docs/Telegram傳給OpenClaw沒有反應-排查.md`

---

## 七、快速修復檢查清單

1. [ ] `~/.openclaw/openclaw.json` 內 `gateway.bind` 為 `"lan"` 或 `"loopback"`（勿用 `"0.0.0.0"`）
2. [ ] 使用 `"lan"` 時已設 `gateway.auth.token`（或 password）
3. [ ] `gateway.port` 與實際啟動 port 一致（例如 18789）
4. [ ] 手動啟動時帶 `--token <與 config 相同>`（若 config 有設 token）
5. [ ] Control UI / macOS app 連線使用與 config 相同的 token
6. [ ] 需要時先 `gateway stop` 再清 port，再重新啟動 gateway

---

*文件建立日期：2026-02-07。依實際 openclaw-main 版本與設定路徑調整指令與路徑。*
