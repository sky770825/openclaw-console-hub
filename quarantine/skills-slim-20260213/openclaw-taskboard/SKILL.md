---
name: openclaw-taskboard
version: 2.0.0
description: OpenClaw 任務板 - Agent 指揮中心。管理任務、調度 AI Agent（Cursor、CoDEX、OpenClaw）、編排工作流程、監控執行狀態。
author: 達爾
tags: [task-management, agent-orchestration, cursor, codex, workflow]
metadata:
  openclaw:
    always: true
    requires:
      env:
        - OPENCLAW_TASKBOARD_URL
    related_skills:
      - cursor-agent
      - agent-router
---

# 🤖 OpenClaw 任務板 - Agent 指揮中心

讓任務板不只是記事本，而是能指揮多個 AI Agent 的智慧中樞。

---

## 🎯 核心概念

```
主人（指揮官）
    ↓
OpenClaw 任務板（參謀部）
    ↓
    ├─→ Cursor Agent（執行代碼任務）
    ├─→ CoDEX（執行複雜開發）
    ├─→ OpenClaw（執行本機操作）
    └─→ 子任務分解 → 繼續分配
```

---

## 📋 任務類型（新增）

| 類型 | 說明 | 執行者 |
|------|------|--------|
| `basic` | 基本任務（人工執行） | 主人或達爾 |
| `cursor` | 程式開發任務 | Cursor Agent |
| `codex` | 複雜編碼/分析 | CoDEX CLI |
| `openclaw` | 本機操作/自動化 | OpenClaw |
| `composite` | 複合任務（多步驟） | 任務板自動拆解 |

---

## 🚀 快速指令

### 建立一般任務
```
建立任務：修復登入 bug，分類 bugfix
```

### 建立 Agent 任務（自動選擇最適合的 Agent）
```
指派任務：把這個專案改成 TypeScript，類型 cursor
用 Agent 執行：分析這個資料夾的程式碼品質
任務板，跑 codex：重構 utils.js
```

### 查詢與監控
```
任務狀態
t3 跑怎樣了？
所有 cursor 任務的進度
```

### 工作流程
```
建立工作流：
1. 先讓 cursor 分析程式碼
2. 然後建立測試
3. 最後 codex 重構
```

---

## 🔧 API 擴充規格

### 任務資料模型（v2）

```json
{
  "id": "t-{timestamp}",
  "title": "任務標題",
  "cat": "feature|bugfix|learn|improve|refactor|analyze",
  "status": "queued|running|paused|completed|failed|cancelled",
  "progress": 0-100,
  "agent": {
    "type": "cursor|codex|openclaw|auto",
    "config": {
      "model": "gpt-5|claude-opus-4-6",
      "approval": "auto|manual|suggest",
      "timeout": 300,
      "maxRetries": 2
    }
  },
  "workflow": {
    "dependsOn": ["t-001"],
    "next": ["t-003"],
    "parallel": false
  },
  "context": {
    "workingDir": "/path/to/project",
    "files": ["src/main.ts"],
    "env": {"API_KEY": "xxx"}
  },
  "execution": {
    "startedAt": "2026-02-10T12:00:00Z",
    "endedAt": null,
    "output": "",
    "error": null,
    "logs": []
  },
  "auto": false,
  "subs": [],
  "thought": "備註說明"
}
```

### API 端點

#### 1. 建立任務
```
POST {base}/api/openclaw/tasks
```

**Body (基本任務):**
```json
{
  "id": "t-001",
  "title": "修復登入 bug",
  "cat": "bugfix",
  "status": "queued",
  "agent": {"type": "auto"}
}
```

**Body (Agent 任務):**
```json
{
  "id": "t-002",
  "title": "重構 auth.js",
  "cat": "refactor",
  "agent": {
    "type": "cursor",
    "config": {
      "approval": "auto",
      "timeout": 600
    }
  },
  "context": {
    "workingDir": "~/project",
    "files": ["src/auth.js"]
  }
}
```

#### 2. 執行任務（智能調度）
```
POST {base}/api/openclaw/tasks/{taskId}/run
```

執行邏輯：
1. 檢查 `dependsOn` 任務是否完成
2. 根據 `agent.type` 選擇執行器
3. 啟動 Agent，監控輸出
4. 更新狀態與進度

#### 3. 批量執行工作流
```
POST {base}/api/openclaw/workflows/run
```

