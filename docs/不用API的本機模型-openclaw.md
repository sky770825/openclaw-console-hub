# OpenClaw 不用 API 的本機模型方案

以下都是**本機運行、不需任何雲端 API key**的用法（Telegram bot token 仍需要，那是通道不是 LLM）。

---

## 1. Ollama（你目前用的）

- **已設定**：本機 Mistral，auth 用 `auth-profiles.json` 裡的 `ollama:local`（key 填 `ollama-local` 即可）。
- **要做的**：確保本機執行 `ollama serve` 且已 `ollama pull mistral`。
- **優點**：免註冊、免付費、資料不出本機。
- **缺點**：小模型容易亂回（例如輸出 BOOTSTRAP/MEMORY 說明），可試試換模型：`ollama pull llama3.2` 或 `ollama pull qwen2.5:7b`，再在設定裡把 primary 改成 `ollama/llama3.2` 或 `ollama/qwen2.5:7b`。

---

## 2. LM Studio（官方推薦本機方案）

用 [LM Studio](https://lmstudio.ai) 跑本機模型，對外提供 OpenAI 相容的 `/v1` 介面，OpenClaw 當成一個「本機 provider」連過去，**不需要任何 API key**。

### 步驟摘要

1. **安裝 LM Studio**  
   - 官網下載： https://lmstudio.ai

2. **在 LM Studio 裡**  
   - 下載一個模型（例如 MiniMax M2.1、GLM-4.7 Flash、或任一你電腦跑得動的）。
   - 開啟 **Local Server**（預設 `http://127.0.0.1:1234`）。
   - 確認 `http://127.0.0.1:1234/v1/models` 有列出模型。

3. **在 OpenClaw 設定裡加 LM Studio provider**  
   在 `~/.openclaw/openclaw.json` 的 `models.providers` 裡加上（把 `id` / `name` 改成你在 LM Studio 裡看到的模型名）：

```json
"lmstudio": {
  "baseUrl": "http://127.0.0.1:1234/v1",
  "apiKey": "lmstudio",
  "api": "openai-completions",
  "models": [
    {
      "id": "你的模型id",
      "name": "顯示名稱",
      "api": "openai-completions",
      "reasoning": false,
      "input": ["text"],
      "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
      "contextWindow": 32768,
      "maxTokens": 8192
    }
  ]
}
```

4. **在 `agents.defaults.models` 裡**  
   加上 `"lmstudio/你的模型id": {}`，若要當預設，把 `agents.defaults.model.primary` 設成 `"lmstudio/你的模型id"`。

5. **Auth**  
   LM Studio 本機不驗證，`apiKey` 填任意字串（如 `lmstudio`）即可；若 OpenClaw 仍報缺 key，可在 `auth-profiles.json` 加一個 type 為 `api_key`、provider 為 `lmstudio` 的 profile，key 填 `lmstudio`。

6. **重啟 Gateway**  
   `launchctl bootout gui/$(id -u)/ai.openclaw.gateway` 再 `launchctl bootstrap ...`。

**優點**：介面簡單、官方文件有寫；可選模型多。  
**缺點**：要自己開 LM Studio 並保持 Local Server 開啟。

---

## 3. 其他「OpenAI 相容」本機代理

只要本機有程式提供 **OpenAI 風格的 `/v1` 介面**（例如 vLLM、LiteLLM、llama.cpp server、自建 proxy），都可以用同一招：

- 在 `models.providers` 加一個新 provider：
  - `baseUrl`: 你的本機位址，例如 `http://127.0.0.1:8000/v1`
  - `apiKey`: 任意字串（本機通常不驗證）
  - `api`: `"openai-completions"`
  - `models`: 你的模型 id / contextWindow / maxTokens
- 在 `agents.defaults.models` 加上對應的 `provider/modelId`，需要時設為 primary。

一樣**不需要任何雲端 API**，只要本機服務有起來即可。

---

## 總結

| 方案        | 需要雲端 API？ | 要額外裝什麼      |
|-------------|----------------|-------------------|
| Ollama      | 否             | Ollama + 模型     |
| LM Studio   | 否             | LM Studio + 模型  |
| vLLM/LiteLLM/自建 | 否        | 對應伺服器 + 模型 |

**你現在**：已用 Ollama + Mistral，若常遇到亂回，可試 (1) 換 Ollama 模型 或 (2) 改用 LM Studio 當本機 backend，兩者都是「不要 API」的辦法。
