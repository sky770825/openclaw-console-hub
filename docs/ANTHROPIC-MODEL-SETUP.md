# OpenClaw Anthropic 模型完整設定教學

> 解決 404 / "unknown model" / "invalid config" 等常見錯誤

---

## 🚨 為什麼需要這份教學？

OpenClaw 設定 Anthropic 模型時，許多人會遇到以下錯誤：
- ❌ `404 Not Found`
- ❌ `"unknown model"`
- ❌ `"invalid config"`
- ❌ 設定完後仍然使用舊模型

**根本問題**：OpenClaw 採用「兩層設定架構」，很多人只設定其中一層，或缺少關鍵參數 `"mode": "merge"`。

---

## 🎯 兩層設定架構（核心概念）

OpenClaw 的模型設定分為兩個獨立層級：

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: models.providers                              │
│  定義「如何連線」和「有哪些模型可用」                      │
│  ─────────────────────────────────                     │
│  - baseUrl: API 端點                                     │
│  - api: 協議類型 (anthropic-messages)                   │
│  - models: 可用模型列表                                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: agents.defaults.models                        │
│  定義「預設使用哪個模型」                                 │
│  ─────────────────────────────────                     │
│  - primary: 主要模型                                     │
│  - fallbacks: 備援模型列表                                │
└─────────────────────────────────────────────────────────┘
```

**兩層缺一不可！** 只設定 Layer 2 會出現 "unknown model"，只設定 Layer 1 會使用預設模型而非你想要的模型。

---

## 📝 完整設定步驟

### 步驟 1：準備 API Key

將 Anthropic API Key 存入環境變數檔案（不要直接寫在 config）：

```bash
# 建立 config 目錄
mkdir -p ~/.openclaw/config

# 寫入 API Key
echo "ANTHROPIC_API_KEY=sk-ant-xxxxx" > ~/.openclaw/config/anthropic.env
```

### 步驟 2：編輯 openclaw.json

開啟 `~/.openclaw/openclaw.json`，**同時加入以下兩個區塊**：

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "api": "anthropic-messages",
        "env": "~/.openclaw/config/anthropic.env",
        "models": [
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6",
            "reasoning": true,
            "input": ["text", "image"],
            "contextWindow": 1000000,
            "maxTokens": 128000
          },
          {
            "id": "claude-sonnet-4-5-20250929",
            "name": "Claude Sonnet 4.5",
            "reasoning": true,
            "input": ["text", "image"],
            "contextWindow": 200000,
            "maxTokens": 64000
          },
          {
            "id": "claude-haiku-4-5-20251001",
            "name": "Claude Haiku 4.5",
            "reasoning": false,
            "input": ["text", "image"],
            "contextWindow": 200000,
            "maxTokens": 64000
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-6",
        "fallbacks": [
          "anthropic/claude-sonnet-4-5-20250929",
          "kimi/kimi-k2.5"
        ]
      },
      "contextTokens": 1000000
    }
  }
}
```

### 關鍵參數說明

| 參數 | 位置 | 說明 |
|------|------|------|
| `mode: "merge"` | models | **最重要！** 讓自訂模型合併到內建目錄，而非取代 |
| `baseUrl` | providers | API 端點，Anthropic 固定為 `https://api.anthropic.com` |
| `api` | providers | 協議類型，Anthropic 使用 `anthropic-messages` |
| `env` | providers | 環境變數檔案路徑 |
| `id` | models | 模型 ID，**必須與 Anthropic 官方一致** |
| `contextWindow` | models | 上下文窗口大小（tokens）|
| `maxTokens` | models | 最大輸出長度（tokens）|
| `primary` | agents | 預設使用的主要模型 |
| `fallbacks` | agents | 當主要模型不可用時的備援列表 |

### 步驟 3：重啟 Gateway

```bash
openclaw gateway restart
```

### 步驟 4：開啟新 Session

**重要！** 現有 Session 會保留舊的模型設定，必須開新 Session：

```
/new
```

或在聊天中輸入 `/reset`。

### 步驟 5：驗證設定

```bash
# 指令列驗證
openclaw models status
```

或在聊天中輸入：
```
/model status
```

