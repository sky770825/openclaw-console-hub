# n8n 知識庫

> 工作流自動化平台完整指南  
> 收集日期：2026-02-15  
> 用途：自動串接參考

---

## 1. 什麼是 n8n？

**n8n**（發音為 n-eight-n）是一個 **fair-code 授權** 的工作流自動化工具，結合 AI 能力與業務流程自動化。

### 核心特性

| 特性 | 說明 |
|------|------|
| **可自訂** | 高度靈活的工作流 + 可自建自定義節點 |
| **方便部署** | npm、Docker 或 Cloud 託管 |
| **隱私優先** | 可自架（self-host）確保資料安全 |
| **AI 整合** | 內建 AI 功能和工作流能力 |
| **開源** | 免費社群版 + 企業版選項 |

---

## 2. 部署方式

### 2.1 n8n Cloud（雲端託管）
- **適合**：不想管理基礎設施的用戶
- **優點**：即開即用，免安裝
- **方案**：免費試用 + 多種付費方案

### 2.2 Self-hosted（自架）
- **適合**：需要完全控制、隱私要求高、專業用戶
- **要求**：需具備伺服器管理經驗

#### 安裝方式

**Docker（推薦）**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**npm**
```bash
npm install n8n -g
n8n
```

**伺服器部署指南**
- Docker Compose
- Kubernetes
- AWS/GCP/Azure
- Raspberry Pi

---

## 3. 核心概念：Workflow（工作流）

### 3.1 定義
**Workflow** 是連接在一起的節點（nodes）集合，用於自動化流程。

### 3.2 工作流組件

| 組件 | 功能 |
|------|------|
| **Trigger Nodes** | 觸發工作流（定時、Webhook、事件） |
| **Action Nodes** | 執行操作（發送郵件、呼叫 API） |
| **Logic Nodes** | 條件判斷、迴圈、分支 |
| **Data Nodes** | 資料轉換、過濾、映射 |

### 3.3 常用觸發器類型

- **Schedule Trigger**：定時執行
- **Webhook Trigger**：接收 HTTP 請求
- **Polling Trigger**：定期檢查更新
- **Event Trigger**：響應系統事件

---

## 4. 熱門整合（Integrations）

### 4.1 通訊工具
- Slack、Discord、Telegram、Microsoft Teams

### 4.2 雲端儲存
- Google Drive、Dropbox、AWS S3

### 4.3 資料庫
- PostgreSQL、MySQL、MongoDB、Redis

### 4.4 行銷/CRM
- HubSpot、Salesforce、Mailchimp

### 4.5 開發工具
- GitHub、GitLab、Jira、Linear

### 4.6 AI/ML
- OpenAI、Anthropic、LangChain

### 4.7 電商
- Shopify、WooCommerce、Stripe

### 4.8 社群媒體
- Twitter/X、LinkedIn、Facebook

---

## 5. AI 功能

### 5.1 AI Agent 工作流
- 建立 AI 驅動的聊天機器人
- 自動化決策流程
- 智慧資料處理

### 5.2 常用 AI 節點
- **OpenAI Chat Model**：GPT 整合
- **AI Agent**：多步驟推理
- **Vector Store**：語義搜尋
- **Embeddings**：文本向量化

### 5.3 使用場景
- 客戶支援自動回覆
- 文件摘要與分類
- 智慧數據提取

---

## 6. 常見使用場景

### 場景 1：客戶入職自動化
```
Stripe 付款完成 → 建立資料庫帳號 → 發送歡迎郵件 → Slack 通知團隊
```

### 場景 2：社群媒體自動化
```
部落格 RSS 更新 → 自動發佈到 Twitter + LinkedIn + Facebook
```

### 場景 3：資料同步
```
Google Sheets 更新 → 同步到 CRM → 發送通知
```

### 場景 4：監控告警
```
伺服器指標異常 → 發送 Telegram/Slack 告警 → 建立 Jira Ticket
```

### 場景 5：AI 內容生成
```
關鍵字輸入 → GPT 生成文章 → 發布到 WordPress → 推播到社群
```

---

## 7. 企業級功能

### 7.1 安全性
- 完全在地部署（air-gapped）
- SSO SAML / LDAP 整合
- 加密金鑰儲存
- 進階 RBAC 權限

### 7.2 效能
- Audit logs & log streaming
- 工作流歷史記錄
- 自訂變數
- 外部儲存支援

### 7.3 協作
- Git 版本控制
- 隔離環境（dev/staging/prod）
- 多用戶工作流
- 工作流分享

---

## 8. 授權與定價

### 8.1 免費版本
- **Cloud 免費試用**：試用期後需升級
- **自架社群版**：完全免費，無限制

### 8.2 付費版本
- **n8n Cloud Starter**：$20/月
- **n8n Cloud Pro**：$50/月
- **Enterprise Cloud**：客製化報價
- **Enterprise Self-hosted**：客製化報價

### 8.3 授權模式
- **Sustainable Use License**：fair-code 模式
- 可自由使用、修改
- 商業使用需遵守授權條款

---

## 9. 學習資源

### 9.1 官方資源
- 📚 [n8n Docs](https://docs.n8n.io/)
- 🎓 [Learning Path](https://docs.n8n.io/learning-path/)
- 🧪 [Quick Start](https://docs.n8n.io/try-it-out/)
- 💻 [GitHub](https://github.com/n8n-io/n8n)

### 9.2 教學推薦
- **初學者指南**：建議從 Quickstart 開始
- **AI 工作流**：Advanced AI 教學
- **範本庫**：Workflow Templates

### 9.3 社群
- Discord 社群
- 論壇討論
- GitHub Issues

---

## 10. 與 OpenClaw 整合思路

### 潛在整合點

| 功能 | 整合方式 |
|------|----------|
| **任務觸發** | OpenClaw Cron → n8n Webhook |
| **資料傳遞** | n8n → OpenClaw API |
| **通知橋接** | n8n → Telegram/Discord |
| **AI 工作流** | n8n AI Agent + OpenClaw |
| **監控告警** | n8n 監控 → OpenClaw 處理 |

### 架構範例
```
[外部事件] → [n8n 觸發] → [n8n 處理] → [OpenClaw API] → [達爾回應]
```

---

## 11. 快速開始命令

### Docker 一鍵啟動
```bash
# 基礎啟動
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 帶環境變數
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=password \
  n8nio/n8n
```

### npm 安裝
```bash
# 安裝
npm install n8n -g

# 啟動
n8n start

# 帶基本認證
n8n start --basic-auth
```

---

## 12. 參考連結

- 🌐 官網：https://n8n.io
- 📖 文件：https://docs.n8n.io
- 💻 GitHub：https://github.com/n8n-io/n8n
- ☁️ Cloud：https://n8n.io/cloud
- 💰 定價：https://n8n.io/pricing

---

*最後更新：2026-02-15*
