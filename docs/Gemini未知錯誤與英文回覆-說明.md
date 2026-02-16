# Gemini 2.5 Flash：「An unknown error occurred」與只傳英文

## 你的模型都有保留

目前 **agents.defaults.models** 裡的模型全部保留，沒有刪除：
- ollama/mistral
- google/gemini-2.5-flash
- google-antigravity/claude-opus-4-5-thinking
- openai/gpt-4o
- ollama/qwen2.5:14b
- ollama/llama3.2

只會查原因與設定，不會動到這些模型。

---

## 一、「An unknown error occurred」可能原因

從日誌裡看到幾種會變成「未知錯誤」的情況：

### 1. 工具執行失敗（invalid config）

日誌有：`[tools] gateway failed: invalid config`

代表某次**工具呼叫**（例如透過 bot 改設定）時，送出的設定不合法，Gateway 回傳錯誤，前端就顯示成 "An unknown error occurred"。

**建議：** 盡量用本機改 `~/.openclaw/openclaw.json`，不要用會動到 config 的工具指令，可減少這類錯誤。

### 2. 網頁搜尋 (Brave) 參數錯誤

日誌有：`Brave Search API error (422): ... ui_lang ... search_lang ...`

代表呼叫 Brave 搜尋時，語系參數不符合 API 規定（例如用了 `en` 而不是 `en-US` 或 `zh-TW`），搜尋失敗，有時也會導致該次回合失敗、被顯示成未知錯誤。

**建議：** 若不需要搜尋，可暫時關閉 web search，或等 OpenClaw 更新 Brave 語系參數。

### 3. 逾時（lane wait exceeded）

日誌有：`lane wait exceeded: lane=session:agent:main:main waitedMs=2xxx`

代表該次請求等太久才得到回應，可能被中斷或當成失敗，前端就顯示未知錯誤。

**建議：** 再試一次；若常發生，可換較快的模型或檢查網路／API 狀態。

### 4. Gemini API key（daemon 是否拿得到）

你已在 plist 裡設定 `GEMINI_API_KEY`，一般情況下 daemon 會用到。若仍出現 401/403，再檢查 key 是否有效、是否被 revoke。

---

## 二、為什麼一直只傳英文？

主要原因是 **給模型的「系統／工作區」說明大多是英文**（例如 AGENTS.md、SOUL.md、預設說明），模型容易跟著用英文回覆。

### 已幫你加的設定

在 **USER.md** 最上面加了一行：

- **Reply language:** 一律用 **繁體中文** 回覆，除非用戶用其他語言發訊才改用該語言。不要用英文回覆。

這樣模型在讀「誰是使用者」時就會看到「用繁體中文回覆」的指示。

### 請你再試一次

1. 在 Telegram 對 bot 輸入 **`/new`** 開新對話。
2. 再傳一則短訊（例如：「你好」）。
3. 看回覆是否改為繁體中文。

若還是英文，可以再在 **USER.md** 把這句改更強（例如：「Every reply must be in Traditional Chinese (繁體中文). Do not reply in English.」），或把同一句也加在 **IDENTITY.md** 開頭，再 `/new` 試一次。

---

## 三、日誌怎麼查

之後若再出現 "An unknown error occurred"，可在本機執行：

```bash
tail -50 ~/.openclaw/logs/gateway.err.log
```

把最後幾行（尤其是含 `error`、`failed`、`Embedded agent failed` 的）貼出來，就能對應到上面哪一種原因。
