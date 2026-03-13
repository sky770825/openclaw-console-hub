# 2026-02-14 補充注意事項（避免踩雷）

## 5) Cron payload.kind 與成本控制

- **監控/巡檢/整理/同步類**：優先用 `systemEvent`（少 tokens、低風險、較不會爆 context）
- **需要 LLM 才用 `agentTurn`**，且必設：
  - `timeoutSeconds`
  - 輸出上限（摘要化，不貼全量 log）
  - 明確的「成功判定」與「失敗重試規則」

---

## 6) 任務寫回（Writeback）與防重複（Idempotency）

- 任務卡寫回必須可重跑、不可重複污染：
  - **idempotencyKey** = `${task_id}:${run_id}`
- 寫回欄位固定化（最低集合）：
  - `summary`
  - `evidenceLinks`
  - `nextSteps`
  - `modelUsed`
  - `costApprox`（可用粗估，不必精算）
- **原則**：任務板不是只追蹤狀態，必須承載「可執行摘要」。

---

## 7) Context 爆炸防護（強制摘要/換會話）

- **回報一律摘要化**：禁止直接貼全量 log/長對話原文
- **門檻策略**（建議）：
  - **context > 70%**：checkpoint（摘要 + 寫索引）
  - **context > 85%**：強制 `/new + handoff`（只帶摘要，不帶全量歷史）
- **子代理輸出規則**：只保留結論（<500字），詳細寫檔案，不進對話。

---

## 8) 模型政策落地（避免不必要付費）

- **預設**：Ollama / 免費層優先；Kimi 次之；Opus/Pro 最後
- **升級門檻**：
  - 僅 `riskLevel = P0` 且主人確認，才可使用 Opus/Pro 類高成本模型
- **小模型限制**：
  - 本地小模型（例如 8B）不得搭配不受控 web tools（降低 prompt injection 風險）

---

## 9) Telegram 群組/私訊觸發規範

- **群組**：預設 `requireMention=true`（避免群組對話誤觸發）
- **私訊**：只允許 allowlist（主人 chat_id），避免陌生人注入指令
- **Token 原則**：
  - 達爾（gateway）與小ollama（任務板通知）使用不同 bot token，避免 `409 getUpdates conflict`

---

## 10) 服務埠衝突與健康檢查（快速定位）

- `EADDRINUSE: 3011`：代表舊 server 仍佔用，先查 PID 再重啟
- **固定保留兩個 health check**：
  - `openclaw gateway status`
  - `curl http://127.0.0.1:3011/health`
- **原則**：先確保 health OK，再開 cron/auto-executor，避免「看似啟動但實際不工作」。

---

🐣 達爾 | 2026-02-14 13:54 | 避免踩雷核心記憶
