# OpenRouter + Perplexity Deep Research 整合指南

> 建立日期: 2026-03-13
> 狀態: 配置建議（尚未套用）

---

## 1. OpenRouter 註冊與準備

OpenClaw 已有 OpenRouter provider 配置（baseUrl: `https://openrouter.ai/api/v1`），API Key 已設定。

如需更新或重新取得 Key：
1. 前往 https://openrouter.ai 並登入
2. 進入 Dashboard > Keys
3. 建立新 Key 或使用現有 Key
4. 確認帳戶餘額足夠（Perplexity 模型為付費模型，非 :free 端點）

---

## 2. 需要添加到 openclaw.json 的配置

以下兩個模型定義需加入 `models.providers.openrouter.models` 陣列中：

```json
{
  "id": "perplexity/sonar-pro",
  "name": "[OpenRouter] Perplexity Sonar Pro Search",
  "api": "openai-completions",
  "reasoning": false,
  "input": ["text"],
  "cost": {
    "input": 0.003,
    "output": 0.015,
    "cacheRead": 0,
    "cacheWrite": 0
  },
  "contextWindow": 200000,
  "maxTokens": 8192
}
```

```json
{
  "id": "perplexity/sonar-deep-research",
  "name": "[OpenRouter] Perplexity Deep Research",
  "api": "openai-completions",
  "reasoning": true,
  "input": ["text"],
  "cost": {
    "input": 0.003,
    "output": 0.015,
    "cacheRead": 0,
    "cacheWrite": 0
  },
  "contextWindow": 128000,
  "maxTokens": 16384
}
```

同時在 `agents.defaults.models` 中添加別名映射：

```json
"openrouter/perplexity/sonar-pro": {
  "alias": "pplx-search"
},
"openrouter/perplexity/sonar-deep-research": {
  "alias": "pplx-deep"
}
```

---

## 3. 觸發條件設定建議

| 場景 | 使用模型 | 觸發方式 |
|------|---------|---------|
| 一般即時搜尋 | `perplexity/sonar-pro` | 使用者說「搜尋」「查一下」「幫我找」等關鍵字 |
| 深度研究 | `perplexity/sonar-deep-research` | 使用者說「深度研究」「深入分析」「詳細調查」等關鍵字 |
| 預設網頁搜尋 | 維持現有 Brave Search | 簡單事實查詢、快速確認 |

### 建議的 system prompt 路由邏輯

在 agent 的 system prompt 或 skill 中加入判斷：

```
當使用者要求搜尋資訊時：
- 簡單事實查詢 -> 使用內建 web_search (Brave)
- 需要多來源綜合回答 -> 切換到 pplx-search 模型進行對話
- 使用者明確說「深度研究」-> 切換到 pplx-deep 模型，該模型會自動進行多輪搜尋並產出研究報告
```

---

## 4. 預估成本

| 模型 | 每次搜尋預估 Token | 預估費用 (USD) |
|------|-------------------|---------------|
| Sonar Pro Search | ~1K input + ~2K output | ~$0.03 - $0.05 |
| Deep Research | ~2K input + ~8K output | ~$0.13 - $0.20 |
| Deep Research (複雜主題) | ~3K input + ~15K output | ~$0.25 - $0.40 |

> 注意：Deep Research 會在後端自動執行多輪搜尋，實際 token 消耗取決於研究深度。
> OpenRouter 可能會在上游價格之上加收少量 routing 費用。
> 相比之下，Brave Search API 每次查詢約 $0.003，適合簡單查詢。

---

## 5. proxy_fetch 調用範例

### 5.1 使用 Sonar Pro 進行即時搜尋

透過 OpenRouter API 直接呼叫：

```bash
curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "perplexity/sonar-pro",
    "messages": [
      {
        "role": "system",
        "content": "你是一個搜尋助手，用繁體中文回答，附上來源連結。"
      },
      {
        "role": "user",
        "content": "2026年3月最新的 AI 開源模型排行榜"
      }
    ],
    "max_tokens": 4096,
    "temperature": 0.1
  }'
```

### 5.2 使用 Deep Research 進行深度研究

```bash
curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "perplexity/sonar-deep-research",
    "messages": [
      {
        "role": "system",
        "content": "你是一個深度研究助手。請針對使用者的問題進行全面、多角度的深入研究，提供詳細的分析報告，包含數據、來源、比較和結論。使用繁體中文。"
      },
      {
        "role": "user",
        "content": "比較 2026 年主流 LLM 微調框架（LoRA、QLoRA、PEFT）的效能、記憶體需求和適用場景"
      }
    ],
    "max_tokens": 16384,
    "temperature": 0.2
  }'
```

### 5.3 在 OpenClaw 內透過 run_script 調用

```bash
run_script curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer sk-or-v1-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"perplexity/sonar-pro","messages":[{"role":"user","content":"搜尋內容"}],"max_tokens":4096}'
```

### 5.4 在 OpenClaw 中切換模型進行搜尋對話

如果已在 openclaw.json 註冊模型，可直接在對話中使用：

```
/model pplx-search     # 切換到 Sonar Pro 搜尋模式
/model pplx-deep       # 切換到 Deep Research 模式
/model opus            # 切回一般對話模式
```

---

## 6. 注意事項

- **不要修改 openclaw.json**，本文件僅為配置建議
- Perplexity 模型透過 OpenRouter 呼叫時，回應中的 `citations` 欄位會包含來源 URL
- Deep Research 的回應時間較長（可能 30 秒至數分鐘），建議設定較長的 timeout
- 如果在 Telegram channel 使用，注意 `timeoutSeconds: 15` 可能不夠，Deep Research 需要調高
- OpenRouter 的 rate limit 預設為每分鐘 200 次請求，Perplexity 模型可能有額外限制
- 建議先用少量查詢測試，確認計費正確後再大量使用
