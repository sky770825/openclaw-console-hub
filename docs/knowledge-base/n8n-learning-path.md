# n8n 教學流程與學習路徑

> 從入門到精通：系統化學習 n8n 的完整指南  
> 收集日期：2026-02-15

---

## 1. 學習路徑總覽

```
Level 1: 基礎入門 (1-2 天)
    ↓
Level 2: 核心概念 (2-3 天)
    ↓
Level 3: 進階功能 (3-5 天)
    ↓
Level 4: AI 整合 (3-5 天)
    ↓
Level 5: 生產部署 (持續)
```

---

## 2. Level 1: 基礎入門

### 2.1 認識 n8n

**學習目標：**
- 了解 n8n 是什麼、能做什麼
- 理解 Workflow 基本概念
- 完成第一次部署

**學習內容：**

| 主題 | 時間 | 資源 |
|------|------|------|
| n8n 介紹與應用場景 | 30 分鐘 | 官方文件 |
| 部署第一個 n8n | 1 小時 | Docker 快速啟動 |
| 界面導覽 | 30 分鐘 | 實際操作 |

**實作練習：**
1. 使用 Docker 啟動 n8n
2. 瀏覽界面，了解各區塊功能
3. 查看官方範本庫

### 2.2 第一個工作流

**目標：** 建立「定時發送 HTTP 請求」工作流

**步驟：**
1. 添加 **Schedule Trigger** 節點
   - 設置每 5 分鐘執行一次
2. 添加 **HTTP Request** 節點
   - URL: `https://httpbin.org/get`
   - Method: GET
3. 連接兩個節點
4. 點擊「Execute Workflow」測試
5. 查看執行結果

**學習重點：**
- Trigger 節點是工作流的起點
- 節點之間透過連線傳遞資料
- 可以手動執行測試

---

## 3. Level 2: 核心概念

### 3.1 節點類型

| 節點類型 | 用途 | 範例 |
|----------|------|------|
| **Trigger** | 觸發工作流 | Schedule, Webhook, Manual |
| **Action** | 執行操作 | HTTP Request, Email, Database |
| **Logic** | 控制流程 | IF, Switch, Merge, Code |
| **Data** | 資料處理 | Set, Function, Aggregate |

### 3.2 資料流概念

```
[節點 A] → [資料輸出] → [節點 B] → [資料輸出] → [節點 C]
```

**資料格式：**
```json
{
  "json": {
    "key": "value",
    "number": 123
  },
  "binary": {}
}
```

**學習練習：**
1. 使用 **Set** 節點建立固定資料
2. 使用 **Function** 節點處理資料
3. 使用 **IF** 節點進行條件分支

### 3.3 常用節點深入

#### HTTP Request 節點

```
Configuration:
├── Method: GET/POST/PUT/DELETE
├── URL: API 端點
├── Authentication: 認證方式
├── Headers: 請求標頭
├── Body: 請求內容
└── Options: 進階選項
```

#### Code 節點（Function）

```javascript
// 取得所有輸入
const items = $input.all();

// 處理資料
const results = items.map(item => {
  return {
    json: {
      newField: item.json.oldField.toUpperCase(),
      timestamp: new Date().toISOString()
    }
  };
});

// 返回結果
return results;
```

#### IF 節點（條件分支）

```
條件：{{ $json.status == "success" }}
    ↓ true        ↓ false
[成功處理]    [失敗處理]
```

### 3.4 實戰練習

**練習 1：天氣通知機器人**
1. Schedule Trigger：每天早上 8 點
2. HTTP Request：呼叫天氣 API
3. Code：格式化天氣資訊
4. Telegram/Email：發送通知

**練習 2：表單資料處理**
1. Webhook Trigger：接收表單提交
2. Set：資料清理與驗證
3. IF：檢查必填欄位
4. PostgreSQL：儲存到資料庫
5. Email：發送確認信

---

## 4. Level 3: 進階功能

### 4.1 錯誤處理

```
[主要流程]
    ↓ error
[Error Trigger]
    ↓
[發送告警]
```

**Error Trigger 配置：**
- 捕捉工作流執行錯誤
- 發送通知到 Slack/Email
- 記錄錯誤日誌

### 4.2 分支與合併

```
        ┌→ [分支 A] ─┐
[觸發] ─┤            ├→ [合併] → [後續處理]
        └→ [分支 B] ─┘
```

**使用場景：**
- 並行處理多個 API
- 同時查詢多個資料來源
- 資料比對與整合

### 4.3 迴圈處理

```javascript
// Split In Batches 節點
// 將大量資料分批處理

[大量資料] → [Split In Batches] → [逐筆處理] → [Loop Back]
                                              ↓
                                         [完成]
```

### 4.4 憑證管理

**Credentials 類型：**
- API Key
- OAuth2
- Basic Auth
- JWT

**最佳實踐：**
- 集中管理所有憑證
- 使用環境變數存儲敏感資訊
- 定期輪替 API Key

### 4.5 執行與除錯

| 功能 | 用途 |
|------|------|
| **Execute Node** | 單獨測試某個節點 |
| **Execute Workflow** | 執行整個工作流 |
| **Executions List** | 查看歷史執行記錄 |
| **Pin Data** | 固定節點輸出，方便測試 |
| **Debug** | 查看資料流詳情 |

