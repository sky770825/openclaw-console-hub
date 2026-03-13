# MODEL-ROUTING-OPTIMIZATION

> 多模型分層路由優化建議書
> 產出日期：2026-03-13
> 目標：85% 任務用低成本/免費模型，10% 中階，5% 高階

---

## 1. 當前模型分配表

### 已註冊模型清單

| Provider | Model ID | 名稱 | 推理能力 | Input $/1K tok | Output $/1K tok | Context Window |
|----------|----------|------|----------|----------------|-----------------|----------------|
| **Ollama** | qwen3:8b | Qwen3 8B | No | $0 | $0 | 32K |
| **Ollama** | deepseek-r1:8b | DeepSeek R1 8B | Yes | $0 | $0 | 32K |
| **Ollama** | qwen3:4b | Qwen3 4B | No | $0 | $0 | 32K |
| **Ollama** | qwen2.5:14b | Qwen2.5 14B | No | $0 | $0 | 128K |
| **OpenRouter** | hermes-3-405b:free | Hermes 3 405B | No | $0 | $0 | 131K |
| **OpenRouter** | llama-3.3-70b:free | Llama 3.3 70B | No | $0 | $0 | 131K |
| **OpenRouter** | qwen3-coder:free | Qwen3 Coder | No | $0 | $0 | 131K |
| **OpenRouter** | mistral-small-24b:free | Mistral Small 24B | No | $0 | $0 | 131K |
| **Google** | gemini-2.5-flash-lite | Gemini 2.5 Flash Lite | No | $0 | $0 | 4M |
| **Google** | gemini-2.0-flash-exp | Gemini 2 Flash Exp | No | $0 | $0 | 250K |
| **xAI** | grok-4-1-fast | Grok 4.1 Fast | No | $0.0002 | $0.0005 | 2M |
| **xAI** | grok-4-1-fast-reasoning | Grok 4.1 Fast Reasoning | Yes | $0.0002 | $0.0005 | 2M |
| **DeepSeek** | deepseek-chat | V3.2 | No | $0.00027 | $0.00041 | 131K |
| **DeepSeek** | deepseek-reasoner | R1 (V3.2) | Yes | $0.00027 | $0.00041 | 131K |
| **Google** | gemini-2.5-flash | Gemini 2.5 Flash | No | $0.0005 | $0.0015 | 1M |
| **Google** | gemini-3-flash-preview | Gemini 3 Flash | No | $0.0005 | $0.0015 | 1M |
| **Kimi** | kimi-k2.5 | Kimi K2.5 | No | $0.0005 | $0.0028 | 131K |
| **Kimi** | kimi-k2-turbo-preview | Kimi K2 Turbo | No | $0.0006 | $0.0025 | 262K |
| **Anthropic** | claude-haiku-4-5 | Haiku 4.5 | No | $0.001 | $0.005 | 200K |
| **Google** | gemini-3-pro-preview | Gemini 3 Pro | Yes | $0.002 | $0.012 | 1M |
| **Anthropic** | claude-sonnet-4-6 | Sonnet 4.5 | Yes | $0.003 | $0.015 | 200K |
| **Anthropic** | claude-opus-4-6 | Opus 4.6 | Yes | $0.015 | $0.075 | 1M |

### 當前路由配置問題

1. **openclaw.json**：主模型設定為 Sonnet 4.5（中高成本），fallback 是 Opus 4.6（最高成本） + Haiku 4.5
2. **config.json**：使用過時的 gemini-1.5-flash / gemini-1.5-pro，與 openclaw.json 的模型清單不匹配
3. **Heartbeat**：已正確使用 Haiku 4.5（低成本），這是好的
4. **缺乏分層路由邏輯**：沒有根據任務類型自動選擇模型的機制
5. **免費模型未被充分利用**：Ollama 本地模型 + OpenRouter 免費模型共 8 個，但未被分配到常規任務

---

## 2. 建議分層路由架構

### Tier 0 — 免費層（目標：50% 任務量）

**模型池：**
| 優先級 | 模型 | 用途說明 |
|--------|------|----------|
| 1 | `ollama/qwen3:4b` | 最快回應 — 簡單分類、heartbeat 輔助、狀態檢查 |
| 2 | `ollama/qwen3:8b` | 日常對話、檔案整理指令生成、格式轉換 |
| 3 | `ollama/qwen2.5:14b` | 較複雜的本地推理（128K context）|
| 4 | `ollama/deepseek-r1:8b` | 需要推理的簡單任務 |
| 5 | `openrouter/qwen3-coder:free` | 簡單代碼生成（本地 Ollama 不可用時 fallback）|
| 6 | `openrouter/llama-3.3-70b:free` | 一般對話 fallback |
| 7 | `google/gemini-2.5-flash-lite` | 超長上下文免費任務（4M window）|

