# OpenClaw API Key 與模型切換：寫在哪、從哪讀

## 一、API Key 寫在哪裡／從哪裡讀

OpenClaw 會從以下來源解析各 provider 的 API key（優先順序依實作，通常 **config 內 key > 環境變數 > auth-profiles**）：

| 來源 | 路徑／說明 |
|------|-------------|
| **1. 環境變數** | `process.env`：`GEMINI_API_KEY`（Google）、`ANTHROPIC_API_KEY`（Claude）、`KIMI_API_KEY`（Kimi）、`OPENAI_API_KEY` 等。你寫在 **`~/.openclaw/.env`** 的內容，要變成環境變數才會被讀到（見下方「.env 何時生效」）。 |
| **2. 主設定裡的 apiKey** | **`~/.openclaw/openclaw.json`** → `models.providers.<provider>.apiKey`。若這裡有填，會直接使用，不需依賴 .env。 |
| **3. Agent 的 auth 與 models** | **`~/.openclaw/agents/main/agent/auth-profiles.json`**：存 OAuth token、或某 provider 的 api_key profile。<br>**`~/.openclaw/agents/main/agent/models.json`**：每個 provider 底下也可有 `apiKey`，會與主設定 merge。 |

也就是說：  
- **「把 key 寫在 .env」** = 寫在 `~/.openclaw/.env`；OpenClaw 程式本身**不會**自動載入這個檔案，只有當 **process.env 裡已經有對應變數**（例如你手動 `export` 或由其他程式載入 .env）時才會用到。  
- **「給 OpenClaw 的 API key 寫在哪一個資料檔案」** = 若要以「檔案」形式給 OpenClaw 讀，就是：  
  - **`~/.openclaw/openclaw.json`**（`models.providers.<provider>.apiKey`），或  
  - **`~/.openclaw/agents/main/agent/models.json`**（各 provider 的 `apiKey`），或  
  - **`~/.openclaw/agents/main/agent/auth-profiles.json`**（以 profile 形式存的 key）。

---

## 二、.env 何時會生效

- **終端機手動跑**：若你先執行 `source ~/.openclaw/.env` 或 `set -a && source ~/.openclaw/.env && set +a`，再跑 `openclaw gateway`，則 `GEMINI_API_KEY`、`ANTHROPIC_API_KEY` 等會進到 `process.env`，OpenClaw 會讀到。
- **LaunchAgent（開機／背景跑）**：LaunchAgent 預設**不會**幫你載入 `~/.openclaw/.env`，所以 `process.env` 裡通常沒有這些變數。若希望 **gateway 在背景跑時也用 .env 的 key**，可以：
  - 在 **`~/.openclaw/openclaw.json`** 的 `models.providers.google.apiKey` / `anthropic.apiKey` 直接填同一把 key（與 .env 重複一份），或
  - 修改 LaunchAgent 的 plist，在 `EnvironmentVariables` 裡加入 `GEMINI_API_KEY`、`ANTHROPIC_API_KEY`（不建議把 key 寫在 plist 裡，除非你限制檔案權限）。

結論：**key 寫在 .env = 你希望用「環境變數」方式提供；實際要讓 OpenClaw 讀到，要嘛讓 process.env 有該變數（例如手動 source .env 再跑），要嘛在 openclaw.json / models.json 裡再填一份。**

---

## 三、OpenClaw 自己「切換模型」時會動到哪裡

當 OpenClaw（或你透過指令／介面）切換「目前要用的模型」時，改的是**執行時使用的 model 代號**（例如 `google/gemini-2.5-flash`、`kimi/kimi-k2.5`），不會去改 API key。  
API key 的讀取來源就是上面第一節那幾個檔案／環境變數；**切換模型不會寫入或修改** `openclaw.json`、`models.json`、`auth-profiles.json` 裡的金鑰欄位。

- **會變動的**（依 OpenClaw 實作）：可能是 **session 或 runtime 狀態**（例如目前 session 要用哪個 model），這類狀態可能寫在：
  - 與 session 對應的檔案（例如 `~/.openclaw/agents/main/sessions/` 底下的 session 檔），或
  - 記憶體／暫存狀態，而不是「設定檔裡的 apiKey」。
- **不會變動的**：  
  - `~/.openclaw/openclaw.json` 裡的 `models.providers.*.apiKey`  
  - `~/.openclaw/agents/main/agent/models.json` 裡的 `apiKey`  
  - `~/.openclaw/agents/main/agent/auth-profiles.json` 裡的 key  
  除非你手動改或跑 `openclaw configure` / `openclaw models auth` 等指令寫入，否則單純「切換模型」不會改這些。

---

## 四、你現在的做法（key 寫在 .env）

- 已把 **Gemini API Key** 寫入 **`~/.openclaw/.env`**（`GEMINI_API_KEY`、`GOOGLE_API_KEY`）。
- 若你**從終端機**先 `source ~/.openclaw/.env` 再執行 `openclaw gateway`，OpenClaw 會從 `process.env` 讀到並使用。
- 若你多半是**用 LaunchAgent 在背景跑 gateway**，建議再在 **`~/.openclaw/openclaw.json`** 的 `models.providers.google.apiKey` 填上同一把 key，這樣背景跑時也會用到，不需改 plist。

（若你願意，我可以幫你寫好要貼進 `openclaw.json` 的 `apiKey` 那一行，你只要貼上 key 即可。）
