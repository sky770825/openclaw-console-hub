# OpenClaw 模型清單參考

在 OpenClaw 裡選模型或填 `agents.defaults.model.primary` / `fallbacks` 時，可用下面 ID（依 provider 分）。

**Claude 官方型號總覽**：[Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)

---

## Anthropic (Claude)

依 [Claude 官方文件](https://platform.claude.com/docs/en/about-claude/models/overview) 的 **Claude API ID**：

| OpenClaw 設定值 | Claude API ID | 說明 |
|-----------------|---------------|------|
| `anthropic/claude-opus-4-6` | `claude-opus-4-6` | 最新、最強，編程與推理推薦 |
| `anthropic/claude-sonnet-4-5-20250929` | `claude-sonnet-4-5-20250929`（別名 `claude-sonnet-4-5`） | 速度與智能平衡 |
| `anthropic/claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001`（別名 `claude-haiku-4-5`） | 最快、近前沿智能 |

舊版仍可用（Legacy）：`claude-opus-4-5-20251101`、`claude-opus-4-1-20250805`、`claude-sonnet-4-20250514`、`claude-3-7-sonnet-20250219`、`claude-opus-4-20250514`、`claude-3-haiku-20240307` 等，見官方表格。

若 API 報錯「不認 anthropic/ 前綴」，在 primary/fallbacks 改填**不帶前綴**的 id：  
`claude-opus-4-6`、`claude-sonnet-4-5-20250929`、`claude-haiku-4-5-20251001`、`claude-opus-4-5-20251101`。

---

## Google (Gemini)

依 [Gemini API 模型文件](https://ai.google.dev/gemini-api/docs/models)：

| OpenClaw 設定值 | 說明 |
|-----------------|------|
| `google/gemini-3-pro-preview` | Gemini 3 Pro（最強、multimodal、thinking） |
| `google/gemini-3-flash-preview` | Gemini 3 Flash（速度與智能平衡） |
| `google/gemini-2.5-flash` | Gemini 2.5 Flash（穩定版） |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro（thinking、長上下文） |

若出現 **404**：請確認 (1) 用的是上述完整 ID（如 `gemini-3-pro-preview` 不要漏掉 `-preview`），(2) `agents.defaults.models` 裡有加入該 model 的 allowlist（例如 `"google/gemini-3-pro-preview": {}`）。

---

## Moonshot (Kimi)

| OpenClaw 設定值 |
|-----------------|
| `moonshot/kimi-k2.5` |
| `moonshot/kimi-k2` |

（部分環境也用 `kimi/kimi-k2.5`，依你 `openclaw models list` 顯示為準。）

---

## 快速指令

```bash
# 設成預設模型（選一個）
openclaw config set agents.defaults.model.primary "moonshot/kimi-k2.5"
openclaw config set agents.defaults.model.primary "anthropic/claude-sonnet-4-5-20250929"
openclaw config set agents.defaults.model.primary "google/gemini-2.5-flash"

# 看目前狀態
openclaw models status
openclaw models list
```