**適用任務：**
- Heartbeat / 健康檢查
- 簡單分類與標籤
- 檔案整理、重命名建議
- 模板填充、格式轉換
- 系統狀態摘要
- 簡單 Q&A

### Tier 1 — 低成本層（目標：35% 任務量）

**模型池：**
| 優先級 | 模型 | 單價參考（output $/1K） | 用途說明 |
|--------|------|------------------------|----------|
| 1 | `xai/grok-4-1-fast` | $0.0005 | 極低成本 + 2M context，日常主力 |
| 2 | `deepseek/deepseek-chat` | $0.00041 | 超低成本對話 |
| 3 | `google/gemini-2.5-flash` | $0.0015 | 多模態（圖片）+ 長上下文 |
| 4 | `google/gemini-3-flash-preview` | $0.0015 | 最新 Flash 模型 |
| 5 | `kimi/kimi-k2.5` | $0.0028 | 備用 |

**適用任務：**
- 日常對話回覆
- 批次處理任務
- 代碼解釋、文檔摘要
- Telegram / WhatsApp 訊息回覆
- 任務板例行掃描
- 日誌分析

### Tier 2 — 中成本層（目標：10% 任務量）

**模型池：**
| 優先級 | 模型 | 單價參考（output $/1K） | 用途說明 |
|--------|------|------------------------|----------|
| 1 | `xai/grok-4-1-fast-reasoning` | $0.0005 | 有推理的低成本選項，優先試用 |
| 2 | `deepseek/deepseek-reasoner` | $0.00041 | 低成本推理 |
| 3 | `anthropic/claude-haiku-4-5` | $0.005 | 穩定的 Anthropic 品質 |
| 4 | `google/gemini-3-pro-preview` | $0.012 | 高品質推理 |
| 5 | `anthropic/claude-sonnet-4-6` | $0.015 | 代碼修復的黃金標準 |

**適用任務：**
- 代碼修復與重構
- Bug 分析與診斷
- 中等複雜度的系統分析
- 多文件代碼審查
- 任務規劃與分解
- n8n workflow 修改

### Tier 3 — 高成本層（目標：5% 任務量）

**模型池：**
| 優先級 | 模型 | 單價參考（output $/1K） | 用途說明 |
|--------|------|------------------------|----------|
| 1 | `anthropic/claude-sonnet-4-6` | $0.015 | 多數「高階」任務實際用 Sonnet 即可 |
| 2 | `anthropic/claude-opus-4-6` | $0.075 | 僅限真正需要最強推理的場景 |

**適用任務：**
- 複雜架構設計
- 跨系統整合方案
- 安全審計與漏洞分析
- 大規模重構計劃
- 新功能完整設計文件
- 關鍵決策的二次驗證

---

## 3. 任務到模型對應表

| 任務類型 | Tier | 首選模型 | Fallback |
|----------|------|----------|----------|
| heartbeat | 0 | `ollama/qwen3:4b` | `anthropic/claude-haiku-4-5` |
| 健康檢查 (health check) | 0 | `ollama/qwen3:4b` | `google/gemini-2.5-flash-lite` |
| 檔案分類/整理 | 0 | `ollama/qwen3:8b` | `openrouter/qwen3-coder:free` |
| 格式轉換 | 0 | `ollama/qwen2.5:14b` | `google/gemini-2.5-flash-lite` |
| 簡單問答 | 0 | `ollama/qwen3:8b` | `openrouter/llama-3.3-70b:free` |
| Telegram 回覆 | 1 | `xai/grok-4-1-fast` | `deepseek/deepseek-chat` |
| WhatsApp 回覆 | 1 | `xai/grok-4-1-fast` | `google/gemini-3-flash-preview` |
| 日誌分析 | 1 | `deepseek/deepseek-chat` | `google/gemini-2.5-flash` |
| 批次處理 | 1 | `xai/grok-4-1-fast` | `deepseek/deepseek-chat` |
| 文檔摘要 | 1 | `google/gemini-2.5-flash` | `kimi/kimi-k2.5` |
| 代碼解釋 | 1 | `google/gemini-3-flash-preview` | `xai/grok-4-1-fast` |
| 代碼修復 | 2 | `xai/grok-4-1-fast-reasoning` | `anthropic/claude-haiku-4-5` |
| Bug 診斷 | 2 | `deepseek/deepseek-reasoner` | `anthropic/claude-sonnet-4-6` |
| 代碼審查 | 2 | `anthropic/claude-haiku-4-5` | `google/gemini-3-pro-preview` |
| n8n workflow 編輯 | 2 | `anthropic/claude-haiku-4-5` | `anthropic/claude-sonnet-4-6` |
| 任務規劃 | 2 | `google/gemini-3-pro-preview` | `anthropic/claude-sonnet-4-6` |
| 架構設計 | 3 | `anthropic/claude-sonnet-4-6` | `anthropic/claude-opus-4-6` |
| 安全審計 | 3 | `anthropic/claude-opus-4-6` | `anthropic/claude-sonnet-4-6` |
| 大規模重構 | 3 | `anthropic/claude-opus-4-6` | `google/gemini-3-pro-preview` |
| 關鍵決策驗證 | 3 | `anthropic/claude-opus-4-6` | — |

