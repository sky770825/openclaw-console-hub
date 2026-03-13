# Ollama Telegram 回覆速度 — 實測與優化

## 實測結果（優化前）

- **System context**：約 32K tokens（knowledge_auto 過大）
- **TTFT（首字元時間）**：約 29 秒
- **總生成時間**：約 31 秒
- **瓶頸**：知識庫 context 過大，模型需處理大量 token 才能開始生成

## 已實施優化

| 項目 | 變更 | 效果 |
|------|------|------|
| **knowledge_auto 精簡** | 總上限 6000 字元、每檔 5 行、優先納入關鍵 doc | 大幅縮減 context |
| **知識庫長度保護** | _load_knowledge 上限 10000 字元 | 防止再爆 |
| **num_ctx=2048** | Qwen 系列改用 2048 | 減少讀取與推理負擔 |
| **串流首次更新** | 收到首個 chunk 即更新 Telegram | 體感更快 |
| **edit_interval** | 0.8 秒 | 更新更頻繁 |

## 運行邏輯與流程

1. 使用者發訊息 → bot 載入 memory + knowledge
2. 組 messages（system + history[-6] + user）
3. 串流呼叫 Ollama，收到 chunk 即累積
4. 首個 chunk 到達即更新 Telegram；之後每 0.8 秒更新
5. 結束後解析 memory_patch、寫入記憶、回傳最終回覆

## 建議：OLLAMA_KEEP_ALIVE

若模型未常駐，TTFT 會包含載入時間（可達 10–30 秒）。建議在跑 Ollama 的環境設：

```
OLLAMA_KEEP_ALIVE=24h
```

（LaunchAgent 的 EnvironmentVariables 或 shell profile）

## 手動實測

```bash
cd /Users/caijunchang/openclaw任務面版設計
python3 scripts/ollama_speed_test.py
```

## 若仍慢

- 換 qwen3:8b-q4_0 量化版
- 或 qwen2.5:7b 較小模型
- 確認 Ollama 有使用 Metal（Mac GPU）
