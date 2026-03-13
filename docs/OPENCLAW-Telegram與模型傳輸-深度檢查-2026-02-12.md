# Telegram 與 OpenClaw 模型傳輸 — 深度檢查報告（2026-02-12）

## 1. 檢查總覽

| 項目 | 狀態 | 說明 |
|------|------|------|
| OpenClaw Telegram Bot | ✅ 正常 | getMe 成功，@xiaoji_cai_bot |
| Gateway 狀態 | ✅ 運行中 | RPC ok, port 18789 |
| Telegram 通道 | ✅ 已啟動 | doctor: Telegram ok (@xiaoji_cai_bot) |
| 模型 → 回覆路徑 | ✅ 正常 | 日誌見 embedded run 使用 kimi，durationMs 約 4.5s |
| 任務板 Telegram 與 OpenClaw 分工 | ✅ 無衝突 | 見下方「雙 Bot / 傳輸分工」 |

---

## 2. OpenClaw 端設定（~/.openclaw/openclaw.json）

### 2.1 channels.telegram（節錄）

```json
{
  "enabled": true,
  "dmPolicy": "pairing",
  "botToken": "8056783828:AAE...",
  "groups": { "*": { "requireMention": true } },
  "groupPolicy": "allowlist",
  "streamMode": "partial"
}
```

- **dmPolicy: pairing** — DM 需配對核准，合理。
- **groups["*"]: requireMention: true** — 群組內須 @ 提及機器人才回覆；`"*"` 表示所有群組都在 allowlist，僅控制「是否須提及」。
- **groupPolicy: allowlist** — 群組內「誰可以觸發」由 allowlist 控制；預設為僅允許在 **groupAllowFrom** 中的使用者。

### 2.2 群組發言權（groupAllowFrom）

官方說明：`groupPolicy: "allowlist"` 時，僅 **groupAllowFrom** 內的使用者可在群組觸發 bot；未設定則群組訊息可能被擋。

- **建議**：若希望特定使用者在群組 @bot 能收到回覆，在 `channels.telegram` 加上：
  ```json
  "groupAllowFrom": ["5819565005"]
  ```
  （數字為 Telegram 使用者 ID，可從 `openclaw logs --follow` 的 `from.id` 或 @userinfobot 取得。）
- 若目前群組已能正常回覆，代表可能已透過配對/其他方式允許，可維持現狀；若「群組 @bot 沒反應、DM 正常」，優先檢查並補上 **groupAllowFrom**。

### 2.3 Bot 驗證（getMe）

- **Bot**：@xiaoji_cai_bot（id: 8056783828）
- **getMe**：`https://api.telegram.org/bot<token>/getMe` 回傳 `ok: true`
- **can_read_all_group_messages**：true（或已設為群組管理員），群組訊息可見性無問題。

---

## 3. 傳輸路徑：Telegram ↔ 模型

### 3.1 流程（簡化）

1. **Telegram → OpenClaw**  
   使用者（DM 或群組 @bot）發訊 → Telegram 伺服器 → OpenClaw Gateway（**預設 long-polling**，無需公網 URL）→ 正規化為 channel envelope。

2. **OpenClaw → 模型**  
   Gateway 將訊息交給 agent（main）→ 使用 **agents.defaults.model.primary**（kimi/kimi-k2.5）與 **fallbacks**（kimi-k2-turbo、claude-sonnet、claude-haiku）→ 呼叫對應 LLM API（Kimi/Anthropic 等）。

3. **模型 → Telegram**  
   模型回覆 → Gateway → 經 Telegram Bot API 回傳到同一 chat（DM 或群組）。

### 3.2 日誌佐證（模型有被呼叫且成功）

- `gateway/channels/telegram`: `[default] starting provider (@xiaoji_cai_bot)`
- `agent/embedded`: `embedded run start ... provider=kimi model=kimi-k2.5`
- `agent/embedded`: `embedded run done ... durationMs=4577 aborted=false`

結論：**Telegram 收訊 → 模型推理 → 回傳** 這條路徑正常，無傳輸中斷或模型未呼叫的問題。