---

## 4. 自動升級鏈（Escalation）規則

```
Tier 0 → Tier 1 → Tier 2 → Tier 3
```

### 升級觸發條件

| 條件 | 動作 |
|------|------|
| Tier 0 模型返回錯誤或超時 | 升級到 Tier 1 |
| Tier 0 輸出品質評分 < 0.6 | 升級到 Tier 1 |
| 任務 token 需求 > 32K（Ollama 限制） | 跳過 Tier 0，直接 Tier 1 |
| Tier 1 模型返回錯誤 | 升級到 Tier 2 |
| 任務包含「修復」「debug」「分析」關鍵字 | 直接 Tier 2 |
| 任務包含「架構」「設計」「安全」「審計」關鍵字 | 直接 Tier 3 |
| 用戶明確指定模型 | 覆蓋所有路由規則 |
| Tier 2 重試 2 次仍失敗 | 升級到 Tier 3 |
| Ollama 服務不可用 | Tier 0 fallback 到 OpenRouter 免費模型 |

### 降級規則（節省成本）

| 條件 | 動作 |
|------|------|
| 連續 5 次 Tier 1 任務成功 | 嘗試將類似任務降級到 Tier 0 |
| heartbeat 無異常連續 1 小時 | heartbeat 頻率從 60m 改為 90m |
| 批次任務超過 10 個子任務 | 強制使用 Tier 0/1 |

---

## 5. openclaw.json 具體修改建議

### 5.1 修改 agents.defaults.model（主路由）

**當前：**
```json
"model": {
  "primary": "anthropic/claude-sonnet-4-6-20250514",
  "fallbacks": ["anthropic/claude-opus-4-6", "anthropic/claude-haiku-4-5-20251001"]
}
```

**建議改為：**
```json
"model": {
  "primary": "xai/grok-4-1-fast",
  "fallbacks": [
    "deepseek/deepseek-chat",
    "google/gemini-3-flash-preview",
    "anthropic/claude-haiku-4-5-20251001",
    "anthropic/claude-sonnet-4-6-20250514"
  ]
}
```

> 理由：日常主力從 Sonnet（$0.015/1K output）降為 Grok 4.1 Fast（$0.0005/1K output），成本降低 30 倍。Sonnet 和 Opus 作為最後 fallback 保留品質底線。

### 5.2 修改 heartbeat.model

**當前：**
```json
"heartbeat": {
  "model": "anthropic/claude-haiku-4-5-20251001"
}
```

**建議改為：**
```json
"heartbeat": {
  "model": "ollama/qwen3:4b",
  "fallbackModel": "anthropic/claude-haiku-4-5-20251001"
}
```

> 理由：heartbeat 每 60 分鐘觸發一次，是最高頻任務。改用免費本地模型可省下 100% 的 heartbeat 成本。Haiku 作為 Ollama 不可用時的 fallback。

### 5.3 新增 routing 區塊（如果 OpenClaw 支援）

```json
"routing": {
  "enabled": true,
  "strategy": "tiered",
  "tiers": {
    "0": {
      "models": [
        "ollama/qwen3:4b",
        "ollama/qwen3:8b",
        "ollama/qwen2.5:14b",
        "ollama/deepseek-r1:8b",
        "openrouter/qwen/qwen3-coder:free",
        "openrouter/meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.5-flash-lite"
      ],
      "tasks": ["heartbeat", "classify", "format", "organize", "status", "simple-qa"]
    },
    "1": {
      "models": [
        "xai/grok-4-1-fast",
        "deepseek/deepseek-chat",
        "google/gemini-2.5-flash",
        "google/gemini-3-flash-preview",
        "kimi/kimi-k2.5"
      ],
      "tasks": ["chat", "batch", "summarize", "explain", "telegram", "whatsapp", "log-analysis"]
    },
    "2": {
      "models": [
        "xai/grok-4-1-fast-reasoning",
        "deepseek/deepseek-reasoner",
        "anthropic/claude-haiku-4-5-20251001",
        "google/gemini-3-pro-preview",
        "anthropic/claude-sonnet-4-6-20250514"
      ],
      "tasks": ["code-fix", "debug", "review", "analyze", "plan", "n8n-workflow"]
    },
    "3": {
      "models": [
        "anthropic/claude-sonnet-4-6-20250514",
        "anthropic/claude-opus-4-6"
      ],
      "tasks": ["architecture", "security-audit", "refactor-large", "critical-decision"]
    }
  },
  "escalation": {
    "enabled": true,
    "maxRetries": 2,
    "onError": "escalate",
    "onLowQuality": "escalate"
  }
}
```

