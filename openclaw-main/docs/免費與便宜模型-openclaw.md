# OpenClaw 免費與較便宜模型選項

## 一、Google Gemini 免費額度（推薦，免信用卡）

- **取得 API Key**：https://aistudio.google.com/apikey （用 Google 帳號登入，建立金鑰即可，**不需綁信用卡**）
- **免費額度**（依模型，每日重置）：
  - Gemini 2.5 Flash：約 10 次/分鐘、25 萬 TPM、250 次/日
  - Gemini 2.5 Flash-Lite：約 15 次/分鐘、1000 次/日
  - Gemini 2.0 Flash：約 15 次/分鐘、200 次/日

**在 OpenClaw 設定：**

1. 把 key 寫進 `~/.openclaw/.env`：
   ```bash
   GEMINI_API_KEY=你的AIza開頭的key
   ```
2. 設定模型並重啟：
   ```bash
   openclaw models set google/gemini-2.5-flash
   # 或 google/gemini-2.0-flash
   launchctl bootout gui/$(id -u)/ai.openclaw.gateway
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist
   ```
3. 若 `agents.defaults.models` 只允許其他模型，需在 `~/.openclaw/openclaw.json` 的 `agents.defaults.models` 裡加上 `"google/gemini-2.5-flash": {}`（或你選的型號）。

---

## 二、Ollama 本機模型（完全免費，用自己電腦算力）

- **安裝**：https://ollama.com 下載並安裝 Ollama
- **拉模型**（任選）：
  ```bash
  ollama pull llama3.2
  # 或 ollama pull qwen2.5-coder:7b
  # 或 ollama pull gemma2:9b
  ```
- **OpenClaw 使用 Ollama**：需設成本機 OpenAI 相容端點（例如 `http://127.0.0.1:11434/v1`），並在 `models.providers` 裡加一個 `ollama` provider，或透過 LM Studio / LiteLLM 等對接。詳見官方 [Local Models](https://docs.openclaw.ai/gateway/local-models) 與 [Ollama 整合](https://docs.ollama.com/integrations/openclaw)。

**注意**：本機跑大模型建議至少 16GB RAM，較大模型需 24GB+ 或顯卡。

---

## 三、較便宜的付費選項（非免費）

| 選項 | 說明 |
|------|------|
| **OpenAI gpt-4o-mini** | 比 gpt-4o 便宜很多，`openclaw models set openai/gpt-4o-mini` |
| **OpenRouter** | 有多種模型與定價，部分較便宜，需 `OPENROUTER_API_KEY` |
| **Groq** | 推論快、常有免費額度，需 `GROQ_API_KEY` |

---

## 四、你目前可立刻試的：Gemini 免費

1. 到 https://aistudio.google.com/apikey 建立 API 金鑰（AIza 開頭）。
2. 在 `~/.openclaw/.env` 加上一行：`GEMINI_API_KEY=你的key`。
3. 在 `~/.openclaw/openclaw.json` 的 `agents.defaults.model.primary` 設為 `google/gemini-2.5-flash`，並在 `agents.defaults.models` 加上 `"google/gemini-2.5-flash": {}`。
4. 重啟 Gateway（同上 `launchctl bootout` / `bootstrap`）。

之後小蔡就會用 **Google 免費額度** 的 Gemini 跟你對話（額度用完要等每日重置）。
