# OpenClaw 模型變更說明（2026-02）

## 目前設定

**已移除：** Google Gemini、Anthropic Claude 的 provider 與金鑰。  
**僅保留：** **Kimi** 與 **Ollama**。

- 預設模型：`kimi/kimi-k2.5`
- Fallbacks：Kimi Turbo、Ollama（qwen3:8b、deepseek-r1:8b、llama3.2:latest、qwen2.5:14b）

## 相關歷史文件（僅供參考）

以下文件仍提到 Gemini 或 Claude，屬歷史排查／設定紀錄，目前模型已不再使用這兩家：

- `CLAUDE-MODEL-SETUP.md` — Claude 模型設定（已停用）
- `Gemini-2.5-Pro-重複回覆後無反應-排查.md` — Gemini 問題紀錄（已停用）
- `Gemini未知錯誤與英文回覆-說明.md`
- `ollama與Claude-說明.md`
- 其他 docs 中提及 Gemini/Claude 的段落

若要改回使用 Gemini 或 Claude，需重新在 `~/.openclaw/openclaw.json` 與 agent `models.json` 加入對應 provider 與金鑰。
