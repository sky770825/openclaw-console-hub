# OpenClaw 設定完整檢查報告

檢查時間：依執行日為準。  
檢查範圍：`~/.openclaw/openclaw.json`、`~/.openclaw/agents/main/agent/models.json`、模型前綴與 allowlist。

---

## 1. agents.defaults（openclaw.json）

| 項目 | 狀態 | 說明 |
|------|------|------|
| **model.primary** | ✅ | `kimi/kimi-k2.5`（帶前綴） |
| **model.fallbacks** | ✅ | 三項皆帶前綴：`kimi/kimi-k2-turbo-preview`、`google/gemini-2.5-flash`、`anthropic/claude-sonnet-4-5-20250929` |
| **models（allowlist）** | ✅ | 格式為 record（物件），非 array；所有 key 皆為 `provider/id`，無未帶前綴的 id |

**agents.defaults.models 目前 key 清單：**  
kimi/kimi-k2.5、kimi/kimi-k2-turbo-preview、google/gemini-2.5-flash、google/gemini-2.5-pro、anthropic/claude-opus-4-6、anthropic/claude-opus-4-5-20251101、anthropic/claude-sonnet-4-5-20250929、anthropic/claude-haiku-4-5-20251001、ollama/qwen3:8b、ollama/deepseek-r1:8b、ollama/llama3.2:latest、ollama/qwen2.5:14b。

---

## 2. models.providers（openclaw.json）

| Provider | 狀態 | 說明 |
|----------|------|------|
| **kimi** | ✅ | 有定義，apiKey 在檔內（或可改為 env 變數） |
| **anthropic** | ✅ | 有定義，apiKey 使用 `${ANTHROPIC_API_KEY}`，由 `~/.openclaw/.env` 提供 |
| **ollama** | ✅ | 有定義，baseUrl 指向本地 |
| **google** | ✅ | 已在 openclaw.json 自訂（apiKey 寫在檔內），LaunchAgent 啟動時不需依賴 .env |

無「未帶前綴」的模型 id 放在 providers 的 key 層級；provider 內部的 `models[].id` 不帶前綴為正常（會自動加上 provider 前綴）。

---

## 3. agents/main/agent/models.json（agent 層）

- **已處理**：此檔已精簡為**僅保留 ollama**。kimi / google / anthropic 完全由 **openclaw.json**（與 `~/.openclaw/.env`）提供，避免：
  - 同一 provider 在兩處定義造成 merge 混亂
  - API key 重複或不同步（原先 agent 檔內有寫死的 key，已移除）
- **Ollama 模型**：qwen3:8b、deepseek-r1:8b、llama3.2:latest、qwen2.5:14b、mistral:latest。

---

## 4. 前綴規則整理

- **agents.defaults.model.primary / fallbacks**：一律使用 `provider/id`（例如 `anthropic/claude-sonnet-4-5-20250929`）。
- **agents.defaults.models（allowlist）**：每個 key 必須是 `provider/id`；不可使用未帶前綴的 id（如 `claude-opus-4-6`）。
- **models.providers.*.models[].id**：僅寫 id 即可（如 `claude-opus-4-6`），前綴由 provider 名稱決定。

---

## 5. 建議後續動作

1. **確認 `~/.openclaw/.env`** 有正確的 `ANTHROPIC_API_KEY`（以及若有使用 Google，則有對應的 Google API key）。
2. **若要單一來源**：可將 `agents/main/agent/models.json` 精簡為只保留 `ollama`，其餘依賴 openclaw.json + .env。
3. 修改設定後執行：`openclaw gateway restart`。

---

*此報告由檢查腳本／手動檢查產生，僅供對照用。*
