# Agent Message Bus Protocol (AMBP)
## 多 Agent 訊息匯流排協議 v1.0

---

## 🎯 設計目標

- 讓 Cursor / CoDEX / OpenClaw / CellCog / Ollama 能夠互相通訊
- 標準化任務交接與結果回傳
- 減少人工複製貼上的需求
- 統一狀態追蹤與日誌記錄

---

## 📡 核心架構

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Message Bus                     │
│                   (訊息匯流排中心)                         │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│  Cursor  │  CoDEX   │ OpenClaw │ CellCog  │   Ollama   │
│  Agent   │  Agent   │  Agent   │  Agent   │   Local    │
└──────────┴──────────┴──────────┴──────────┴────────────┘
       ▲                                    ▲
       └──────────────┬─────────────────────┘
                      ▼
                ┌──────────┐
                │   主人    │
                │ (指揮官)  │
                └──────────┘
```

---

## 📋 訊息格式標準

### 基本訊息結構

```json
{
  "message_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "from": "agent:cursor:task-123",
  "to": "agent:codex:default",
  "type": "task_handoff",
  "priority": "high",
  "payload": {
    "task_id": "task-456",
    "context": {...},
    "deliverables": [...],
    "next_steps": [...]
  },
  "metadata": {
    "project": "openclaw-taskboard",
    "tags": ["frontend", "bugfix"],
    "estimated_time": "30m"
  }
}
```

### 訊息類型 (Message Types)

| 類型 | 用途 |
|------|------|
| `task_handoff` | 任務交接給另一個 Agent |
| `status_update` | 進度更新（每 5 分鐘或關鍵節點）|
| `completion` | 任務完成，交付結果 |
| `blocker` | 遇到阻礙，需要協助 |
| `query` | 查詢資訊或請求上下文 |
| `feedback` | 審核結果或修改建議 |
| `cancel` | 取消任務 |

---

## 🔄 任務交接流程

### 範例：Cursor → CoDEX → OpenClaw

```
Cursor 完成前端代碼
        │
        ▼
┌──────────────────┐
│ 1. 發送 completion │
│    訊息到 Bus      │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ 2. Bus 通知主人   │
│    「Cursor 完成」 │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ 3. 主人確認後     │
│    指派給 CoDEX   │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ 4. CoDEX 收到     │
│    task_handoff   │
│    包含完整上下文  │
└──────────────────┘
```

---

## 📁 儲存層設計

### 檔案結構

```
~/.openclaw/agent-bus/
├── messages/                    # 訊息佇列
│   ├── pending/                 # 待處理
│   ├── processing/              # 處理中
│   ├── completed/               # 已完成
│   └── archive/                 # 已歸檔
├── sessions/                    # Agent 會話狀態
│   ├── cursor-agent.json
│   ├── codex-agent.json
│   ├── openclaw-agent.json
│   └── cellcog-agent.json
├── handoffs/                    # 任務交接記錄
│   └── 2026-02-11/
│       └── handoff-001.json
└── logs/                        # 日誌
    └── bus-2026-02-11.log
```

### 訊息佇列機制

```python
# 簡化的訊息流程
1. Agent A 發送訊息 → 寫入 pending/{msg_id}.json
2. Bus 通知目標 Agent B
3. Agent B 確認接收 → 移動到 processing/{msg_id}.json
4. Agent B 處理完成 → 移動到 completed/{msg_id}.json
5. 定期歸檔（7天後）→ archive/
```

---

## 🔌 Agent 連接器規範

### 每個 Agent 需要實作

```python
class AgentConnector:
    def __init__(self, agent_id, bus_endpoint):
        self.agent_id = agent_id
        self.bus = bus_endpoint
    
    def send(self, to_agent, message_type, payload):
        """發送訊息到其他 Agent"""
        pass
    
    def receive(self):
        """接收給自己的訊息"""
        pass
    
    def update_status(self, task_id, status, progress):
        """更新任務狀態"""
        pass
    
    def handoff(self, to_agent, task_context):
        """交接任務給其他 Agent"""
        pass
