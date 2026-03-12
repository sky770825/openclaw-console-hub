# n8n AI Agent 自動串接模式

> AI Agent 工作流自動化與工具整合指南  
> 收集日期：2026-02-15

---

## 1. AI Agent 自動串接架構

### 1.1 核心概念：AI Agent 是什麼？

| 特性 | 傳統 LLM | AI Agent |
|------|----------|----------|
| **核心能力** | 文本生成 | 目標導向任務完成 |
| **決策能力** | 無 | 是（多步驟推理） |
| **使用工具/API** | 否 | 是 |
| **工作流複雜度** | 單一步驟 | 多步驟 |
| **範圍** | 生成語言 | 執行複雜真實世界任務 |

**AI Agent** = LLM + 工具使用 + 決策能力 + 記憶

### 1.2 n8n AI Agent 節點架構

```
[Chat Trigger] → [AI Agent] → [Chat Model]
                    ↓
              [Tools / Memory]
```

**AI Agent 節點連接：**
- **Chat Model**（必須）：OpenAI、DeepSeek、Gemini、Groq、Azure
- **Memory**（可選）：Simple Memory、Window Buffer Memory
- **Tools**（可選）：Wikipedia、SerpAPI、自訂工具、HTTP 請求

---

## 2. 自動串接模式

### 2.1 模式一：Chat 觸發自動化

```
[Chat Trigger] → [AI Agent + LLM] → [執行動作] → [回應用戶]
```

**使用場景：**
- 客服機器人
- 內部查詢助手
- 自動化指令執行

**步驟：**
1. 添加 **Chat Trigger** 節點
2. 連接 **AI Agent** 節點
3. 配置 **Chat Model**（OpenAI GPT-4/GPT-4o-mini）
4. 設置 System Message 定義 Agent 角色
5. 添加 **Memory** 保持對話上下文

### 2.2 模式二：Tool-Calling 自動串接

```
[觸發器] → [AI Agent] → [判斷使用工具] → [執行工具] → [返回結果]
              ↓
        [Tool 1] [Tool 2] [Tool 3]
```

**可用工具類型：**

| 工具 | 用途 | 範例 |
|------|------|------|
| **Call n8n Workflow Tool** | 調用其他 n8n 工作流 | 複雜業務邏輯 |
| **Custom Code Tool** | 執行自定義程式碼 | 資料處理 |
| **HTTP Request Tool** | 呼叫外部 API | 第三方服務 |
| **Wikipedia Tool** | 搜尋維基百科 | 知識查詢 |
| **SerpAPI Tool** | Google 搜尋 | 網路搜尋 |

### 2.3 模式三：多 Agent 協作（進階）

```
[主 Agent] ←→ [子 Agent 1: 資料查詢]
      ↓
[子 Agent 2: 內容生成]
      ↓
[子 Agent 3: 發送通知]
```

**實現方式：**
- 使用 **Call n8n Workflow Tool** 調用其他 AI Agent 工作流
- 每個子 Agent 專注單一任務
- 主 Agent 負責協調與決策

---

## 3. LangChain 整合

### 3.1 n8n 與 LangChain 關係

n8n 的 AI 功能 **基於 LangChain** 構建，提供：
- 可配置的 Agent、LLM、Memory、Tools
- 與其他 n8n 節點整合（400+ 整合）
- 視覺化工作流設計

### 3.2 Cluster Nodes 架構

```
Root Node（根節點）
    └── Sub Nodes（子節點）
        ├── Chat Model
        ├── Memory
        ├── Tools
        └── Output Parser
```

**Root Nodes（根節點）：**
- AI Agent Node
- Agent Node
- Chain LLM Node

**Sub Nodes（子節點）：**
- Language Models（OpenAI、DeepSeek、Gemini 等）
- Memory（Simple Memory、Buffer Window Memory）
- Tools（各種工具節點）
- Output Parsers

---

## 4. 自動串接範例

### 範例 1：智慧客服 Agent

```
[Chat Trigger]
      ↓
[AI Agent] ← System: "你是客服助手，可查詢訂單狀態和處理退貨"
      ↓
[Tools]
├── HTTP Request Tool → 查詢訂單 API
├── Code Tool → 格式化訂單資料
└── Workflow Tool → 啟動退貨流程
```

### 範例 2：資料分析 Agent

```
[Schedule Trigger: 每天 9:00]
      ↓
[AI Agent] ← System: "分析昨日銷售數據並生成報告"
      ↓
[Tools]
├── HTTP Tool → 抓取銷售數據
├── Code Tool → 計算 KPI
└── Workflow Tool → 發送郵件報告
```

### 範例 3：OpenClaw 整合 Agent

