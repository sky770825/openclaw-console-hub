# 2026-02-14 補充核心記憶（穩定性 + 省 Token）

## 1) Telegram Token 規則（必遵守）

- 同一個 Telegram bot token 只能有一個 getUpdates long-polling 程序，否則必定出現：
  - **409 getUpdates conflict**

- **角色分離（避免衝突）**：
  - **小蔡**（OpenClaw gateway 控制/回話）→ @xiaoji_cai_bot
  - **小ollama**（任務板通知/force-test/回報）→ @ollama168bot

- **原則**：小蔡 bot token 不可與任務板後端共用

---

## 2) DM 安全預設（防外洩/防亂入）

- @xiaoji_cai_bot 的 DM 預設：
  - `channels.telegram.dmPolicy = allowlist`
  - `channels.telegram.allowFrom = [老蔡 chat_id]`

- **禁止使用**：
  - `dmPolicy=open`（會觸發 security critical，且可能造成陌生人注入指令/上下文洩漏）

---

## 3) Docker / Sandbox 原則（避免 cron error）

- **Docker 關閉（預設狀態）時**：
  - `agents.defaults.sandbox.mode = off`
  - 否則 cron 會因 docker.sock not found 類錯誤而失敗

- **若未來要啟用 sandbox**：
  - 先確認 Docker Desktop 正在運行，並且允許 OpenClaw 存取 docker socket

---

## 4) 最小可用基線（故障排除與恢復）

### 先檢查（優先順序）
1. `openclaw status`
2. `openclaw gateway status`
3. `openclaw channels logs --channel telegram`

### 典型修復
- `openclaw gateway restart`

### Cron 最小啟用集合（可用基線）
| 任務 | 用途 |
|------|------|
| watchdog 類 | auto-mode / context / autopilot / recovery |
| task-gen-internal | 內部優化掃描 |
| 任務板同步檢查 | 每日任務板健康檢查 |

- **原則**：先恢復到「最小可用基線」再逐步開啟其他 cron，避免一次全開導致互相干擾與 token 暴增

---

## 5) 補充：模型降級規則（省錢）

| 場景 | 預設 | 降級 |
|------|------|------|
| 監控報告 | Kimi | Ollama/Gemini Free |
| 簡單摘要 | Kimi | Ollama |
| 格式轉換 | Kimi | Ollama |
| 故障排查 | Grok/Opus | Codex/Kimi |

---

🐣 小蔡 | 2026-02-14 13:48 | 穩定性 + 省 Token 核心記憶
