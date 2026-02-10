# OpenClaw 接 Ollama 模型 — 檢查清單

你目前的設定**已經接好** OpenClaw ↔ Ollama，預設使用 **ollama/mistral**。

**重要**：Ollama、Google、OpenAI、Antigravity 等模型**都會保留**在設定裡，不會刪除；切換時只要改「預設模型（primary）」即可，其它模型仍可當 fallback 或手動切換。

---

## 1. 確認這三件事

| 項目 | 怎麼確認 |
|------|----------|
| **Ollama 有在跑** | 終端執行 `curl -s http://127.0.0.1:11434/api/tags` 有回傳 JSON（列出模型） |
| **已有模型** | 例如 `ollama list` 看到 `mistral:latest`（或你要用的模型） |
| **Gateway 有在跑** | `launchctl list \| grep openclaw` 有 `ai.openclaw.gateway` |

---

## 2. 目前設定摘要

- **設定檔**：`~/.openclaw/openclaw.json`
  - `models.providers.ollama`：`baseUrl = http://127.0.0.1:11434/v1`，`api = openai-completions`
  - 已列出的模型：**mistral**（id: `mistral`）
- **可切換的模型**（都不會刪除，只改 primary 就切換）：
  - `ollama/mistral`（本機）
  - `google/gemini-2.5-flash`
  - `google-antigravity/claude-opus-4-5-thinking`
  - `openai/gpt-4o`
- **目前預設**：`agents.defaults.model.primary = "ollama/mistral"`
- **Auth**：`~/.openclaw/agents/main/agent/auth-profiles.json` 裡有 `ollama:local`（api_key，key 為 `ollama-local`）

只要本機 Ollama 在跑，OpenClaw（含 Telegram bot）就會用 **ollama/mistral** 回覆。

### 如何切換模型（不刪其它）

只改 **`agents.defaults.model.primary`** 即可，例如：
- 要用本機 Ollama：`"primary": "ollama/mistral"`
- 要用 Google：`"primary": "google/gemini-2.5-flash"`
- 要用 OpenAI：`"primary": "openai/gpt-4o"`
- 要用 Antigravity：`"primary": "google-antigravity/claude-opus-4-5-thinking"`

改完可重啟 Gateway 讓設定生效；**其它模型都保留**，之後可隨時再切回來。

---

## 3. 想改用「別的 Ollama 模型」時

例如你已經用 Ollama 拉了其他模型（如 `llama3.2`、`qwen2.5:7b`）：

1. **在 openclaw.json 的 `models.providers.ollama.models` 裡加一筆**，例如：
   ```json
   {
     "id": "llama3.2",
     "name": "Llama 3.2",
     "api": "openai-completions",
     "reasoning": false,
     "input": ["text"],
     "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
     "contextWindow": 32768,
     "maxTokens": 8192
   }
   ```
2. **在 `agents.defaults.models` 裡加**：`"ollama/llama3.2": {}`
3. **若要當預設**：把 `agents.defaults.model.primary` 改成 `"ollama/llama3.2"`
4. **重啟 Gateway**：  
   `launchctl bootout gui/$(id -u)/ai.openclaw.gateway`  
   再  
   `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist`

`id` 要跟 `ollama list` 顯示的模型名稱一致（例如 `mistral`、`llama3.2`、`qwen2.5:7b`）。

---

## 4. 若 bot 沒回或報錯

1. 看錯誤：`tail -30 ~/.openclaw/logs/gateway.err.log`
2. 確認 Ollama：`ollama serve` 或打開 Ollama app，再 `curl -s http://127.0.0.1:11434/api/tags`
3. 重啟 Gateway（見上面指令）

---

**總結**：你已經用 OpenClaw 接好 Ollama；只要 Ollama 在跑、Gateway 在跑，就會用 **ollama/mistral**。要接「其他 Ollama 模型」就照第 3 步加一筆 model 並可設成 primary。
