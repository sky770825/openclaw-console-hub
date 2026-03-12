# 10 - 換 API 金鑰

> 一鍵更換所有模型的 API Key，自動測試 + 自動替換三個設定檔

---

## metadata

```yaml
id: instruction-10
category: 設定與工具
tags: [API, 金鑰, key, 更換, 設定, kimi, gemini, anthropic, xai]
version: 1.0
created: 2026-02-16
related: [09-模型切換]
trigger: API key 過期、要換 key、認證錯誤
```

---

## 腳本位置

```
~/.openclaw/scripts/switch-key.sh
~/.openclaw/workspace/scripts/switch-key.sh
```

## 用法

### 查看目前所有 Key

```bash
~/.openclaw/scripts/switch-key.sh show
```

### 換單一 Provider

```bash
# Google Gemini
~/.openclaw/scripts/switch-key.sh google AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Kimi / Moonshot
~/.openclaw/scripts/switch-key.sh kimi sk-XXXXXXXXXXXXXX

# Anthropic Claude
~/.openclaw/scripts/switch-key.sh anthropic sk-ant-api03-XXXXXXXXXX

# xAI Grok
~/.openclaw/scripts/switch-key.sh xai xai-XXXXXXXXXXXXXX

# OpenRouter
~/.openclaw/scripts/switch-key.sh openrouter sk-or-v1-XXXXXXXXXXXXXX
```

### 全部一次問（互動模式）

```bash
~/.openclaw/scripts/switch-key.sh all
```

## 腳本會做什麼

1. 先 **curl 測試** 新 Key 是否有效（HTTP 200）
2. 無效就擋住，不會換
3. 有效 → 自動替換以下三個檔案：
   - `~/.openclaw/openclaw.json`（Gateway 主設定）
   - `~/.openclaw/agents/main/agent/models.json`（Agent 模型設定）
   - `~/.openclaw/config/google.env`（或對應的 .env）
4. **不用重啟 Gateway**，自動 hot reload

## 注意事項

- Google Key 以 `AIza` 開頭
- Kimi Key 以 `sk-` 開頭
- Anthropic Key 以 `sk-ant-` 開頭
- xAI Key 以 `xai-` 開頭
- OpenRouter Key 以 `sk-or-v1-` 開頭
