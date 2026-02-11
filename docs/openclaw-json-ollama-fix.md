# 修復 openclaw.json 的 Ollama「Invalid input」錯誤

錯誤訊息：
```
Config invalid
File: ~/.openclaw/openclaw.json
Problem:
  - models.providers.ollama.api: Invalid input
  - models.providers.ollama.models.0.api: Invalid input
  ...
```

## 原因

`api` 欄位**不能**填 URL 或 `"ollama"`。  
Schema 只接受以下其中一個字串：

- `openai-completions`
- `openai-responses`
- `anthropic-messages`
- `google-generative-ai`
- `github-copilot`
- `bedrock-converse-stream`

Ollama 在 OpenClaw 裡是當成 **openai-completions** 相容，所以要用 `"openai-completions"`。  
**網址要填在 `baseUrl`，不要填在 `api`。**

## 正確寫法

在 `~/.openclaw/openclaw.json` 的 `models.providers.ollama`：

1. **baseUrl**：Ollama 的 API 網址（必填）
   - 例：`"http://127.0.0.1:11434/v1"` 或 `"http://localhost:11434/v1"`
2. **api**：填 `"openai-completions"`，或**直接刪掉**（選填，省略時行為會依預設）
3. **models**：每個 model 的 **api** 也改成 `"openai-completions"` 或**刪掉**

### 範例（精簡）

```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1",
        "api": "openai-completions",
        "apiKey": "OLLAMA_API_KEY",
        "models": [
          {
            "id": "llama3.2:latest",
            "name": "llama3.2:latest",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

### 若你現在是錯的寫法

- 錯誤：`"api": "http://127.0.0.1:11434"` 或 `"api": "ollama"`
- 正確：  
  - 把 URL 移到 **baseUrl**  
  - **api** 改為 `"openai-completions"` 或刪除

每個 `models.providers.ollama.models[].api` 也一樣：改為 `"openai-completions"` 或刪除該欄位。

## 環境變數（選用）

Ollama 要出現在 OpenClaw 裡，需設定其一：

- `OLLAMA_API_KEY`（例如設成任意非空字串如 `ollama`），或  
- 在 OpenClaw 的 auth profiles 裡設定 ollama

存檔後再執行 OpenClaw，Config invalid 就會消失。
