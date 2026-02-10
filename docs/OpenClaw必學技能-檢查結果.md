# OpenClaw 必學技能 — 檢查結果

本表對照 [網路與官方-常見問題與必學技能](./網路與官方-常見問題與必學技能.md) 的「必學／強烈建議學」項目，依你目前環境與設定做勾選。  
檢查時間：依你執行檢查當日為準（本檔可重跑 `openclaw status` / `openclaw gateway status` 後手動更新）。

---

## 一、必學（沒這些很難穩定跑起來）

| # | 項目 | 狀態 | 說明 |
|---|------|------|------|
| 1 | **環境與版本** | ✅ 通過 | Node v22.22.0（≥22）；`openclaw` 在 PATH（`~/.nvm/.../openclaw`）。 |
| 2 | **設定檔位置與格式** | ✅ 通過 | Config 在 `~/.openclaw/openclaw.json`，格式正確；含 gateway、agents、tools、channels、plugins。 |
| 3 | **Gateway 基本概念** | ✅ 通過 | `gateway.mode: local`、`gateway.bind: lan`、`gateway.auth.token: dev-local` 已設；非 loopback 有 auth。 |
| 4 | **診斷指令順序** | ✅ 已跑 | 已執行：`openclaw status`、`openclaw gateway status`、`openclaw doctor`、`openclaw channels status --probe`。Gateway 現為 **Runtime: running**、**RPC probe: ok**。 |
| 5 | **配對與權限** | ✅ 通過 | WhatsApp：`dmPolicy: pairing`、`groupPolicy: allowlist`；知道「沒回覆」先查 pairing/mention。 |
| 6 | **模型與認證** | ✅ 通過 | `agents.defaults.model.primary: google/gemini-2.5-flash`、fallbacks 含 ollama；auth 有 google-antigravity OAuth；Ollama 已設。 |

---

## 二、強烈建議學（會大幅減少卡關）

| # | 項目 | 狀態 | 說明 |
|---|------|------|------|
| 7 | **Control UI / Dashboard** | ✅ 設定有 | Gateway auth token 已設（dev-local）；本機連 Control UI 時填同一 token 即可。 |
| 8 | **Channels 基本設定** | ✅ 通過 | Telegram、WhatsApp 插件已啟用；channels 區塊已設。 |
| 9 | **瀏覽器工具** | ✅ 通過 | `browser.enabled: true`；使用 Chrome 擴充時記得在**該分頁**點圖示掛上。 |
| 10 | **重啟與服務** | ✅ 已做 | 已執行 `openclaw gateway install`；LaunchAgent 已安裝並載入，**Runtime: running**。之後開機可由服務自動起 Gateway。 |
| 11 | **日誌在哪、怎麼看** | ✅ 有路徑 | 檔案日誌：`/tmp/openclaw/openclaw-*.log`；可用 `openclaw logs --follow`。 |
| 12 | **升級後注意** | — | 升級後若壞掉，先查 auth、bind、pairing（見 Troubleshooting）。 |

---

## 三、Agent 技能（Skills）— 你目前有的

- **工作區技能**（`~/.openclaw/workspace/skills`）：  
  - caldav-calendar  
  - daily-evolution  
  - ec-session-cleaner  
  - llm-supervisor  
  - openai-whisper  
  - playwright-scraper-skill  
  - proactive-solvr  
  - screen-vision  

- **全域技能目錄**（`~/.openclaw/skills`）：**不存在**（可選；多數用 workspace skills 即可）。

- **插件**（plugins）：telegram、whatsapp、openguardrails-for-openclaw、google-antigravity-auth 已啟用。

---

## 四、已執行項目（本次）

1. **診斷指令**：已跑 `openclaw status`、`openclaw gateway status`、`openclaw doctor`、`openclaw channels status --probe`。
2. **Gateway 服務**：已跑 `openclaw gateway install`；LaunchAgent 已安裝，Gateway Runtime 為 **running**。

建議之後養成習慣：出問題時先跑一輪上述診斷。

**本次診斷結果摘要**：  
- Telegram：OK（@xiaoji_cai_bot）。  
- WhatsApp：Not linked（需跑 `openclaw channels login` 掃 QR）。  
- Security audit：2 critical（小模型 sandbox 建議、plugins.allow 建議）、1 warn（gateway token 偏短）。可擇期跑 `openclaw security audit --deep` 與 `openclaw doctor --fix` 視需要套用建議。

3. **Control UI**：  
   本機打開 Dashboard 時，URL 用 `http://127.0.0.1:18789/`，Token 填 **dev-local**（與 config 一致）。

4. **瀏覽器控制**：  
   用 Chrome 擴充時，先在要控制的分頁點擴充圖示掛上，再下指令，可減少「no tab is connected」錯誤。

---

## 五、小結

- **必學 6 項**：環境、設定、Gateway 概念、診斷、配對、模型 — 你目前**設定面都符合**；診斷建議補跑完整 command ladder，並釐清 Gateway 是否用 LaunchAgent 常駐。
- **強烈建議 6 項**：Control UI、Channels、瀏覽器、重啟與服務、日誌、升級注意 — 多數已具備；**服務**部分視你是否要 `gateway install` 常駐而定。
- **Agent 技能**：工作區已有 8 個技能；插件與通道已啟用。

若你之後變更 config 或安裝方式，可再跑一次 `openclaw gateway status`、`openclaw doctor`，把本表「狀態」與「說明」欄更新即可。