```
[Webhook Trigger: OpenClaw 發送任務]
      ↓
[AI Agent] ← System: "理解任務並執行對應工作流"
      ↓
[Tools]
├── Workflow Tool → 執行資料處理
├── HTTP Tool → 回傳結果給 OpenClaw
└── Telegram Tool → 發送通知
```

---

## 5. AI Agent 配置詳解

### 5.1 Chat Trigger 配置

| 參數 | 說明 | 範例 |
|------|------|------|
| **Mode** | 運作模式 | Webhook、Polling |
| **Path** | Webhook 路徑 | `/chat` |
| **Response Mode** | 回應模式 | Last Node、Immediately |

### 5.2 AI Agent 配置

| 選項 | 說明 | 建議值 |
|------|------|--------|
| **Agent Type** | Agent 類型 | ReAct、Plan and Execute |
| **Prompt** | 系統提示詞 | 定義 Agent 角色和能力 |
| **Options** | 額外選項 | System Message、Max Iterations |

### 5.3 Memory 配置

| Memory 類型 | 用途 | 建議 |
|-------------|------|------|
| **Simple Memory** | 基礎對話記憶 | 單一用戶對話 |
| **Buffer Window Memory** | 滑動窗口記憶 | 長對話優化 |
| **Vector Store Memory** | 語義記憶 | 需要長期記憶時 |

---

## 6. 實戰步驟：建立自動串接 Agent

### Step 1: 建立基礎工作流

1. 創建新工作流
2. 添加 **Chat Trigger** 節點
3. 添加 **AI Agent** 節點並連接

### Step 2: 配置 Chat Model

1. 點擊 AI Agent 下方的 **+**（Chat Model）
2. 選擇 **OpenAI Chat Model**
3. 設置 Credentials（API Key）
4. 選擇模型（gpt-4o-mini 為基礎帳號預設）

### Step 3: 定義 System Message

在 AI Agent → Options → Add Option → **System Message**：

```
你是一個自動化助手，可以：
1. 查詢資料庫資訊
2. 發送通知
3. 執行預設工作流

請根據用戶需求選擇適當的工具執行。
```

### Step 4: 添加記憶

1. 點擊 AI Agent 下方的 **Memory** 連接
2. 選擇 **Simple Memory**
3. 設置 Context Window（建議 5-10 輪對話）

### Step 5: 添加工具

1. 點擊 AI Agent 下方的 **Tool** 連接
2. 選擇需要的工具：
   - **HTTP Request Tool**：呼叫 API
   - **Workflow Tool**：調用其他工作流
   - **Code Tool**：執行程式碼

### Step 6: 測試與調試

1. 點擊 **Chat** 按鈕開啟測試對話框
2. 輸入測試訊息
3. 查看右側 **Logs** 了解 Agent 決策過程
4. 調整 System Message 和 Tools 配置

---

## 7. 進階技巧

### 7.1 $fromAI() 函數

讓 AI 動態指定工具參數：

```javascript
// HTTP Request Tool 的 URL 參數
https://api.example.com/{{$fromAI("endpoint")}}

// 讓 AI 根據上下文決定 endpoint 值
```

### 7.2 條件觸發

使用 **IF 節點** 在 Agent 前過濾請求：

```
[Chat Trigger] → [IF: 檢查權限] → [AI Agent]
                      ↓ false
                [回覆：無權限]
```

### 7.3 錯誤處理

添加 **Error Trigger** 和 **No Operation** 節點：

```
[AI Agent] → [執行工具]
    ↓ error
[Error Trigger] → [發送告警]
```

---

## 8. 與 OpenClaw 整合方案

### 8.1 OpenClaw → n8n

```bash
# OpenClaw 發送任務到 n8n
curl -X POST "https://n8n.yourdomain.com/webhook/openclaw-task" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "main",
    "task": "生成每日報告",
    "context": {...}
  }'
```

**n8n 工作流：**
1. **Webhook Trigger** 接收 OpenClaw 請求
2. **AI Agent** 解析任務
3. **Tools** 執行對應操作
4. **HTTP Request** 回傳結果

### 8.2 n8n → OpenClaw

```javascript
// HTTP Request Node 配置
{
  "url": "http://localhost:18789/api/v1/sessions/send",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "sessionKey": "{{$json.session_id}}",
    "message": "【n8n Agent】任務完成：{{$json.result}}"
  }
}
```

---

## 9. 資源與參考

### 官方資源
- 📚 [AI Tutorial](https://docs.n8n.io/advanced-ai/intro-tutorial/)
- 🤖 [AI Examples](https://docs.n8n.io/advanced-ai/examples/introduction/)
- 🔧 [Tool Concepts](https://docs.n8n.io/advanced-ai/examples/understand-tools/)
- 🧠 [LangChain in n8n](https://docs.n8n.io/advanced-ai/langchain/overview/)

### 範本庫
- [AI Workflows](https://n8n.io/workflows/?categories=25)

---

*最後更新：2026-02-15*