---

## 5. Level 4: AI 整合

### 5.1 AI Agent 基礎

**學習目標：**
- 理解 AI Agent vs 傳統 LLM
- 建立第一個 AI 工作流
- 使用 Tools 擴展 Agent 能力

**實作步驟：**

1. **建立 AI Chat Agent**
   - Chat Trigger
   - AI Agent 節點
   - OpenAI Chat Model
   - Memory（對話記憶）

2. **添加 Tools**
   - HTTP Request Tool
   - Workflow Tool
   - Custom Code Tool

### 5.2 AI 工作流範例

**範例 1：智慧客服**
```
[用戶訊息] → [AI Agent] → [判斷意圖]
                ↓
    ┌──────────┼──────────┐
    ↓          ↓          ↓
[查詢訂單]  [退貨處理]  [常見問題]
    ↓          ↓          ↓
[返回結果] ← [AI 生成回覆]
```

**範例 2：資料分析助手**
```
[用戶請求] → [AI Agent] → [解析需求]
                ↓
        [呼叫對應工具]
                ↓
    ┌──────────┼──────────┐
    ↓          ↓          ↓
[查詢資料]  [計算指標]  [生成圖表]
    ↓          ↓          ↓
[AI 分析結果] → [生成報告]
```

### 5.3 LangChain 概念

| 概念 | 說明 |
|------|------|
| **LLM** | 大型語言模型（GPT、Claude 等） |
| **Agent** | 能使用工具的 LLM |
| **Memory** | 對話歷史記憶 |
| **Tools** | Agent 可使用的功能 |
| **Chains** | 多步驟 LLM 流程 |

### 5.4 進階 AI 功能

- **Vector Store**：語義搜尋
- **Embeddings**：文本向量化
- **Document Loader**：文件處理
- **Text Splitter**：長文本分割

---

## 6. Level 5: 生產部署

### 6.1 部署策略

| 環境 | 配置 | 用途 |
|------|------|------|
| **Development** | SQLite、本地 Docker | 開發測試 |
| **Staging** | PostgreSQL、雲端伺服器 | 預發布測試 |
| **Production** | PostgreSQL + Redis、高可用 | 正式環境 |

### 6.2 監控與維護

**需要監控的指標：**
- 工作流執行成功率
- 執行時間趨勢
- 資源使用率（CPU/記憶體）
- 錯誤日誌

**維護任務：**
- 定期備份工作流
- 清理舊執行記錄
- 更新 n8n 版本
- 檢查憑證有效性

### 6.3 效能優化

```yaml
# docker-compose.yml 優化配置
environment:
  # 啟用資料清理
  - EXECUTIONS_DATA_PRUNE=true
  - EXECUTIONS_DATA_MAX_AGE=30
  
  # 調整執行設定
  - EXECUTIONS_MODE=regular
  - EXECUTIONS_TIMEOUT=300
  
  # 使用 PostgreSQL
  - DB_TYPE=postgresdb
```

---

## 7. 推薦學習資源

### 7.1 官方資源

| 資源 | 連結 | 用途 |
|------|------|------|
| 官方文件 | docs.n8n.io | 最權威參考 |
| 學習路徑 | docs.n8n.io/learning-path | 系統學習 |
| 範本庫 | n8n.io/workflows | 參考範例 |
| YouTube 頻道 | n8n official | 影片教學 |

### 7.2 社群資源

- **Discord 社群**：即時問答
- **論壇**：community.n8n.io
- **GitHub**：範例程式碼

### 7.3 書籍與課程

- n8n 官方教學影片
- Udemy n8n 課程
- YouTube 實戰教學

---

## 8. 實戰專案建議

### 專案 1：自動化行銷流程
- 接收潛在客戶表單
- 自動發送歡迎信
- CRM 資料同步
- 後續跟進提醒

### 專案 2：資料整合平台
- 多個資料來源整合
- 自動化 ETL 流程
- 報告生成與發送

### 專案 3：AI 客服系統
- 常見問題自動回答
- 複雜問題轉人工
- 對話記錄分析

### 專案 4：監控告警系統
- 系統指標監控
- 異常自動告警
- 自動化故障處理

---

## 9. 常見問題 FAQ

### Q1: n8n Cloud 還是 Self-hosted？
**A:** 初學者建議 Cloud，快速開始；生產環境建議 Self-hosted，完全控制。

### Q2: 需要會寫程式嗎？
**A:** 基本使用不需要，但進階功能（Code 節點、Custom Tool）需要 JavaScript。

### Q3: 可以連接哪些服務？
**A:** 400+ 官方整合，幾乎涵蓋所有主流服務，也可使用 HTTP Request 連接任何 API。

### Q4: AI Agent 需要付費嗎？
**A:** n8n AI 功能免費，但需要 OpenAI 或其他 LLM 的 API Key（依使用量付費）。

### Q5: 生產環境推薦配置？
**A:** PostgreSQL + Docker Compose + HTTPS + 自動備份。

---

*最後更新：2026-02-15*
