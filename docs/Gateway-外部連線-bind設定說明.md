# Gateway 改 bind 後機器人沒反應 — 原因與正確設定

## 為什麼改成 0.0.0.0 後 Bot 會失效？

有兩個常見原因：

### 1. 設定檔寫錯值（無效的 bind）

OpenClaw 的 `gateway.bind` **不能**填寫 `"0.0.0.0"` 這個字串。

可用的只有這五種：`"loopback"` | `"lan"` | `"auto"` | `"custom"` | `"tailnet"`。

若在 `openclaw.json` 裡寫成：

```json
"gateway": { "bind": "0.0.0.0" }
```

啟動時會報錯並**拒絕啟動**：

- `Invalid --bind (use "loopback", "lan", "tailnet", "auto", or "custom")`

因此 Gateway 根本沒起來，Bot 當然不會有反應。

---

### 2. 改成「對外聽」卻沒設認證（安全規定）

當 `bind` 不是 `"loopback"`（例如改成 `"lan"`，也就是對外聽 0.0.0.0）時，**程式規定一定要有認證**，否則不給啟動：

- 會出現：`Refusing to bind gateway to lan without auth.`
- 並要求：設定 `gateway.auth.token` 或 `OPENCLAW_GATEWAY_TOKEN`，或啟動時加 `--token`

若沒有照做，Gateway 一樣不會啟動，Bot 就不會動。

---

## 正確做法：要讓外部連到 Gateway

1. **bind 用 `"lan"`，不要用 `"0.0.0.0"`**  
   - `"lan"` 會讓 Gateway 聽在 `0.0.0.0`（所有介面），本機與外部都能連。

2. **一定要設定 Gateway 認證**（二擇一或並用）  
   - 在 `openclaw.json` 裡加上 `gateway.auth`，例如：
     ```json
     "gateway": {
       "mode": "local",
       "bind": "lan",
       "auth": {
         "mode": "token",
         "token": "REDACTED"
       }
     }
     ```
   - 或是用環境變數：`OPENCLAW_GATEWAY_TOKEN=你自訂的token`
   - 或是啟動指令加：`--token 你自訂的token`

3. **Control UI / Chat 連線時要帶同一個 token**  
   - 從瀏覽器開 Control UI（本機或別台電腦）時，在「Connect」畫面要輸入**同一個 token**，連線才會通過，Bot 才能正常回覆。

---

## 範例：openclaw.json（本機 + 外部都能連）

```json
{
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "REDACTED"
    }
  },
  "agents": { ... }
}
```

- 啟動：照平常方式啟動 Gateway（若用 dev：`OPENCLAW_STATE_DIR=~/.openclaw-dev ... gateway --token dev-local` 時，token 用 `dev-local` 或與 config 一致即可）。
- 連線：在 Control UI 的 Connect 裡填同一個 token（例如 `my-secret-token` 或 `dev-local`）。

---

## 總結

| 狀況 | 原因 | 解法 |
|------|------|------|
| 改 bind 後 Bot 完全沒反應 | bind 寫成 `"0.0.0.0"` 導致無效、Gateway 不啟動 | 改成 `"lan"` |
| 改成 `"lan"` 後仍不啟動 / 沒反應 | 非 loopback 時強制要認證，沒設 token | 在 config 或 env 設 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`，並在 Control UI Connect 時輸入同一 token |

這樣設定後，Gateway 會正常啟動，本機與外部都能連，Bot 也會正常運作。
