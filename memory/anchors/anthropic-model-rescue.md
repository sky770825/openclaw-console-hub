# 🆘 自救錨點：OpenClaw Anthropic 模型設定

> 當 Anthropic 模型出現問題時，立即查看此檔案

---

## ⚡ 30 秒快速診斷

### 問題現象 → 對應解法

| 錯誤訊息 | 立即檢查 | 完整教學 |
|---------|---------|---------|
| `404 Not Found` | API Key 是否有效、`baseUrl` 是否正確 | [步驟連結](#404-錯誤) |
| `"unknown model"` | 是否設定 `models.providers` | [步驟連結](#unknown-model-錯誤) |
| `"invalid config"` | 是否有 `"mode": "merge"` | [步驟連結](#invalid-config-錯誤) |
| 設定完仍用舊模型 | 是否開新 Session (`/new`) | [步驟連結](#設定無效) |
| API Key 衝突 | 是否有 `.bak*` 備份檔案 | [步驟連結](#api-key-衝突) |

---

## 🔥 最常用指令

```bash
# 1. 檢查模型狀態
openclaw models status

# 2. 重啟 Gateway
openclaw gateway restart

# 3. 刪除備份檔案（解決 Key 衝突）
rm ~/.openclaw/*.bak* ~/.openclaw/openclaw.json.bak*

# 4. 驗證 API Key
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  https://api.anthropic.com/v1/models
```

---

## 📝 關鍵設定片段

### 最小可行設定（複製即用）

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
            "contextWindow": 1000000,
            "maxTokens": 128000
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-6",
        "fallbacks": ["anthropic/claude-sonnet-4-5-20250929"]
      }
    }
  }
}
```

---

## 📂 相關檔案位置

| 檔案 | 路徑 | 用途 |
|------|------|------|
| **完整教學** | `docs/ANTHROPIC-MODEL-SETUP.md` | 詳細設定步驟與原理說明 |
| **資源索引** | `docs/ANTHROPIC-MODEL-RESOURCES.md` | 20+ 個多方除錯資源整理 |
| **主設定檔** | `~/.openclaw/openclaw.json` | OpenClaw 主要配置 |
| **API Key** | `~/.openclaw/config/anthropic.env` | Anthropic API Key 儲存 |
| **備份檔案** | `~/.openclaw/*.bak*` | 可能導致 Key 衝突的舊檔案 |
| **維修紀錄** | `memory/2026-02-12.md` | 本次 API Key 衝突修復過程 |

---

## 🎯 核心概念：兩層設定

```
Layer 1: models.providers    → 定義「有哪些模型可用」
Layer 2: agents.defaults     → 定義「預設用哪個模型」
           ↑
      兩層缺一不可！
```

**最常見錯誤**：只設定 Layer 2，忘記設定 Layer 1 的 `models.providers`

---

## 🔗 外部資源

### 官方資源
- [OpenClaw 官方文件](https://docs.openclaw.ai/providers/anthropic)
- [GitHub Issue #10301](https://github.com/openclaw/openclaw/issues/10301) - Opus 4.6 支援
- [GitHub Issue #10124](https://github.com/openclaw/openclaw/issues/10124) - alias 問題
- [GitHub Issue #9450](https://github.com/openclaw/openclaw/issues/9450) - Gateway 無回應

### 教學文章
- [jangwook.net 完整教學](https://jangwook.net/en/blog/en/openclaw-opus-4-6-setup-guide/)
- [velvetshark.com 成本優化](https://velvetshark.com/openclaw-multi-model-routing)
- [OpenRouter 整合](https://openrouter.ai/docs/guides/guides/openclaw-integration)

### 社群討論（Moltbook）
- James: Config 檔案層級問題（`openclaw.json` 覆蓋 `clawdbot.json`）
- AlienBot: auth-profiles.json 多 provider 管理
- MrNonce: Browser service 與 Snap Chromium 問題

### 更多資源
- **完整索引**：`docs/ANTHROPIC-MODEL-RESOURCES.md`（20+ 個來源）

---

## ⚠️ 重要提醒

1. **設定完必須開新 Session**：現有 Session 會保留舊設定，輸入 `/new` 開新 Session
2. **兩層設定缺一不可**：只設定 `agents.defaults` 會出現 "unknown model"
3. **必須加 `"mode": "merge"`**：否則會出現 "invalid config"
4. **檢查備份檔案**：舊的 `.bak*` 檔案可能導致 API Key 衝突

---

*建立時間：2026-02-12*  
*緊急程度：🆘 關鍵自救檔案*
