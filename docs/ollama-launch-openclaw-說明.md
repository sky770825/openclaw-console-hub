# ollama launch openclaw 說明

## 這個指令在做什麼

根據 [Ollama 文件](https://docs.ollama.com/integrations/openclaw)：

- **`ollama launch openclaw`** 會：
  1. 把 OpenClaw 設定成使用 Ollama 的模型
  2. 啟動 OpenClaw Gateway

- **`ollama launch openclaw --config`**：只寫入設定，不自動啟動 gateway。

所以這是 Ollama 提供的「一鍵接好 OpenClaw + Ollama」的整合指令。

---

## 你目前遇到的錯誤

在你這台機器上執行會出現：

```text
Error: operation not supported by device
```

通常表示 **`ollama launch` 在這個環境不被支援**，例如：

- 某些 **Ollama 版本** 或 **作業系統**（例如部分 macOS 安裝方式）不實作 `launch` 的整合
- 或該功能只在特定平台（例如部分 Linux）上提供

所以不是你把指令打錯，而是環境限制。

---

## 你已經等價完成設定了

你已經**手動**把 OpenClaw 接好 Ollama：

- `~/.openclaw/openclaw.json` 裡有 `models.providers.ollama`（含 mistral、qwen2.5:14b）
- `agents.defaults.models` 裡有 `ollama/mistral`、`ollama/qwen2.5:14b`
- auth 有 `ollama:local`（auth-profiles）

效果和「`ollama launch openclaw` 幫你寫的設定」是一樣的。

**你要做的只有兩件事：**

1. **啟動 Ollama**（有在跑就好）  
   - 開 Ollama app，或終端執行：`ollama serve`

2. **啟動 OpenClaw Gateway**  
   - 若用 LaunchAgent：  
     `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.gateway.plist`  
   - 或直接：`openclaw gateway`（前景執行）

不需要再執行 `ollama launch openclaw`，你已經是用 Ollama 的 OpenClaw 了。

---

## 總結

| 項目 | 說明 |
|------|------|
| `ollama launch openclaw` | 一鍵設定 OpenClaw 用 Ollama 並啟動 gateway |
| 你遇到的錯誤 | `operation not supported by device` → 目前環境不支援這條指令 |
| 你現在的做法 | 手動設定已完成，只要分別啟動 Ollama 和 OpenClaw Gateway 即可 |
