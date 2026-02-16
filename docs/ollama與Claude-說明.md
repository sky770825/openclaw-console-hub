# Ollama 與 Claude 說明

## 1. Ollama 裡沒有「Claude」模型

- **Ollama** 只能跑**開源、可下載**的模型（如 Mistral、Qwen、Llama），不能跑 Anthropic 的 **Claude**。
- 在終端執行 `ollama run claude` 會失敗（庫裡沒有名為 claude 的模型）。

所以**沒辦法**用「ollama launch claude」這種方式在本機跑真正的 Claude。

---

## 2. 若你想用「Claude Code」CLI + 本機 Ollama

[Claude Code](https://docs.ollama.com/integrations/claude-code) 是另一套指令列工具，可以**改用 Ollama 的模型當後端**（不用 Anthropic API）：

```bash
# 設定環境變數，讓 Claude Code 連到本機 Ollama
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_API_KEY=ollama

# 用你本機已有的 Ollama 模型來跑（例如 qwen2.5:14b）
claude --model qwen2.5:14b
```

這樣是「用 Claude Code 這支程式，但背後是 Ollama 的模型」，不是真正的 Claude。

---

## 3. 若你想在 OpenClaw bot 裡用「Claude」

你已經有接 **Antigravity 的 Claude**：

- 模型 ID：`google-antigravity/claude-opus-4-5-thinking`
- 在 OpenClaw 裡把預設改成這個，bot 就會用 Claude（走雲端 Antigravity，需要 OAuth 登入過）。

本機 Ollama **無法**提供這顆 Claude，只能選：
- **本機**：Ollama 的模型（如 `ollama/mistral`、`ollama/qwen2.5:14b`）
- **雲端 Claude**：`google-antigravity/claude-opus-4-5-thinking`

---

**總結**：沒有「ollama launch claude」這種用法；要用 Claude 就選 Antigravity 那顆；要用本機就選 Ollama 的模型（mistral、qwen2.5:14b 等）。
