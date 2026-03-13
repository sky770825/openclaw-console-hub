# Heartbeat Ollama Migration Plan

> Generated: 2026-03-13
> Status: PROPOSAL - Pending owner approval

---

## 1. Current Heartbeat Configuration

```json
{
  "heartbeat": {
    "every": "60m",
    "model": "anthropic/claude-haiku-4-5-20251001",
    "prompt": "心跳時間。1) 用 run_script 跑 curl ... 看任務板。2) 有 ready 任務就用 run_script curl 觸發 auto-executor。3) 用 run_script curl ... 檢查系統健康。4) 有異常就建 create_task 修復。不要回覆 HEARTBEAT_OK。"
  }
}
```

- **Model**: `anthropic/claude-haiku-4-5-20251001` (Claude Haiku 4.5)
- **Interval**: every 60 minutes
- **Cost per call**: input $0.001/1K tokens, output $0.005/1K tokens
- **Task**: curl 檢查任務板 + 系統健康 + 自動觸發 executor

## 2. Heartbeat Task Analysis

Heartbeat 的工作內容屬於**低複雜度例行操作**：
- 發送 curl 請求檢查 API endpoint
- 解析 JSON 回應判斷是否有 ready 任務
- 觸發 auto-executor
- 檢查 health endpoint
- 有異常時建立 task

這些操作不需要高階推理能力，一個中等能力的本地模型即可勝任。

## 3. Available Ollama Models

| Model | Size | Parameters | Quantization | Recommendation |
|-------|------|------------|--------------|----------------|
| deepseek-r1:70b | 42.5 GB | 70.6B | Q4_K_M | Overkill |
| qwen2.5:72b | 47.4 GB | 72.7B | Q4_K_M | Overkill |
| qwen2.5:32b | 19.9 GB | 32.8B | Q4_K_M | Good but heavy |
| deepseek-r1:7b | 4.7 GB | 7.6B | Q4_K_M | Adequate |
| mistral:7b | 4.4 GB | 7.2B | Q4_K_M | Adequate |

## 4. Recommended Model: `qwen2.5:32b`

### Why qwen2.5:32b?

1. **Sufficient capability**: 32B parameters 足以理解 JSON 回應、判斷任務狀態、做出簡單決策
2. **Chinese understanding**: Qwen 系列對中文 prompt 的理解優於 Mistral，heartbeat prompt 是中文
3. **Stable & mature**: Qwen2.5 是成熟版本，比 R1 系列更適合做例行判斷（不需要 reasoning chain）
4. **Memory footprint**: 約 20GB VRAM，單次推理不會長時間佔用 GPU
5. **Already registered**: `qwen2.5:14b` 已在 openclaw.json 註冊，但本地實際有 32b 版本更強

### Alternative: `deepseek-r1:7b`

如果擔心 32B 佔用過多資源（尤其訓練時），可用 7B 作為輕量替代。但中文理解能力稍弱。

## 5. Pre-requisite: Register qwen2.5:32b in openclaw.json

需先將 `qwen2.5:32b` 加入 ollama provider 的 models 列表，然後才能用於 heartbeat。

### Step A: Add model to providers (JSON Patch)

```json
[
  {
    "op": "add",
    "path": "/models/providers/ollama/models/-",
    "value": {
      "id": "qwen2.5:32b",
      "name": "[Ollama] Qwen2.5 32B",
      "api": "openai-completions",
      "reasoning": false,
      "input": ["text"],
      "cost": {
        "input": 0,
        "output": 0,
        "cacheRead": 0,
        "cacheWrite": 0
      },
      "contextWindow": 128000,
      "maxTokens": 8192
    }
  }
]
```

### Step B: Register in agents.defaults.models

```json
[
  {
    "op": "add",
    "path": "/agents/defaults/models/ollama~1qwen2.5:32b",
    "value": {
      "alias": "qwen25-32b"
    }
  }
]
```

### Step C: Change heartbeat model

```json
[
  {
    "op": "replace",
    "path": "/agents/defaults/heartbeat/model",
    "value": "ollama/qwen2.5:32b"
  }
]
```

## 6. Lightweight Alternative (deepseek-r1:7b)

如果想用最小資源佔用，改用已經註冊好的 `deepseek-r1:8b`，只需一步：

```json
[
  {
    "op": "replace",
    "path": "/agents/defaults/heartbeat/model",
    "value": "ollama/deepseek-r1:8b"
  }
]
```

> Note: deepseek-r1:8b 已在 openclaw.json 中註冊，無需額外步驟。

## 7. Cost Savings Estimate

### Current cost (Claude Haiku 4.5)

- Heartbeat frequency: 24 times/day (every 60min)
- Estimated tokens per heartbeat: ~800 input + ~400 output
- Daily cost: 24 x (0.8 x $0.001 + 0.4 x $0.005) = 24 x $0.0028 = **$0.067/day**
- Monthly cost: **~$2.01/month**

### After migration (Ollama local)

- Cost: **$0.00/day** (local inference, electricity only)
- Monthly saving: **~$2.01/month** (100% reduction in heartbeat API costs)

### Additional benefits

- **Zero latency to API**: no network roundtrip to Anthropic
- **No rate limit risk**: local model never hits rate limits
- **Privacy**: heartbeat data (task list, health status) stays on local machine
- **Reliability**: works even when internet is down

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 7B/32B model 判斷能力不如 Haiku | Heartbeat 任務極簡單，基本是 pattern matching |
| GPU 記憶體被佔用影響訓練 | 訓練時可暫時切回 Haiku 或用 7B 模型 |
| Ollama 服務掛掉 | OpenClaw 應有 fallback 機制，可設定 fallback 到 Haiku |
| 中文 prompt 理解不佳 | Qwen 系列中文能力強，問題不大 |

## 9. Rollback Plan

如果 Ollama heartbeat 不穩定，還原為：

```json
[
  {
    "op": "replace",
    "path": "/agents/defaults/heartbeat/model",
    "value": "anthropic/claude-haiku-4-5-20251001"
  }
]
```
