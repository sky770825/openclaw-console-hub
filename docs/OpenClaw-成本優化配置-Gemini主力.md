# OpenClaw 成本優化配置（Gemini 主力）

## 目前結構

| 層級   | 模型               | 用途                 |
|--------|--------------------|----------------------|
| 主力   | **Gemini 2.5 Flash** | 日常對話、工具、Heartbeat |
| 備援 1 | Claude Haiku 4.5  | 需要 Anthropic 時    |
| 備援 2 | Kimi K2.5         | 中文、長文本          |
| 備援 3+ | Kimi Turbo、Ollama | 本地備援             |

## 必做：填入 API Key

目前 **Google（Gemini）** 與 **Anthropic（Claude）** 的 `apiKey` 是空的，需要手動填入其一即可開始用主力／備援：

### 方式一：直接改 openclaw.json（建議）

1. 開啟 `~/.openclaw/openclaw.json`
2. 找到 `models.providers.google`，把 `"apiKey": "REDACTED"` 改成你的 Gemini API Key，例如：
   - `"apiKey": "REDACTED"`
3. 找到 `models.providers.anthropic`，把 `"apiKey": "REDACTED"` 改成你的 Anthropic API Key，例如：
   - `"apiKey": "REDACTED"`

### 方式二：用環境變數（若 OpenClaw 支援從 env 讀取）

在 `~/.openclaw/.env` 取消註解並填入：

```bash
GEMINI_API_KEY=你的Gemini_API_Key
ANTHROPIC_API_KEY=你的Anthropic_API_Key
```

然後重啟：`openclaw gateway restart`

## 驗證

```bash
openclaw models status
openclaw gateway restart
```

若 `openclaw models status` 的 Auth overview 裡 **google**、**anthropic** 有顯示 key（或 effective=env），即表示已生效。

## 快速切換模型（在對話中）

| 情境       | 指令 / 作法 |
|------------|-------------|
| 日常（預設） | 自動使用 Gemini 2.5 Flash |
| 要更好推理 | 切換到 `anthropic/claude-sonnet-4-5-20250929` |
| 中文任務   | 切換到 `kimi/kimi-k2.5` |
| 本機       | 切換到 `ollama/qwen3:8b` 等 |

（實際切換指令依 OpenClaw 文件，例如 `/model kimi/kimi-k2.5` 或介面選擇。）

## 注意

- 先前使用 **Gemini 2.5 Pro** 時曾出現重複回覆、無反應與 TLS 錯誤；目前主力為 **Gemini 2.5 Flash**，若再異常可先改回 `primary: kimi/kimi-k2.5` 或移除 google provider。
- 設定檔已用 **通過驗證的格式**（`openai-completions` + Gemini OpenAI 相容 endpoint），未使用已不支援的 `api: "google-generative"` 與 `env` 鍵。
