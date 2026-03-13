# Gemini 2.5 Flash：重複兩句話後失敗 — 日誌紀錄

## 現象（你回報的）

選用 **Google Gemini 2.5 Flash** 後：
- 重複發了**兩句話**
- 接著出現**失敗** status

## 日誌證據（2026-02-12）

**`~/.openclaw/logs/gateway.err.log`** 第 41954 行：

```
2026-02-12T04:04:15.660Z [openclaw] Uncaught exception: TypeError: Cannot read properties of null (reading 'setSession')
    at TLSSocket.setSession (node:internal/tls/wrap:1131:16)
```

與 **Gemini 2.5 Pro** 先前文件中的錯誤相同：  
對 **Google API** 的 HTTPS 連線在**連線重用**時，TLS 狀態為 null，觸發 `setSession` 崩潰。

## 流程推論

1. 使用 Gemini 2.5 Flash 發送請求。
2. **第一、二次請求**可能成功 → 你看到回覆（或重複兩句）。
3. **下一次**打 Google API 時觸發上述 TLS 錯誤 → Gateway 或該 session 掛掉。
4. 介面／Telegram 顯示**失敗** status。

結論：**Gemini 2.5 Flash 與 2.5 Pro 走同一套 Google API／Node TLS，會出現同一問題**（重複回覆感 + 隨後失敗）。

## 建議

1. **改回以 Kimi 或 Claude 為主力**（Telegram 較穩定）  
   - 在 Telegram 輸入：`/model kimi/kimi-k2.5` 或 `/model anthropic/claude-haiku-4-5-20251001`  
   - 或編輯 `~/.openclaw/openclaw.json`，將 `agents.defaults.model.primary` 改為 `kimi/kimi-k2.5`，再執行 `openclaw gateway restart`。

2. **若仍想用 Gemini**  
   - 僅放在 **fallbacks** 末段，主力用 Kimi/Claude，減少打 Google API 的次數，降低觸發機率。

3. **已發生失敗後**  
   - 執行 `openclaw gateway restart` 恢復服務，再依上改 primary 或 session 模型。
