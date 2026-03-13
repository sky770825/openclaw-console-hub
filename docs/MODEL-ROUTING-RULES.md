# 模型路由規則 v2.3 - 定版

> **版本**: v2.3 定版
> **定版日期**: 2026-02-16
> **變更摘要**: 模型大換血 — Gemini 3 上線、Kimi 改收費、API Key 全換、Fallback 重排
> **上一版本**: v2.2 (2026-02-15)
> **適用範圍**: 所有任務分派

---

## 當前模型配置（2026-02-16）

### API Key 與 Provider

| Provider | Base URL | API 類型 | 計費方式 |
|----------|----------|----------|----------|
| **Google** | `generativelanguage.googleapis.com/v1beta` | google-generative-ai | Paid Tier 1（次數制） |
| **Kimi** | `api.moonshot.ai/v1` | openai-completions | Token 計費（已非免費） |
| **Anthropic** | `api.anthropic.com` | anthropic-messages | Token 計費 |
| **xAI** | `api.x.ai/v1` | openai-completions | Token 計費 |
| **Ollama** | `localhost:11434/v1` | openai-completions | $0 本地 |

### 可用模型清單

| 模型 ID | 顯示名稱 | 推理 | Context | 計費 | RPD/成本 |
|---------|----------|------|---------|------|----------|
| `gemini-3-flash-preview` | **Gemini 3 Flash** | ❌ | 1M | 次數制 | 數千次/天 |
| `gemini-3-pro-preview` | **Gemini 3 Pro** | ✅ | 1M | 次數制 | 250次/天 |
| `gemini-2.5-flash` | Gemini 2.5 Flash | ❌ | 1M | 次數制 | 備用 |
| `gemini-2.5-pro` | Gemini 2.5 Pro | ✅ | 1M | 次數制 | 備用 |
| `kimi-k2.5` | Kimi K2.5 | ❌ | 131K | Token | ⚠️ 已收費 |
| `kimi-k2-turbo-preview` | Kimi K2 Turbo | ❌ | 262K | Token | ⚠️ 已收費 |
| `claude-opus-4-6` | Claude Opus 4.6 | ✅ | 1M | Token | 最貴，備用 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | ✅ | 200K | Token | 中高 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | ❌ | 200K | Token | 便宜 |
| `grok-4-1-fast` | Grok 4.1 Fast | ❌ | 2M | Token | 便宜 |
| `grok-4-1-fast-reasoning` | Grok 4.1 Reasoning | ✅ | 2M | Token | 便宜 |
| `qwen3:8b` | Qwen3 8B | ❌ | 32K | $0 | 本地 |
| `deepseek-r1:8b` | DeepSeek R1 8B | ✅ | 32K | $0 | 本地 |
| `qwen2.5:14b` | Qwen2.5 14B | ❌ | 128K | $0 | 本地 |

---

## 達爾（Gateway）Fallback 鏈

```
主力: google/gemini-3-flash-preview
  ↓ 失敗
Fallback 1: kimi/kimi-k2.5
  ↓ 失敗
Fallback 2: google/gemini-3-pro-preview
  ↓ 失敗
Fallback 3: xai/grok-4-1-fast-reasoning
  ↓ 失敗
Fallback 4: anthropic/claude-haiku-4-5-20251001
```

---

## 快速決策表

| 任務類型 | 第一優先 | 備援順序 | 說明 |
|---------|---------|---------|------|
| **日常對話** | Gemini 3 Flash | Kimi → Grok | 次數制，隨便用 |
| **深度推理** | Gemini 3 Pro | Grok Reasoning → Sonnet | 250次/天，省著用 |
| **監控報告** | Gemini 3 Flash | Ollama | 快速免費 |
| **前端/UI** | Cursor (L4) | - | 訂閱制 |
| **後端/系統** | Claude Code (L2) | Cursor | Max 5x 訂閱 |
| **複雜決策** | Gemini 3 Pro | Claude → Grok | P0/P1 才升級 |

---

## 四層 Agent 架構