**Body:**
```json
{
  "name": "重構流程",
  "tasks": ["t-001", "t-002", "t-003"],
  "mode": "sequential|parallel|dependency"
}
```

#### 4. 獲取任務執行日誌
```
GET {base}/api/openclaw/tasks/{taskId}/logs
```

#### 5. 暫停/恢復任務
```
POST {base}/api/openclaw/tasks/{taskId}/pause
POST {base}/api/openclaw/tasks/{taskId}/resume
```

#### 6. 取消任務
```
POST {base}/api/openclaw/tasks/{taskId}/cancel
```

---

## 🤖 Agent 執行器實作

### Cursor Agent 執行器

```bash
# 基本執行
cd {workingDir} && agent -p '{prompt}' --output-format json

# 指定檔案上下文
cd {workingDir} && agent -p '分析 @src/auth.js 並重構' --output-format json

# 自動模式（無需確認）
cd {workingDir} && agent -p '{prompt}' --force --output-format json
```

**錯誤處理:**
- 若卡住超過 timeout → 自動取消，標記 failed
- 若需要人工確認 → 發送 Telegram 通知，標記 paused

### CoDEX 執行器

```bash
# 進入工作目錄執行
cd {workingDir} && codex '{prompt}' --approval-mode auto-suggest

# 或使用 exec 指令碼模式
cd {workingDir} && codex exec '{prompt}'
```

### OpenClaw 執行器

直接呼叫 OpenClaw API 或執行本地命令。

---

## 🛡️ 防卡關機制

| 機制 | 說明 |
|------|------|
| **超時控制** | 預設 5 分鐘，可配置。超時自動取消 |
| **重試機制** | 失敗自動重試 2 次，仍失敗才標記 failed |
| **降級策略** | 高階模型失敗時，自動降級到較穩定模型 |
| **人工介入** | 遇到需要確認時，發送通知暫停任務 |
| **資源限制** | 限制同時執行的 Agent 數量（預設 3 個） |

---

## 📊 執行狀態監控

任務板首頁應顯示：

```
┌─────────────────────────────────────┐
│ 任務板總覽                          │
├─────────────────────────────────────┤
│ 🔄 執行中: 2  |  ⏳ 排隊: 5         │
│ ✅ 完成: 12  |  ❌ 失敗: 1          │
├─────────────────────────────────────┤
│ Agent 狀態                          │
│ Cursor: 🟢 閒置                     │
│ CoDEX:  🟡 執行中 (t-008)           │
│ OpenClaw: 🟢 閒置                   │
└─────────────────────────────────────┘
```

---

## 💡 使用範例

### 範例 1：簡單程式任務
```
主人：「用 cursor 幫我分析這個資料夾的程式碼品質」

達爾：
1. 建立任務 t-015: "分析程式碼品質"
2. 設定 agent.type = "cursor"
3. 設定 context.workingDir = 當前資料夾
4. 執行任務
5. 回傳結果給主人
```

### 範例 2：複雜工作流程
```
主人：「重構這個專案，先分析再測試再重構」

達爾：
1. 建立工作流：
   - t-020: 分析現有程式碼 (cursor)
   - t-021: 建立測試檔案 (cursor, dependsOn: t-020)
   - t-022: 執行測試確保通過 (openclaw, dependsOn: t-021)
   - t-023: 重構主要程式碼 (codex, dependsOn: t-022)
2. 啟動工作流（依序執行）
3. 每步完成通知主人
```

### 範例 3：自動修復
```
主人：「這個測試失敗了，自動修復看看」

達爾：
1. 建立任務 t-025: "修復測試失敗"
2. 設定 agent.type = "cursor"
3. 設定 agent.config.approval = "suggest" (建議但等確認)
4. 執行並監控
5. 當 Cursor 提出修改時，發送 Telegram 通知主人確認
```

---

## 🔌 擴充規劃（未來）

- [ ] 支援更多 Agent（Claude Code、Aider、Devin）
- [ ] 視覺化工作流程編輯器
- [ ] 任務模板（常見模式一鍵建立）
- [ ] 執行歷史與效能分析
- [ ] 團隊協作（任務指派、評論）

---

## ⚡ 立即使用

只要說：
- 「**指派給 cursor**：[任務描述]」
- 「**用 codex 執行**：[任務描述]」
- 「**建立工作流**：[步驟描述]」
- 「**任務狀態**」查看所有進度

我會自動處理任務建立、Agent 選擇、執行監控和結果回報。
