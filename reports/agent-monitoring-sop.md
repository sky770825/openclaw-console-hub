# Agent 指揮監控流程 SOP

> 建立時間：2026-02-11  
> 目的：確保被指派的 Agent 正常運作，避免卡住無人知曉

---

## 🎯 監控目標

1. **指揮官（小蔡）狀態**：是否正在執行指揮任務
2. **指派 Agent 狀態**：Cursor/CoDEX/OpenClaw/Ollama 是否正常運作
3. **任務健康度**：任務是否卡住超過 10 分鐘
4. **異常預警**：及時發現並回報問題

---

## ⏰ 監控頻率

- **自動回報**：每 5 分鐘（Cron Job）
- **即時監控**：執行重要任務時，每 2 分鐘檢查
- **異常加速**：發現異常時，每 1 分鐘追蹤直到恢復

---

## 📋 監控檢查清單

### 1. 指揮官狀態檢查
```bash
# 檢查活躍會話
sessions_list --activeMinutes 10

# 檢查當前執行狀態
session_status
```

### 2. 任務板狀態檢查
```bash
# 取得進行中任務
./scripts/task-board-api.sh list-tasks | grep -E "running|ready"

# 取得最近執行紀錄
./scripts/task-board-api.sh list-runs | head -10
```

### 3. Agent 健康檢查
| Agent 類型 | 檢查方式 | 正常指標 |
|-----------|---------|---------|
| **Cursor** | 檢查 cursor 命令可用性 | `cursor --version` 成功 |
| **CoDEX** | 檢查 codex 命令可用性 | `codex --version` 成功 |
| **OpenClaw** | 檢查 Gateway 狀態 | `curl localhost:3011/health` |
| **Ollama** | 檢查模型列表 | `curl localhost:11434/api/tags` |

### 4. 任務卡住檢測
```javascript
// 邏輯：如果任務狀態為 running 且最後更新時間 > 10 分鐘前
const isStuck = (task) => {
  return task.status === 'running' && 
         Date.now() - new Date(task.updatedAt).getTime() > 10 * 60 * 1000;
};
```

---

## 🚨 異常處理流程

### Level 1: 警告（任務執行時間稍長）
- 執行時間 > 10 分鐘
- **動作**：發送警告訊息，持續監控

### Level 2: 異常（任務可能卡住）
- 執行時間 > 20 分鐘
- 或 Agent 無回應
- **動作**：標記任務為「可能卡住」，通知老蔡

### Level 3: 嚴重（系統問題）
- 多個 Agent 同時無回應
- 或任務板 API 無法連線
- **動作**：立即通知老蔡，建議手動檢查

---

## 📊 回報格式範本

```
📊 Agent監控 [21:35]

🎯 指揮官：運作中（處理 SkillForge 測試階段）

🤖 指派Agent：
   • Ollama (本地) - ✅ 正常
   • Cursor (訂閱) - ⏳ 待命
   • CoDEX (訂閱) - ⏳ 待命

📝 任務狀態：
   • 進行中：1個（GitHub Skill 測試）
   • 已就緒：5個（等待執行）
   • 今日完成：12個

⚠️ 異常：0個

✅ 健康度：100%
```

---

## 🔧 監控工具

### 手動檢查指令
```bash
# 快速健康檢查
./scripts/health-check.sh

# 任務板狀態
./scripts/task-board-api.sh list-tasks

# Agent 狀態
curl -s localhost:3011/health
curl -s localhost:11434/api/tags 2>/dev/null || echo "Ollama 未啟動"
```

### 自動化監控
- **Cron Job ID**: `01ef95a6-97ee-4536-a304-2152dd061164`
- **頻率**：每 5 分鐘
- **執行**：檢查所有 Agent 狀態並回報

---

## 💡 優化要點

1. **預防勝於治療**：監控發現問題，比等老蔡發現更快
2. **分級回報**：正常簡報、異常詳報，避免訊息疲勞
3. **自動化**：Cron Job + HEARTBEAT 雙重監控
4. **可追溯**：所有執行紀錄保存，方便事後分析

---

## 📚 相關檔案

- `HEARTBEAT.md` - 系統心跳檢查
- `NOW.md` - 當前執行狀態
- `memory/ollama-study-advanced-coding.md` - Ollama 學習筆記