```

### 各 Agent 連接方式

| Agent | 連接方式 | 狀態追蹤 |
|-------|---------|---------|
| **Cursor** | 監視工作目錄的 `.cursor-bus` 檔案 | `cursor-bus status` |
| **CoDEX** | 監視 `~/.codex/sessions/` 新檔案 | `codexmonitor` 工具 |
| **OpenClaw** | 內建 WebSocket / HTTP API | `sessions_list` + `sessions_send` |
| **CellCog** | Python SDK WebSocket | `client.create_chat()` + callback |
| **Ollama** | HTTP API 輪詢 | `ollama ps` 監控 |

---

## 🎮 實作範例：任務板整合

### 情境：任務自動流轉

```bash
# 任務狀態變更時觸發
./scripts/agent-bus.sh send \
  --from "taskboard" \
  --to "cursor-agent" \
  --type "task_assigned" \
  --payload '{
    "task_id": "task-123",
    "task_type": "debug",
    "context": {
      "error_log": "/path/to/error.log",
      "project_dir": "~/project",
      "priority": "high"
    }
  }'
```

### Cursor 完成後自動通知

```bash
# Cursor Agent 完成時執行
./scripts/agent-bus.sh send \
  --from "cursor-agent" \
  --to "taskboard" \
  --type "completion" \
  --payload '{
    "task_id": "task-123",
    "result": "success",
    "changes": [
      "src/components/TaskList.tsx",
      "src/hooks/useTaskDrag.ts"
    ],
    "summary": "修復拖曳功能，新增錯誤邊界處理"
  }'
```

---

## 🔐 安全與權限

### 權限級別

```yaml
agents:
  cursor-agent:
    permissions:
      - read:taskboard
      - write:taskboard
      - execute:local
    allowed_handoff_to: [codex-agent, openclaw-agent]
  
  codex-agent:
    permissions:
      - read:cursor-output
      - write:taskboard
    allowed_handoff_to: [openclaw-agent]
  
  openclaw-agent:
    permissions:
      - read:all
      - execute:tools
    allowed_handoff_to: [cursor-agent, codex-agent]
```

### 驗證機制

- 每個訊息帶有 HMAC 簽名
- Agent 註冊時取得 API Key
- 敏感操作需要主人確認（Human-in-the-loop）

---

## 📊 監控與日誌

### 儀表板資訊

```bash
./scripts/agent-bus.sh status
```

輸出：
```
🚌 Agent Message Bus Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active Agents:
  🟢 cursor-agent     (last ping: 2s ago)
  🟢 codex-agent      (last ping: 5s ago)
  🟢 openclaw-agent   (last ping: 1s ago)
  🟡 cellcog-agent    (last ping: 45s ago, processing...)

Message Queue:
  Pending:     3
  Processing:  2 (cursor:1, cellcog:1)
  Completed:   47

Active Handoffs:
  #48: cursor-agent → codex-agent (Task: frontend-fix)
  #49: taskboard → cellcog-agent (Task: research)

Today's Stats:
  Messages:    52
  Handoffs:    12
  Success Rate: 94%
```

---

## 🚀 實作步驟

### Phase 1: 基礎建設（1-2 天）
1. 建立 `~/.openclaw/agent-bus/` 目錄結構
2. 實作 `agent-bus.sh` CLI 工具
3. 建立訊息格式驗證器

### Phase 2: Agent 連接（2-3 天）
1. 為每個 Agent 實作連接器
2. 整合任務板 API
3. 建立狀態監控

### Phase 3: 自動化（3-5 天）
1. 實作自動任務流轉規則
2. 建立異常處理機制
3. 優化效能與可靠性

---

## 💡 立即行動

要我開始 **Phase 1** 嗎？建立基礎目錄結構和 CLI 工具？🔧