確認顯示 `anthropic/claude-opus-4-6` 為主要模型。

---

## 🐛 常見錯誤與解法

### 錯誤 1："invalid config"

**原因**：缺少 `"mode": "merge"` 參數

**解法**：
```json
"models": {
  "mode": "merge",  // ← 加入這一行！
  "providers": { ... }
}
```

### 錯誤 2："unknown model"

**原因**：
1. `models.providers` 沒有定義該模型
2. 模型 ID 拼錯或與官方不一致

**解法**：
- 確認 Layer 1 (`models.providers`) 有正確定義模型
- 檢查模型 ID 是否與 Anthropic 官方一致（如 `claude-opus-4-6`）

### 錯誤 3："404 Not Found"

**原因**：
1. API Key 無效或過期
2. `baseUrl` 設定錯誤
3. 使用了 OpenAI SDK 呼叫 Anthropic API（會自動加 `/chat/completions` 導致 404）

**解法**：
- 檢查 API Key 有效性：`curl -H "Authorization: Bearer $KEY" https://api.anthropic.com/v1/models`
- 確認 `baseUrl` 為 `https://api.anthropic.com`（不要加 `/v1`）
- 若用 Python，請使用官方 `anthropic` 套件而非 OpenAI SDK

### 錯誤 4：設定完仍使用舊模型

**原因**：
1. 沒有開新 Session（`/new`）
2. Config 檔案層級問題

**解法**：
- 確保執行 `/new` 開新 Session
- 檢查是否有兩個 config 檔案：`~/.openclaw/openclaw.json` 會覆蓋 `~/.clawdbot/clawdbot.json`

### 錯誤 5：API Key 衝突（修改後仍使用舊 Key）

**原因**：OpenClaw 讀取到備份檔案中的舊 Key

**解法**：
```bash
# 刪除所有備份檔案
rm ~/.openclaw/*.bak*
rm ~/.openclaw/openclaw.json.bak*

# 驗證清除乾淨
grep -r "舊的_KEY片段" ~/.openclaw
```

---

## 🔄 模型切換指令

### 暫時切換模型（當前 Session）

```javascript
session_status({ model: "anthropic/claude-opus-4-6" })
```

### 切換回預設模型

```javascript
session_status({ model: "default" })
```

### 查看當前模型狀態

```javascript
session_status()
```

---

## 💡 成本優化建議

| 任務類型 | 建議模型 | 成本 |
|---------|---------|------|
| Heartbeat / 簡單查詢 | Gemini 2.5 Flash-Lite | ~$0.50/M tokens |
| 日常 Coding | Kimi K2.5 / Claude Sonnet 4.5 | ~$2-3/M tokens |
| 複雜架構設計 | Claude Opus 4.6 | ~$30/M tokens |

**設定多層 Fallback 節省成本**：
```json
"fallbacks": [
  "anthropic/claude-sonnet-4-5-20250929",
  "kimi/kimi-k2.5",
  "google/gemini-2.5-flash"
]
```

---

## 📚 參考資源

- [OpenClaw Docs - Models](https://docs.openclaw.ai/concepts/models)
- [OpenClaw Docs - Model Providers](https://docs.openclaw.ai/concepts/model-providers)
- [GitHub Issue #10301 - Add support for Claude Opus 4.6](https://github.com/openclaw/openclaw/issues/10301)
- [jangwook.net - OpenClaw Opus 4.6 Setup Guide](https://jangwook.net/en/blog/en/openclaw-opus-4-6-setup-guide/)
- [velvetshark.com - Multi-model Routing Guide](https://velvetshark.com/openclaw-multi-model-routing)

---

## ✅ 快速檢查清單

設定 Anthropic 模型前，確認：

- [ ] API Key 已存入 `~/.openclaw/config/anthropic.env`
- [ ] `models` 區塊有 `"mode": "merge"`
- [ ] `models.providers.anthropic` 有定義想要的模型
- [ ] `agents.defaults.models.primary` 指向正確的模型 ID
- [ ] 已執行 `openclaw gateway restart`
- [ ] 已開新 Session（`/new`）
- [ ] 已驗證 `openclaw models status` 顯示正確模型

---

*最後更新：2026-02-12*
