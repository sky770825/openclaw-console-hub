# Claude 模型設定（對應你看到的模型名稱）

> **說明：** 目前 OpenClaw 已移除 Claude／Gemini，僅使用 Kimi + Ollama。此文件保留供日後若重新啟用時參考。見 [OPENCLAW-模型變更-僅Kimi與Ollama.md](./OPENCLAW-模型變更-僅Kimi與Ollama.md)。

**OpenClaw 模型前綴對照（別寫錯）：**
- **anthropic/** → 只給 **Claude**（例：`anthropic/claude-sonnet-4-5-20250929`）
- **google/** → 給 **Gemini**（例：`google/gemini-2.5-flash`）— 不要寫成 `anthropic/gemini-2.5-flash`
- **kimi/** → Kimi（例：`kimi/kimi-k2.5`）
- **ollama/** → 本機 Ollama（例：`ollama/qwen3:8b`）

**注意：** 若 OpenClaw 把帶前綴的 id 整串送給 Anthropic API，會報錯（API 只認 `claude-sonnet-4-5-20250929` 這種 id）。此時在 `agents.defaults.model` 的 primary/fallbacks 裡，**Claude 模型請改填不帶前綴的 id**：`claude-sonnet-4-5-20250929`、`claude-opus-4-6` 等。

你在 Anthropic 後台看到的模型名稱，對應到 OpenClaw 裡要填的 **API 模型 ID** 如下。

## 你看到的名稱 → OpenClaw 用的 model ID

| 你在後台看到的名稱 | OpenClaw 設定值（anthropic/xxx） |
|-------------------|-----------------------------------|
| Claude Opus Active | `anthropic/claude-opus-4-6` 或最新 Opus |
| Claude Sonnet Active | `anthropic/claude-sonnet-4-5` 或最新 Sonnet |
| Claude Sonnet 3.7 | `anthropic/claude-3-7-sonnet-*`（見下方說明） |
| Claude Haiku Active | `anthropic/claude-3-5-haiku` 或最新 Haiku |
| Claude Haiku 3.5 | `anthropic/claude-3-5-haiku` |
| Claude Haiku 3 | `anthropic/claude-3-haiku` |

實際可用的 ID 以你帳號回傳為準，建議用下面「查詢目前可用模型」確認。

---

## 1. 查詢你帳號目前可用的模型 ID

在終端機執行（會列出你的 API key 能用的所有模型）：

```bash
curl -s https://api.anthropic.com/v1/models \
  -H "anthropic-version: 2023-06-01" \
  -H "x-api-key:REDACTED" | jq '.data[].id'
```

若沒有 `jq`，可改成：

```bash
curl -s https://api.anthropic.com/v1/models \
  -H "anthropic-version: 2023-06-01" \
  -H "x-api-key:REDACTED"
```

先設定環境變數再執行（或把 `$ANTHROPIC_API_KEY` 換成你的 key）：

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

列出來的 `id`（例如 `claude-3-5-sonnet-20241022`）就是你要在 OpenClaw 裡用的「模型 ID」。

---

## 2. 在 OpenClaw 裡設定使用的模型

設定檔位置：**`~/.openclaw/openclaw.json`**

### 只改預設模型（建議先這樣試）

在 `agents.defaults.model` 裡指定 `primary` 為 `anthropic/<模型ID>`：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-3-5-sonnet-20241022",
        // 可選：備援模型，當 primary 失敗時依序嘗試
        fallbacks: [
          "anthropic/claude-3-haiku-20240307",
        ],
      },
    },
  },
}
```

若你目前 config 已有別的内容，只要**保留原有欄位**，加上或修改 `agents.defaults.model` 這段即可。

### 常見可用的 ID 範例（依你後台有開的為準）

- **Claude Sonnet 3.7**：`anthropic/claude-3-7-sonnet-*`（* 以 API 回傳的 id 為準，例如 `claude-3-7-sonnet-20250219`）
- **Claude Haiku 3.5**：`anthropic/claude-3-5-haiku-20241022`
- **Claude Haiku 3**：`anthropic/claude-3-haiku-20240307`
- **Claude Opus 4.6（Opus Active）**：`anthropic/claude-opus-4-6`

---

## 3. 確認 OpenClaw 有讀到 Anthropic API Key

- 若用 **API Key**：確保執行 gateway 的環境有 `ANTHROPIC_API_KEY`（例如在 `~/.openclaw/.env` 或 shell 的 `export`）。
- 若用 **setup-token（訂閱）**：用 `openclaw models auth paste-token --provider anthropic` 貼上 token。

檢查認證與模型：

```bash
openclaw models status
openclaw models list
```

---

## 4. 重啟 Gateway

改完 `~/.openclaw/openclaw.json` 後記得重啟 openclaw gateway，新模型才會生效。

---

**總結**：你後台有「Claude Opus Active / Sonnet 3.7 / Haiku 3.5 …」代表帳號有權限，只要在 `~/.openclaw/openclaw.json` 的 `agents.defaults.model.primary` 設成對應的 `anthropic/<id>`，並確保 `ANTHROPIC_API_KEY` 或 setup-token 正確，就可以使用該模型。
