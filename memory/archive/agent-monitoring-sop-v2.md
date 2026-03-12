# Agent 指揮監控完整 SOP

> 版本：v2.0  
> 建立時間：2026-02-11  
> 執行者：Ollama 本地模型 (qwen3:8b)  
> 執行頻率：每 5 分鐘  
> 成本：完全免費（本地執行）

---

## 🎯 監控目標

確保 **所有被指派的 Agent 正常運作**，發現異常時：
1. 識別哪個 Agent 出問題
2. 判斷問題類型與嚴重程度
3. 執行對應處理流程
4. 通知指揮官（小蔡）或老蔡

---

## 👥 Agent 責任矩陣

| Agent | 類型 | 負責工作 | 異常檢測方式 | 自動修復 | 通知對象 |
|-------|------|---------|-------------|---------|---------|
| **小蔡 (我)** | 指揮官 | 任務指派、決策、協調 | sessions_list 活躍會話 | ❌ | 老蔡 |
| **Cursor Agent** | 訂閱制 | 程式碼開發、除錯 | `cursor --version` | ❌ | 小蔡 → 老蔡 |
| **CoDEX Agent** | 訂閱制 | 程式碼生成、CLI 操作 | `codex --version` | ❌ | 小蔡 → 老蔡 |
| **OpenClaw Gateway** | 本地服務 | 任務板 API、技能執行 | `localhost:3011/health` | ✅ 嘗試重啟 | 小蔡 |
| **Ollama (本地)** | 本地模型 | 背景學習、監控、簡單任務 | `localhost:11434/api/tags` | ✅ 嘗試重啟 | 小蔡 |
| **AutoExecutor** | 背景服務 | 自動執行任務板任務 | 任務執行紀錄時間戳 | ✅ 檢查輪詢間隔 | 小蔡 |

---

## 🚨 異常分級與處理流程

### Level 1: 警告（黃色）
**條件**：
- 任務執行時間 > 10 分鐘但 < 30 分鐘
- Agent 回應延遲 > 5 秒但 < 30 秒
- 連續 2 次執行失敗

**處理流程**：
1. Ollama 記錄警告到日誌
2. 繼續監控，每 2 分鐘檢查一次
3. **不通知**（避免訊息疲勞）

### Level 2: 異常（橙色）
**條件**：
- 任務執行時間 > 30 分鐘
- Agent 完全無回應 > 1 分鐘
- 連續 3 次以上執行失敗
- 任務板 API 無回應

**處理流程**：
1. Ollama 嘗試自動修復（見下方）
2. 記錄異常詳情
3. **通知小蔡**（Telegram）
4. 小蔡決定是否升級或通知老蔡

### Level 3: 嚴重（紅色）
**條件**：
- 多個 Agent 同時無回應
- 任務板資料庫連線失敗
- 系統資源耗盡（記憶體/磁碟）
- 核心服務崩潰

**處理流程**：
1. Ollama 立即記錄嚴重錯誤
2. **直接通知老蔡**（Telegram @gousmaaa）
3. 通知小蔡
4. 停止自動化操作，等待人工介入

---

## 🔧 自動修復流程

### OpenClaw Gateway 無回應
```bash
# 檢查流程
curl -s http://localhost:3011/health

# 如果失敗，嘗試修復
echo "嘗試重啟 OpenClaw Gateway..."
openclaw gateway restart

# 等待 10 秒
sleep 10

# 再次檢查
if curl -s http://localhost:3011/health | grep -q "ok"; then
    echo "✅ Gateway 已恢復"
else
    echo "❌ Gateway 無法恢復，需要人工介入"
fi
```

### Ollama 本地模型無回應
```bash
# 檢查流程
curl -s http://localhost:11434/api/tags

# 如果失敗，嘗試修復
echo "嘗試重啟 Ollama..."
ollama stop qwen3 2>/dev/null
sleep 2
ollama run qwen3 &

# 等待 15 秒
sleep 15

# 再次檢查
if curl -s http://localhost:11434/api/tags | grep -q "qwen3"; then
    echo "✅ Ollama 已恢復"
else
    echo "❌ Ollama 無法恢復，需要人工介入"
fi
```

### 任務卡住處理
```bash
# 取得卡住任務 ID
curl -s http://localhost:3011/api/tasks?status=running | jq '.tasks[] | select(.updatedAt < "'$(date -v-30M +%Y-%m-%dT%H:%M:%S)'") | .id'

# 標記為失敗並重新排程
curl -X PATCH http://localhost:3011/api/tasks/{id}/progress \
  -H "Content-Type: application/json" \
  -d '{"status":"failed","error":"Timeout: Task stuck for >30min"}'
```

---

## 📊 監控檢查清單（Ollama 每 5 分鐘執行）

### Step 1: 指揮官狀態
- [ ] 檢查小蔡活躍會話：`sessions_list --activeMinutes 10`
- [ ] 確認指揮官在線：至少 1 個活躍會話
- [ ] 記錄指揮官狀態：運作中 / 閒置

