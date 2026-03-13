# Telegram 設定排查

針對 `~/.openclaw/openclaw.json` 與相關檔案的 Telegram 設定檢查。

---

## 主要 Bot（OpenClaw 使用）

| 項目 | 值 |
|------|-----|
| **Bot 帳號** | [@xiaoji_cai_bot](https://t.me/xiaoji_cai_bot) |
| **Token（openclaw.json）** | `REDACTED` |

上述 token 已寫在 `~/.openclaw/openclaw.json` 的 `channels.telegram.botToken`，與主要 bot 一致。  

**其他 bot（非 OpenClaw 使用）**  
- **@ollama168bot**：`REDACTED` — Ollama 本地用，非 OpenClaw（token 在 `~/.openclaw/config/telegram.env`）。  
- **@WhiDan66bot**：`REDACTED` — 一般用途，非 OpenClaw。

---

## 1. 目前設定摘要

| 項目 | 位置 | 目前值 |
|------|------|--------|
| **channels.telegram.enabled** | openclaw.json | `true` |
| **channels.telegram.botToken** | openclaw.json | `8056783828:AAEbVmp2...`（約 46 字元） |
| **channels.telegram.dmPolicy** | openclaw.json | `pairing` |
| **channels.telegram.groupPolicy** | openclaw.json | `allowlist` |
| **channels.telegram.groups["*"]** | openclaw.json | `requireMention: true` |
| **channels.telegram.streamMode** | openclaw.json | `partial` |
| **plugins.entries.telegram.enabled** | openclaw.json | `true` |
| **credentials/telegram-allowFrom.json** | ~/.openclaw | `allowFrom: ["5819565005"]` |
| **credentials/telegram-pairing.json** | ~/.openclaw | `requests: []`（目前無待核准） |
| **config/telegram.env** | ~/.openclaw | 另一組 `TELEGRAM_BOT_TOKEN=8225683676:...` |

---

## 2. 發現的問題與建議

### 2.1 兩組不同的 Bot Token（重要）

- **OpenClaw 實際使用的 token**：來自 `openclaw.json` → `channels.telegram.botToken`，開頭為 **`8056783828`**。
- **config/telegram.env** 裡是另一組 token，開頭為 **`8225683676`**（通常給其他腳本用，例如 ollama monitor、任務板後端等）。

**影響**：若你在 Telegram 裡對話的是「用 82256 那組 token 建的那隻 bot」，OpenClaw **不會**收到那些訊息，因為 gateway 只接 80567 那隻 bot。

**建議**：
- 確認你在 Telegram 對話的 bot，是從 [@BotFather](https://t.me/BotFather) 拿 **8056783828** 那組 token 建的那一隻。
- 若你希望用 **82256** 那隻 bot 接 OpenClaw：把 `openclaw.json` 的 `channels.telegram.botToken` 改成 `config/telegram.env` 裡的那組 token，存檔後重啟 gateway。
- 若 80567 才是 OpenClaw 專用、82256 是別用途：維持現狀即可，只要確保「和 OpenClaw 對話時用的是 80567 那隻 bot」。

---

### 2.2 私聊（DM）政策：pairing

- **dmPolicy: "pairing"** 表示：私聊要先完成 **pairing**（配對），bot 才會回。
- **credentials/telegram-allowFrom.json** 有 `5819565005`，但那是 **allowlist** 用的；在 `dmPolicy: "pairing"` 時，通常以 pairing 為準，allowFrom 不一定會拿來當 DM 白名單。

**若你希望「指定 user 不用配對就能私聊」**：
- 可改為 `dmPolicy: "allowlist"`，並在設定裡提供 `allowFrom: ["5819565005"]`（或 OpenClaw 支援時從 credentials 讀取）。
- 若維持 pairing：新用戶需先觸發配對，再用 `openclaw pairing approve telegram <code>` 核准。

目前 **telegram-pairing.json** 的 `requests` 是空的，表示沒有待核准的配對；已對話過的 5819565005 應是先前已配對或透過 allowlist 允許。

---

### 2.3 群組：allowlist + 需 @ 提及

- **groupPolicy: "allowlist"**：只有「在 allowlist 內的群組」會得到 bot 回覆。
- **groups["*"].requireMention: true**：在群組裡要 **@bot** 才會回，避免刷版。

若某個群組沒被加入 allowlist，bot 在該群不會回。群組 allowlist 的設定方式依 OpenClaw 版本可能在不同檔（例如 credentials 或 openclaw.json），需對照官方文件確認「群組 ID 要寫在哪」。

---

### 2.4 結構與外掛

- Telegram 設定在 **channels.telegram**（不是 plugins.entries.telegram 的內容），結構正確。
- **plugins.entries.telegram.enabled: true** 表示 Telegram 外掛有啟用，與 **channels.telegram** 一起使用，沒問題。

---

## 3. 常見錯誤對照

| 現象 | 可能原因 | 處理 |
|------|----------|------|
| 私聊完全沒回 | 1) 用的是另一隻 bot（82256）<br>2) 未完成 pairing 且非 allowlist | 確認對話的是 80567 那隻 bot；必要時改 dmPolicy 或完成 pairing |
| 群組 @bot 沒回 | 群組不在 allowlist | 把該群組 ID 加入 allowlist |
| 401 / 認證錯誤 | botToken 錯或過期 | 到 @BotFather 用 /revoke 重取 token，更新 openclaw.json 的 botToken，重啟 gateway |
| 回很慢或斷線 | 網路或 Telegram API 不穩 | 看 gateway 日誌；streamMode 已是 partial，可維持 |

---

## 4. 快速檢查指令

```bash
# 看目前 channels.telegram 設定（需 jq）
cat ~/.openclaw/openclaw.json | jq '.channels.telegram'

# 看 allowFrom
cat ~/.openclaw/credentials/telegram-allowFrom.json

# 看 gateway 是否載入 Telegram（看 log 是否有 telegram starting provider）
tail -50 ~/.openclaw/logs/gateway.log
```

修改 `openclaw.json` 或 credentials 後，記得執行：

```bash
openclaw gateway restart
```

---

*排查日期依檔案更新時間為準。*
