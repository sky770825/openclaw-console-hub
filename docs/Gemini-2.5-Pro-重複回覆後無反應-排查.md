# Gemini 2.5 Pro 切換後重複回覆、接著無反應 — 原因與處理

> **說明：** 目前 OpenClaw 已移除 Gemini／Claude，僅使用 Kimi + Ollama。此文件為當時排查紀錄，供參考。見 [OPENCLAW-模型變更-僅Kimi與Ollama.md](./OPENCLAW-模型變更-僅Kimi與Ollama.md)。

## 現象

使用 **Google Gemini 2.5 Pro**（在 Telegram 或介面中切換模型）後：
- 詢問兩次，系統都回覆**重複的內容**；
- 之後就**沒有反應**。

## 原因（已從日誌確認）

**同一套 Node/undici 對 Google API 的 TLS 問題**，與文件中的「Gemini 2.5 Flash 兩句就掛」相同：

1. **錯誤日誌**（`~/.openclaw/logs/gateway.err.log`）會出現：  
   `Uncaught exception: TypeError: Cannot read properties of null (reading 'setSession')`  
   發生在 `TLSSocket.setSession`，對 **Google API** 的 HTTPS 連線在連線重用時 TLS 狀態為 null，導致崩潰或 session 壞掉。

2. **流程**：切到 Gemini 2.5 Pro 後，第一、二次請求可能仍成功（所以你會看到回覆，甚至重複感）；接下來再打 Google API 時觸發上述錯誤，Gateway 行程掛掉或該 session 無法再正常回覆，就變成「接著沒有反應」。

3. **Gemini 2.5 Pro 與 2.5 Flash** 都走同一套 Google API 與連線邏輯，因此 **2.5 Pro 也會出現同樣問題**。文件已更新：見 `docs/模型不回話-排查步驟.md` § 3.6。

## 建議處理方式

### 1. 改回以 Kimi / Claude 為主要模型（推薦）

- **若用 Telegram**：在對話中輸入 **`/model kimi/kimi-k2.5`**（或 `anthropic/claude-sonnet-4-5-20250929`），之後對話會用該模型，不再用 Gemini 2.5 Pro 當主模型。
- **若改全域預設**：編輯 `~/.openclaw/openclaw.json`，將 `agents.defaults.model.primary` 設為 `kimi/kimi-k2.5` 或 `anthropic/claude-sonnet-4-5-20250929`，fallbacks 可保留 `google/gemini-2.5-pro`（僅在 primary 失敗時才用），然後執行：
  ```bash
  openclaw gateway restart
  ```

### 2. 重啟 Gateway（目前已無反應時）

錯誤發生後 Gateway 可能已崩潰或卡住，先恢復服務：

```bash
openclaw gateway restart
```

再依上面方式把預設或當前 session 改回 Kimi/Claude。

### 3. 仍想用 Gemini 時

- **不要**把 Gemini 2.5 Pro 設成 primary 或常用模型；可放在 fallbacks，讓多數請求走 Kimi/Claude，只有 fallback 時才打 Google，降低觸發次數。
- 或等 **OpenClaw / Node** 升級後再試（`npm update -g openclaw`、Node 22 LTS 最新），看上游是否修掉 undici/TLS 行為。

## 小結

| 項目 | 說明 |
|------|------|
| **原因** | Node/undici 對 Google API 連線重用時 TLS 為 null，觸發 `setSession` 崩潰；Gemini 2.5 Pro 與 2.5 Flash 相同路徑，故都會發生。 |
| **立即處理** | 重啟 Gateway；用 `/model kimi/kimi-k2.5` 或改 openclaw.json 的 primary，改回 Kimi/Claude。 |
| **長期** | 以 Kimi/Claude 為 primary，Gemini 僅作 fallback；或等 OpenClaw/Node 更新後再試。 |

詳細與其他模型問題可對照：**`docs/模型不回話-排查步驟.md`**（§ 3.5、3.6）。

---

## 接著出現「400 status code (no body)」

**現象**：在重複回覆、無反應之後，介面或日誌出現 **400 status code (no body)**。

**常見原因**：

1. **Gemini 崩潰後的連鎖反應**  
   `setSession` 崩潰後，Gateway 或 session 處於異常狀態；之後再嘗試**回傳訊息給 Telegram**（或呼叫其他 API）時，請求可能格式錯誤或連線異常，對方回傳 **400 Bad Request**，且部分伺服器不帶 body，就變成「400 (no body)」。

2. **Telegram API 400**  
   - **answerCallbackQuery**：若使用者點了 inline 按鈕，但 bot 隔太久才回覆 callback，Telegram 會回 `400: Bad Request: query is too old and response timeout expired or query ID is invalid`。日誌中若看到 `[telegram] answerCallbackQuery failed` 即屬此類，屬預期行為，不影響一般文字對話。  
   - **sendMessage**：若送出的內容格式不合法（例如 HTML 未逸出、長度超限等），Telegram 也可能回 400。

**建議處理**：

1. **先重啟 Gateway**，讓連線與 session 狀態重置：  
   ```bash
   openclaw gateway restart
   ```
2. **改回 Kimi/Claude**（見上文），避免再次觸發 Gemini 的 TLS 崩潰。
3. 若 400 仍偶發出現，看 **`~/.openclaw/logs/gateway.err.log`** 是否有對應的 `[telegram]` 或 `sendMessage` / `answerCallbackQuery` 錯誤，依訊息判斷是「query is too old」還是送出的內容格式問題。
