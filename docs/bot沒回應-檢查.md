# Bot 沒回應 — 檢查清單（本機 Ollama）

## 不是「沒有 API」的問題

用 **ollama/llama3.2**（或 mistral、qwen2.5:14b）時，**不需要任何雲端 API**。  
Auth 已設好（`ollama:local`），所以「沒回應」不是因為缺 API。

---

## 最常見原因：Ollama 沒在跑

日誌裡出現過：
- `Failed to connect to localhost port 11434`
- `Failed to discover Ollama models: fetch failed`

代表 **當下 Ollama 沒有在跑**，Gateway 連不到本機模型，就不會回覆。

**請養成習慣：發訊息給 bot 前，先確認 Ollama 有起來。**

```bash
# 檢查：有回傳 JSON 就代表 Ollama 在跑
curl -s http://127.0.0.1:11434/api/tags
```

- 若沒在跑：**打開 Ollama app**，或終端執行 **`ollama serve`**，再試一次 bot。

---

## 本機模型較慢，可能「等太久像沒回應」

Llama 3.2 在本機跑可能要 **十幾秒甚至更久** 才開始回字。  
若 Gateway 或 Telegram 逾時，你會覺得「沒回應」。

**可以試：**
1. 先換成較小、較快的模型，例如 **ollama/mistral**，看是否會回。
2. 或先換成**雲端模型**（例如 `google/gemini-2.5-flash`）確認 bot 與通道都正常，再改回 ollama/llama3.2。

---

## 快速檢查三件事

| 項目 | 指令／做法 |
|------|------------|
| 1. Ollama 有在跑？ | `curl -s http://127.0.0.1:11434/api/tags` 有 JSON |
| 2. Gateway 有在跑？ | `launchctl list \| grep openclaw` 有 ai.openclaw.gateway |
| 3. 目前預設模型？ | 看 `~/.openclaw/openclaw.json` 裡 `agents.defaults.model.primary` |

---

## 建議：開機自動跑 Ollama（可選）

若希望 Ollama 常駐，可設成登入時自動啟動（例如用 LaunchAgent），這樣 bot 用本機模型時就不會因為「Ollama 沒開」而沒回應。  
需要我可以幫你寫一份 LaunchAgent 設定範例。