```
┌─────────────────────────────────────────────────────────┐
│  L1 🐣  達爾（Gateway）                                  │
│     模型：Gemini 3 Flash（主力）                          │
│     用途：日常對話、派工、Telegram 應答                     │
│     成本：次數制，數千次/天，不用擔心 token                 │
├─────────────────────────────────────────────────────────┤
│  L2 💻  Claude Code                                     │
│     模型：Claude Opus 4.6                                │
│     用途：程式開發、架構設計、複雜任務                      │
│     成本：Max 5x 訂閱（$100/月），不算 token              │
├─────────────────────────────────────────────────────────┤
│  L3 💎  備用大腦                                         │
│     模型：Gemini 3 Pro / Kimi K2.5 / Grok               │
│     用途：Fallback、第二意見、推理任務                     │
│     成本：Pro 次數制(250/天) / Kimi+Grok Token 計費       │
├─────────────────────────────────────────────────────────┤
│  L4 🎨  Cursor                                          │
│     模型：Claude（IDE 內建）                              │
│     用途：IDE 寫程式、重構、前端開發                       │
│     成本：訂閱制                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 次數制 vs Token 制 重要提醒

### 次數制模型（Gemini 全系列）
- **一次 API call = 一次**，不管塞多少 token
- **最佳策略：一次講完、一次做完**，避免來回浪費次數
- Flash 一天幾千次，不用省
- Pro 一天 250 次，要省

### Token 制模型（Kimi / Grok / Claude API）
- 每個 token 都算錢
- Kimi 已非免費，注意用量
- Claude API 最貴（Opus: $15/M input, $75/M output）
- Grok 便宜（$0.2/M input, $0.5/M output）

### 訂閱制（Claude Max 5x / Cursor）
- 固定月費，不算 token 也不算次數
- Claude Max 5x = 只有 Claude Code CLI 能用，API 不算
- Cursor = IDE 內用，不限量

---

## 成本保護機制

| 模型 | 限制 | 備援 |
|------|------|------|
| Gemini 3 Flash | 幾千次/天 | 用完轉 Kimi |
| Gemini 3 Pro | 250次/天 | 用完轉 Grok |
| Kimi | Token 收費，注意用量 | 轉 Grok/Haiku |
| Grok | Token 收費，便宜 | 轉 Haiku |
| Opus API | **完全禁用** | 除非主人明確批准 |

---

## 設定檔位置

| 檔案 | 用途 | 誰管 |
|------|------|------|
| `~/.openclaw/openclaw.json` | **主設定檔**（模型、API Key、Fallback） | 主人/Claude Code |
| `~/.openclaw/agents/main/agent/models.json` | Gateway runtime 快取（自動生成，不要手改） | Gateway 自動管理 |

**重要：`models.json` 是 gateway 啟動時自動生成的，不要手動修改它。所有模型配置以 `openclaw.json` 為準。**

---

## 版本變更日誌

### v2.3 (2026-02-16) - 定版
**變更類型**: 模型配置大改
**變更原因**: Gemini 3 上線、Kimi 改收費、API Key 全換

| 項目 | 變更內容 |
|------|---------|
| ➕ 新增 | Gemini 3 Pro + Gemini 3 Flash |
| 🔧 調整 | 主力模型從 Kimi K2.5 → Gemini 3 Flash |
| 🔧 調整 | Fallback 順序重排 |
| ⚠️ 注意 | Kimi K2.5 已非免費，改為 Fallback #1 |
| 🔧 調整 | 所有 API Key 已更新（Google/Kimi/Anthropic） |
| ➕ 新增 | 次數制 vs Token 制說明 |
| ➕ 新增 | 設定檔位置說明（openclaw.json vs models.json） |

**驗證狀態**: ✅ 主人確認通過，正式定版

### v2.2 (2026-02-15) - 定版
四層 Agent 備援架構、Claude 代理機制、決策歸檔流程

### v2.1 (2026-02-14) - 定版
補充其他模型路由、成本保護機制、檢查清單

---

🐣 達爾 | 模型路由規則 v2.3 | 2026-02-16 定版