---

## 4. 任務板後端（本專案）與 Telegram 的關係

### 4.1 兩套 Telegram 用途（不衝突）

| 用途 | 使用方 | Token 來源 | 行為 |
|------|--------|------------|------|
| **收發對話（DM/群組）** | OpenClaw Gateway | openclaw.json `channels.telegram.botToken` | 收訊、呼叫模型、回覆（long-poll 或 webhook） |
| **任務通知（成功/失敗/超時等）** | 任務板 server | 環境變數 `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | 僅 **發送** 通知到固定 chat，不拉 getUpdates |
| **/stop 緊急終止** | 任務板 server | 環境變數 `TELEGRAM_STOP_BOT_TOKEN` | 輪詢 getUpdates，只處理 /stop 並回覆 |

### 4.2 為何不會衝突

- **OpenClaw 的 bot**：只做「收訊息 → 模型 → 回覆」；同一 token 不會被任務板拿來做 getUpdates。
- **任務板 TELEGRAM_BOT_TOKEN**：只用於 `sendMessage` 到 `TELEGRAM_CHAT_ID`，不接收更新。
- **TELEGRAM_STOP_BOT_TOKEN**：建議為**第二個 bot**（文件與 .env.example 已說明），專用於 getUpdates 輪詢 /stop，與 OpenClaw 的 bot 分離，避免搶訊息。

若 **TELEGRAM_BOT_TOKEN** 與 OpenClaw 的 **botToken** 相同：  
- 任務板只發不收 → 不影響 OpenClaw 收訊與模型回覆。  
若 **TELEGRAM_STOP_BOT_TOKEN** 未設：  
- /stop 輪詢不啟動，僅不提供「由 Telegram 發 /stop 終止任務」；OpenClaw 對話與模型傳輸不受影響。

---

## 5. 設定檢查清單（可逐項對照）

- [x] OpenClaw Gateway 運行中（`openclaw gateway status`）
- [x] `channels.telegram.enabled: true`，`plugins.entries.telegram.enabled: true`
- [x] `channels.telegram.botToken` 有效（getMe 成功）
- [x] 模型 primary/fallbacks 與 auth 正常（`openclaw models status` / `openclaw models list`）
- [x] 日誌中有 Telegram provider 啟動與 embedded run 使用 kimi、完成 run
- [ ] **群組 @bot 無回覆時**：檢查並設定 `channels.telegram.groupAllowFrom`（見 2.2）
- [ ] 任務板通知要發 TG：在後端 .env 設定 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`
- [ ] 需要 TG /stop 終止任務：另建一 bot，設 `TELEGRAM_STOP_BOT_TOKEN`，且不要與 OpenClaw bot 同一個

---

## 6. 常見問題對照

| 現象 | 可能原因 | 處理 |
|------|----------|------|
| 群組 @bot 沒反應、DM 正常 | groupPolicy: allowlist 但未設 groupAllowFrom | 在 `channels.telegram` 加 `groupAllowFrom: ["<user_id>"]` |
| 模型不回話（404/空回覆） | 模型 ID 或 allowlist 或 API key | 見 docs/模型不回話-排查步驟.md、OPENCLAW-MODELS-REFERENCE.md |
| 任務板收不到 TG 通知 | 未設 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID | 在 server 的 .env 設定並重啟後端 |
| /stop 無效 | 未設 TELEGRAM_STOP_BOT_TOKEN 或 與 OpenClaw 同 bot | 用第二個 bot token 設 TELEGRAM_STOP_BOT_TOKEN |

---

## 7. 結論

- **Telegram 與 OpenClaw 模型傳輸**：路徑與設定正常；Bot 有效、Gateway 正常、日誌顯示模型（kimi）有被呼叫且完成回覆。
- **設定上唯一建議**：若群組內 @bot 不應答，請補上 **groupAllowFrom**（見 2.2）。
- **任務板與 OpenClaw**：雙 Bot 分工清楚，無衝突；通知與 /stop 為任務板端選配，不影響 OpenClaw 的 Telegram 對話與模型傳輸。
