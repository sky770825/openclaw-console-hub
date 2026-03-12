# OpenClaw 修復摘要 | 2026-02-14

## 1) Gateway 狀態
- 已確認 openclaw gateway 正常運作：`RPC probe: ok`
- Dashboard http://127.0.0.1:18789/

## 2) 模型配置
- **Default 已固定為**: `kimi/kimi-k2.5`
- **Fallback 已移除本地小模型**（避免 sandbox=off 產生 security critical）
- **目前 fallback**:
  - `xai/grok-4-1-fast`
  - `anthropic/claude-haiku-4-5-20251001`
  - `google/gemini-2.5-flash`
  - `kimi/kimi-k2-turbo-preview`

## 3) Sandbox / Docker
- `agents.defaults.sandbox.mode = off`
- Docker 不需要啟動，避免先前「sandbox image inspect 失敗 / docker.sock 不存在」造成 cron error

## 4) Telegram（小蔡 bot）
- OpenClaw Telegram bot 已切回 **@xiaoji_cai_bot**
- `channels.telegram.dmPolicy = allowlist`
- `channels.telegram.allowFrom = ["5819565005"]`（只允許老蔡私訊，避免開放 DM 風險）
- Telegram channel 狀態：**OK**

## 5) Cron（最小可用自動化已啟用）

已啟用以下 **7 個**（其餘維持 disabled）：

| 名稱 | 頻率 | 類型 | 模型 |
|------|------|------|------|
| `auto-mode-watchdog` | every 1m | systemEvent | - |
| `context-watchdog` | every 5m | systemEvent | - |
| `Autopilot Lean（bash 零 token）` | every 5m | systemEvent | - |
| `recovery-check` | every 15m | systemEvent | - |
| `cleanup-old-sessions` | cron 0 3 * * * | systemEvent | - |
| `task-gen-internal` | every 15m | agentTurn | ollama/qwen2.5:14b |
| `任務板同步檢查（每日）` | cron 0 9 * * * | agentTurn | ollama/qwen2.5:14b |

## 6) 任務板 / 小ollama（通知 bot）
- `openclaw任務面板設計` 後端 **3011** 正常
- `/api/telegram/test` 與 `/api/telegram/force-test` 送訊成功
- 目前任務板使用的通知 bot 為 `@ollama168bot`（server/.env）

## 【後續規範建議】

⚠️ **重要**：同一個 Telegram bot token 不要同時被兩個程式用 `getUpdates` 輪詢，否則會出現 **409 getUpdates conflict**

✅ **建議維持**：
- 小蔡（OpenClaw gateway）→ @xiaoji_cai_bot
- 小ollama（任務板通知）→ @ollama168bot

兩個獨立 bot token，避免衝突。

---
🐣 小蔡 | 2026-02-14 13:47
