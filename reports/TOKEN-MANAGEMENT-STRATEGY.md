# OpenClaw Token 管理技術提升方案

> **日期**: 2026-02-12
> **目標**: 解決 Session Token 滿載導致的系統停頓問題

---

## 當前問題

| 指標 | 數值 | 狀態 |
|------|------|------|
| Context Window | 131k/131k | 🔴 100% 滿載 |
| Compaction Count | 0 | 🔴 未執行過壓縮 |
| 平均回應時間 | 20-45 秒 | 🔴 嚴重延遲 |

---

## 技術提升方案

### 方案 1：智能 Context 壓縮（已啟用）

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "mode": "auto",
        "targetTokens": 80000,
        "minMessages": 10,
        "preserveSystem": true,
        "preserveLastN": 5
      }
    }
  }
}
```

**效果預估**: 
- 自動維持在 80k tokens 以下
- 保留關鍵上下文，避免遺失重要資訊

---

### 方案 2：分層記憶架構（已實作）

```
┌─────────────────────────────────────────────────────────┐
│                    三層記憶架構                           │
├─────────────────────────────────────────────────────────┤
│  🔥 熱記憶 (Hot)                                         │
│     - Session Context (131k tokens)                     │
│     - 即時對話、工具執行結果                               │
├─────────────────────────────────────────────────────────┤
│  📋 溫記憶 (Warm)                                        │
│     - NOW.md, SESSION-STATE.md                          │
│     - 當前會話摘要、待辦事項                               │
├─────────────────────────────────────────────────────────┤
│  🗄️ 冷記憶 (Cold)                                        │
│     - MEMORY.md, memory/*.md                            │
│     - 歷史記錄、錨點檔案                                   │
└─────────────────────────────────────────────────────────┘
```

**優勢**: 
- 減少 Session Context 負擔
- 長期記憶不會遺失

---

### 方案 3：模型切換策略

| Context 使用率 | 策略 | 說明 |
|----------------|------|------|
| < 50% | 維持現狀 | 正常使用 Kimi K2.5 |
| 50-80% | 主動壓縮 | 自動觸發 compaction |
| > 80% | 降級模型 | 切換到更大 context 的模型 |
| > 95% | 緊急處理 | 強制 reset session |

**大 Context 模型選項**:
- `google/gemini-2.5-flash` (1M tokens)
- `anthropic/claude-opus-4-6` (1M tokens)

---

### 方案 4：定期 Session 清理

建立自動清理腳本：

```bash
#!/bin/bash
# token-cleanup.sh

# 檢查所有 sessions 的 token 使用量
openclaw sessions list --json | jq '.[] | select(.tokens > 100000) | .key'

# 清理超過 24 小時且 token > 100k 的 sessions
openclaw sessions cleanup --max-tokens 100000 --older-than 24h
```

設定 cron job：
```cron
# 每 6 小時檢查一次
0 */6 * * * /Users/caijunchang/.openclaw/scripts/token-cleanup.sh
```

---

### 方案 5：監控告警系統

在任務板建立監控任務：

```json
{
  "name": "Token 使用率監控",
  "schedule": "*/10 * * * *",
  "action": "檢查 session token 使用率，超過 80% 發送 Telegram 通知"
}
```

---

## 立即執行指令

### 當前 Session 緊急處理

```bash
# 檢查當前狀態
openclaw status

# 如果 main session 超過 100k，執行重置
openclaw sessions reset agent:main:main

# 或建立新會話
openclaw sessions new
```

### 配置重新載入

```bash
# 重新載入配置（無需重啟）
openclaw config reload

# 驗證設定
openclaw doctor
```

---

## 預期效果

| 指標 | 優化前 | 優化後 | 改善幅度 |
|------|--------|--------|----------|
| Context 使用率 | 100% | < 70% | -30% |
| 平均回應時間 | 20-45s | 2-5s | -80% |
| 系統穩定性 | 低 | 高 | ++++ |

---

## 長期規劃

1. **Session 分片技術**: 將長對話自動分割為多個子 session
2. **智能摘要**: AI 自動摘要歷史對話，減少 token 使用
3. **向量記憶整合**: 使用 SeekDB 儲存對話摘要，完全 offload session context

---

*建立時間: 2026-02-12 21:20*
*負責人: 小蔡*