### 5.4 修改 config.json 模型引用

**當前 config.json 使用過時模型名稱**，建議更新：

```json
{
  "model": "xai/grok-4-1-fast",
  "modelFallback": "google/gemini-3-flash-preview",
  "modelFallbackChain": [
    "xai/grok-4-1-fast",
    "google/gemini-3-flash-preview",
    "deepseek/deepseek-chat",
    "anthropic/claude-haiku-4-5-20251001"
  ],
  "costOptimization": {
    "mode": "aggressive",
    "primary": "xai/grok-4-1-fast",
    "backup": "deepseek/deepseek-chat",
    "apiFallback": "google/gemini-2.5-flash",
    "routing": {
      "routine": "ollama/qwen3:8b",
      "complex": "anthropic/claude-haiku-4-5-20251001",
      "critical": "anthropic/claude-sonnet-4-6-20250514"
    }
  },
  "features": {
    "autoSkill": "ollama/qwen3:4b"
  }
}
```

### 5.5 l2-opus subagent 保持不動

`l2-opus` agent 專門用於複雜推理，保持使用 `anthropic/claude-opus-4-6` 是正確的。僅在主路由中控管升級到 l2-opus 的閾值即可。

---

## 6. 預估月成本節省

### 假設條件
- 日均 200 次 API 呼叫
- 平均每次 input 2K tokens + output 1K tokens
- 每月 30 天 = 6,000 次呼叫

### 當前成本估算（以 Sonnet 為主力）

| 項目 | 呼叫次數/月 | 模型 | Output 單價 | 月成本 |
|------|------------|------|-------------|--------|
| 一般任務 (85%) | 5,100 | Sonnet 4.5 | $0.015/1K | $76.50 |
| 中階任務 (10%) | 600 | Sonnet 4.5 | $0.015/1K | $9.00 |
| 高階任務 (5%) | 300 | Opus 4.6 | $0.075/1K | $22.50 |
| Heartbeat (24次/天) | 720 | Haiku 4.5 | $0.005/1K | $3.60 |
| **合計** | | | | **$111.60** |

> 註：僅計算 output token 成本，input 成本另計約為 output 的 20-30%。

### 優化後成本估算

| 項目 | 呼叫次數/月 | 模型 | Output 單價 | 月成本 |
|------|------------|------|-------------|--------|
| Tier 0 (50%) | 3,000 | Ollama/Free | $0 | **$0** |
| Tier 1 (35%) | 2,100 | Grok Fast / DeepSeek | ~$0.0005/1K | **$1.05** |
| Tier 2 (10%) | 600 | Haiku / Grok Reasoning | ~$0.003/1K | **$1.80** |
| Tier 3 (5%) | 300 | Sonnet / Opus | ~$0.030/1K | **$9.00** |
| Heartbeat | 720 | Ollama qwen3:4b | $0 | **$0** |
| **合計** | | | | **$11.85** |

### 節省幅度

| 指標 | 數值 |
|------|------|
| 當前月成本（output） | ~$111.60 |
| 優化後月成本（output） | ~$11.85 |
| **月節省金額** | **~$99.75** |
| **節省比例** | **~89%** |
| 年化節省 | ~$1,197 |

---

## 7. 實施優先級

| 順序 | 修改項目 | 難度 | 預期節省 |
|------|----------|------|----------|
| 1 | heartbeat 改用 `ollama/qwen3:4b` | 低 | 3% |
| 2 | 主模型從 Sonnet 改為 `xai/grok-4-1-fast` | 低 | 60% |
| 3 | config.json 更新過時模型名稱 | 低 | 配置一致性 |
| 4 | 新增分層路由規則 | 中 | 20% |
| 5 | 實作自動升級/降級邏輯 | 高 | 6% |

---

## 8. 風險與注意事項

1. **Ollama 可用性**：本地模型依賴 Docker/Ollama 服務運行，需確保 `http://localhost:11434` 持續可用
2. **品質降級風險**：Tier 0/1 模型在複雜任務上可能品質不足，需要可靠的品質評估機制
3. **OpenRouter 免費額度**：免費模型可能有速率限制或不穩定，不宜作為核心依賴
4. **Grok 4.1 Fast 穩定性**：xAI API 相對較新，需監控穩定性
5. **config.json vs openclaw.json**：兩個配置文件存在衝突（config.json 引用已不存在的 gemini-1.5 模型），應統一

---

*本文件僅為建議，不修改任何配置文件。實施前請逐步測試每個 Tier 的模型表現。*