### Step 2: 服務健康檢查
- [ ] OpenClaw Gateway：`curl localhost:3011/health`
- [ ] Ollama API：`curl localhost:11434/api/tags`
- [ ] 任務板 API：`curl localhost:3011/api/tasks?limit=1`

### Step 3: 進行中任務檢查
- [ ] 取得所有 running 狀態任務
- [ ] 檢查每個任務的 `updatedAt` 時間戳
- [ ] 計算執行時間：現在時間 - updatedAt
- [ ] 標記卡住任務（> 10 分鐘警告，> 30 分鐘異常）

### Step 4: Agent 命令可用性
- [ ] Cursor：`which cursor && cursor --version`
- [ ] CoDEX：`which codex && codex --version`
- [ ] Node.js：`node --version`
- [ ] npm：`npm --version`

### Step 5: 資源檢查
- [ ] 磁碟空間：`df -h /`（> 80% 警告）
- [ ] 記憶體使用：`vm_stat` 或 `free -m`
- [ ] CPU 負載：`uptime`

### Step 6: 生成報告
- [ ] 統計正常 Agent 數量
- [ ] 統計異常 Agent 數量
- [ ] 列出卡住任務（如有）
- [ ] 決定通知對象（無異常→不通知，L2→小蔡，L3→老蔡）

---

## 📨 通知模板

### Level 2 通知（給小蔡）
```
🚨 Agent 異常報告 [時間]

⚠️ 檢測到異常：
• Agent: {agent_name}
• 問題: {issue_description}
• 持續時間: {duration}
• 影響任務: {task_name}

🔧 自動修復嘗試: {success/failed}

建議處理：
{recommended_action}
```

### Level 3 通知（給老蔡）
```
🚨🚨 嚴重系統異常 [時間]

多個 Agent 同時離線：
• {agent_1}: {status}
• {agent_2}: {status}
• {agent_3}: {status}

影響範圍：
• 進行中任務: {count} 個
• 等待執行: {count} 個

⚠️ 需要立即人工介入！

建議：
1. 檢查系統資源
2. 重啟相關服務
3. 檢查網路連線
```

---

## 📝 日誌記錄

### 日誌位置
```
/tmp/agent-monitor.log          # 監控腳本日誌
/tmp/agent-monitor-errors.log   # 錯誤日誌
/tmp/agent-monitor-actions.log  # 自動修復動作
```

### 日誌格式
```
[2026-02-11 21:45:00] [INFO] 監控檢查開始
[2026-02-11 21:45:01] [INFO] Gateway: healthy
[2026-02-11 21:45:02] [INFO] Ollama: healthy
[2026-02-11 21:45:03] [WARN] 任務「視覺化工作流編輯器」已執行 360 分鐘
[2026-02-11 21:45:04] [ACTION] 嘗試標記任務為卡住狀態
[2026-02-11 21:45:05] [INFO] 監控檢查完成，健康度 95%
```

---

## 🔄 執行指令（Ollama 使用）

### 檢查任務板
```bash
# 健康檢查
curl -s http://localhost:3011/health | jq .

# 進行中任務
curl -s http://localhost:3011/api/tasks?status=running | jq '.tasks[] | {id, name, updatedAt, status}'

# 最近執行紀錄
curl -s http://localhost:3011/api/runs?limit=5 | jq '.runs[] | {id, taskId, status, createdAt}'
```

### 檢查 Agent 狀態
```bash
# Cursor
cursor --version 2>/dev/null && echo "Cursor: OK" || echo "Cursor: FAIL"

# CoDEX
codex --version 2>/dev/null && echo "CoDEX: OK" || echo "CoDEX: FAIL"

# Ollama
curl -s http://localhost:11434/api/tags | jq '.models[] | .name' | grep -q "qwen3" && echo "Ollama: OK" || echo "Ollama: FAIL"
```

### 修復指令
```bash
# 重啟 Gateway
openclaw gateway restart

# 重啟 Ollama
ollama stop qwen3 2>/dev/null; sleep 2; ollama run qwen3 &

# 標記卡住任務
TASK_ID="task-id-here"
curl -X PATCH http://localhost:3011/api/tasks/$TASK_ID/progress \
  -H "Content-Type: application/json" \
  -d '{"status":"failed","error":"Auto-detected: stuck >30min"}'
```

---

## ✅ Ollama 執行確認

作為本地監控 Agent，我需要確認：

1. **每 5 分鐘執行**檢查清單（Step 1-6）
2. **發現異常時**，先嘗試自動修復
3. **修復失敗或 Level 3**，立即通知對應對象
4. **記錄所有動作**到日誌檔案
5. **無異常時保持安靜**（避免訊息疲勞）

我的監管範圍：
- ✅ 小蔡（指揮官）狀態
- ✅ Cursor Agent
- ✅ CoDEX Agent
- ✅ OpenClaw Gateway
- ✅ Ollama 本地模型
- ✅ AutoExecutor
- ✅ 任務板健康
- ✅ 系統資源

我會盡責監控，有問題會馬上回報！🫡
