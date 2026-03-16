# Telegram 傳給 OpenClaw 沒有反應 — 排查說明

## 可能原因總覽

| 情況 | 說明 | 對應做法 |
|------|------|----------|
| **私訊 (DM) 沒回** | 目前設定為「配對制」：只有已核准的帳號才會被回覆 | 見下方「1. 私訊要配對」 |
| **群組沒回** | 要 @ 機器人，且群組可能要在白名單裡 | 見下方「2. 群組 @ 與白名單」 |
| **有收到但回很慢／像沒回** | 主模型 API 額度用完 (429)，改走本機 fallback，等很久 | 見下方「3. API 額度與 fallback」 |
| **handler failed / Cannot find module auth-profiles-…** | Gateway 進程是舊的，還在載入已不存在的 chunk 檔名，回覆送不出去 | 見下方「5. Gateway 回覆模組找不到」 |
| **通道／Gateway 有問題** | 少見，但可先確認狀態 | 見下方「4. 通道與日誌」 |

---

## 1. 私訊要配對（dmPolicy: pairing）

你目前的 Telegram 設定是 **`dmPolicy: "pairing"`**，代表：

- **只有「已核准配對」的 Telegram 帳號** 在私訊時才會被 OpenClaw 回覆。
- 沒配對過的帳號傳私訊給 bot → 訊息會被**直接忽略**，不會進 agent，所以完全沒反應。

### 怎麼確認／修正

1. **看有沒有待核准的配對請求**
   ```bash
   openclaw pairing list telegram
   ```
   若有人剛對 bot 發過 `/start` 或第一次私訊，這裡會出現一筆，並有一個 **配對碼 (code)**。

2. **核准你的帳號（用上一步的 code）**
   ```bash
   openclaw pairing approve telegram <配對碼>
   ```
   核准後，該 Telegram 帳號的私訊就會開始被處理並回覆。

3. **若不想用配對制**（不建議對外公開的 bot）
   - 可改為接受所有私訊，例如在 config 把 `channels.telegram.dmPolicy` 改成 `"open"`（需查官方文件確認可選值與風險）。

---

## 2. 群組 @ 與白名單（groupPolicy: allowlist）

你目前的設定：

- **`groups["*"].requireMention: true`** → 在**所有群組**裡都要 **@ 你的 bot**（例如 `@xiaoji_cai_bot`）才會觸發回覆。
- **`groupPolicy: "allowlist"`** → 只有**白名單內的群組**才會被處理；若從未設定白名單，可能等於**沒有任何群組**被允許，群組訊息會全部被忽略。

### 怎麼確認／修正

- **一定要 @ bot**：在群組裡發文時要 `@xiaoji_cai_bot 你的問題`，不要只打字不 @。
- **白名單**：若要用群組，需在 config 裡為 Telegram 設定群組白名單（例如 `groupAllowlist` 或對應欄位），把該群組 ID 加進去。可查 OpenClaw 文件「Telegram / group allowlist」確認欄位名稱與格式。

---

## 3. API 額度與 fallback（看起來像沒反應）

日誌裡若出現類似：

```text
FailoverError: Cloud Code Assist API error (429): You have exhausted your capacity on this model. Your quota will reset after 138h55m15s.
```

代表：

- **主模型**（例如透過 google-antigravity 的 Claude）已達 **429 額度上限**，不會再回。
- OpenClaw 會自動 **fallback 到備援模型**（例如本機 `ollama/qwen2.5:14b`）。
- Fallback 若較慢（例如本機跑 1–2 分鐘），或偶發失敗，你就會覺得「傳了沒反應」。

### 建議做法

- **短期**：改用額度還沒用完的模型當 primary（例如換成別的 Google 模型、或你有額度的 OpenAI/Anthropic），或**暫時改成本機當主模型**（見下方指令），就不會先等 429 再 fallback。
- **暫時改成本機當主模型**（先讓 Telegram 有回覆）：
  ```bash
  openclaw config set agents.defaults.model.primary "ollama/qwen2.5:14b"
  openclaw config set agents.defaults.model.fallbacks "[]"
  ```
  之後額度恢復再改回 `google/gemini-2.5-flash` 與原 fallbacks。
- **看日誌**：用下面「4. 通道與日誌」確認訊息有進、有跑 run、是 429 還是 fallback 慢。

---

## 4. 通道與日誌（確認「有收到」與「有在跑」）

- **通道狀態**
  ```bash
  openclaw status
  openclaw channels status --probe
  ```
  確認 Telegram 為 **ON / OK / works**。

- **即時日誌（看有沒有收到、有沒有跑完）**
  ```bash
  openclaw logs --follow
  ```
  再從 Telegram 發一則訊息（私訊要已配對；群組要 @ bot 且在白名單內）。可注意：
  - 有無 `messageChannel=telegram` 的 **run start** → 代表有收到並開始處理。
  - 有無 **run_completed** / **run done** → 代表 agent 跑完。
  - 有無 **lane task error** 或 **429** → 代表主模型額度或錯誤，接著會 fallback。

若日誌裡完全沒有對應的 telegram run，多半是 **被 pairing / allowlist 擋掉**（見 1、2）。

---

## 5. Gateway 回覆模組找不到（handler failed / ERR_MODULE_NOT_FOUND）

日誌出現：

- `gateway/channels/telegram: handler failed: Cannot find module '.../auth-profiles-3t9aTwDR.js'`（或類似 `reply-xxx.js`、`auth-profiles-xxx.js` 找不到）

代表 **Gateway 進程是很早以前啟動的**，當時套件裡的 chunk 檔名和現在不一致（例如曾更新過 openclaw 但沒重啟 Gateway），所以要把回覆發回 Telegram 時載入模組失敗，**你看起來就像沒回應**。

**解法：重啟 Gateway，讓它載入目前安裝的套件。**

```bash
openclaw gateway stop
openclaw gateway install
```

或僅停止後由 LaunchAgent 自動重啟（若已設 `KeepAlive`）。再執行 `openclaw gateway status` 確認 Runtime: running、RPC probe: ok。完成後再從 Telegram 發一則測試。

---

## 快速對照表

| 現象 | 先檢查 |
|------|--------|
| 私訊完全沒反應 | `openclaw pairing list telegram` → 自己先對 bot 發一次訊息再 approve，或改 dmPolicy |
| 群組完全沒反應 | 是否有 @ bot；群組是否在 allowlist |
| 有時有回、有時沒有／等很久 | `openclaw logs --follow` 看 429 / fallback；必要時改 primary 模型或等 fallback 跑完 |
| 日誌有 `handler failed`、`auth-profiles-xxx.js` 或 `reply-xxx.js` 找不到 | 重啟 Gateway：`openclaw gateway stop` → `openclaw gateway install` |

若你願意，可以貼一段 **`openclaw logs --follow`** 在發訊息當下的輸出（可遮掉 token），我可以幫你對應到上述哪一類原因。
