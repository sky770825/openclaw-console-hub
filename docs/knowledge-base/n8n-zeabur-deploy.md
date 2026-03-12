# Zeabur 雲端部署 n8n 完整指南

> 一鍵部署、$5/月、無限制執行次數  
> 收集日期：2026-02-15

---

## 1. 什麼是 Zeabur？

**Zeabur** 是一個專為開發者設計的雲端部署平台，特別針對 **n8n 優化**，提供：

| 特性 | 說明 |
|------|------|
| **一鍵部署** | 無需設定伺服器，3 分鐘完成 |
| **按需計費** | 約 $5/月（小專案幾乎免費）|
| **無限制** | 無 workflow 執行次數限制 |
| **自動擴展** | 根據流量自動調整資源 |
| **免費域名** | 自動生成 SSL 加密域名 |

### 1.1 部署方式比較

| 方式 | 價格 | 執行限制 | 技術門檻 | 適合 |
|------|------|----------|----------|------|
| **n8n Cloud 官方** | €24/月 | 2,500 次 | 無 | 企業用戶 |
| **自架 (Docker)** | $5-10/月 | 無限制 | 高 | 技術人員 |
| **Zeabur ⭐** | ~$5/月 | 無限制 | 低 | **推薦！** |

---

## 2. Zeabur 部署步驟（5 分鐘完成）

### Step 1: 註冊 Zeabur 帳號

1. 前往 [Zeabur 官網](https://zeabur.com)
2. 點擊「Sign Up」註冊（支援 GitHub/Google 登入）
3. 選擇 **Developer Plan**（按需計費）

💡 **優惠**：使用推薦連結註冊，可獲得 $5 抵用金（約等於第一個月免費）

### Step 2: 建立專案

1. 進入 [Dashboard](https://dash.zeabur.com/projects)
2. 點擊「Create Project」
3. 選擇部署區域（建議選離你最近的，如 Singapore/Tokyo）

### Step 3: 一鍵部署 n8n

1. 在專案中點擊「Add new service」
2. 選擇「Marketplace」
3. 搜尋「n8n」，選擇 **n8n (JP88UN)** 模板
4. 點擊部署，等待 1-2 分鐘

```
部署狀態：
Building → Deploying → Live ✅
```

### Step 4: 綁定域名

1. 點擊左側「n8n」服務
2. 進入「Networking」分頁
3. 選擇：
   - **Zeabur 免費子域名**（如 `your-n8n.zeabur.app`）
   - 或綁定自己的域名

### Step 5: 初始化設定

1. 點擊域名進入 n8n
2. 建立管理員帳號
3. 完成！開始建立工作流

---

## 3. 進階設定

### 3.1 解鎖付費功能（免費）

Zeabur 部署的 n8n 可以免費解鎖以下付費功能：

1. 進入 n8n「Settings」→「Usage and plan」
2. 點擊「Unlock」
3. 輸入 Email 接收驗證碼
4. 完成驗證

**解鎖功能：**
- ✅ Workflow History（24 小時歷史還原）
- ✅ Advanced Debugging（進階除錯）
- ✅ Execution Search（執行記錄搜尋）
- ✅ Folders（工作流資料夾管理）

### 3.2 設定環境變數

在 Zeabur 控制台設定以下環境變數：

```bash
# 基礎設定
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password

# 時區
GENERIC_TIMEZONE=Asia/Taipei
TZ=Asia/Taipei

# Webhook URL（填你的域名）
WEBHOOK_URL=https://your-n8n.zeabur.app/

# API Keys（選填）
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=...
```

設定路徑：`Service → Variables → Add Variable`

### 3.3 連接 PostgreSQL（推薦）

Zeabur 也提供一鍵部署 PostgreSQL：

1. Marketplace 搜尋「PostgreSQL」
2. 一鍵部署
3. 複製 Connection String
4. 在 n8n 設定 `DB_TYPE=postgresdb` 和相關連線資訊

---

## 4. Zeabur 費用估算

### 4.1 Developer Plan 計費

| 資源 | 單價 | 小專案用量 | 月費估算 |
|------|------|------------|----------|
| vCPU | $0.0005/秒 | 10% 使用率 | ~$1.5 |
| 記憶體 | $0.0005/秒 | 512MB | ~$1.5 |
| 流量 | $0.1/GB | 10GB | ~$1 |
| **總計** | - | - | **~$4-6/月** |

### 4.2 省錢技巧

- **閒時休眠**：設定 Auto-sleep（無流量時自動休眠）
- **資源限制**：設定 CPU/Memory 上限
- **監控用量**：在 Dashboard 查看即時用量

---

## 5. 與其他平台比較

### 5.1 Zeabur vs Railway

| 項目 | Zeabur | Railway |
|------|--------|---------|
| **n8n 優化** | ⭐⭐⭐⭐⭐ 專屬模板 | ⭐⭐⭐ 需手動設定 |
| **價格** | ~$5/月 | ~$5-10/月 |
| **使用難度** | 極簡 | 中等 |
| **地區** | 亞洲優化 | 歐美為主 |

### 5.2 Zeabur vs Render

| 項目 | Zeabur | Render |
|------|--------|--------|
| **免費方案** | 有（$5 額度） | 有（休眠限制）|
| **n8n 支援** | 一鍵部署 | 需 Docker 設定 |
| **磁碟** | 自動擴展 | 固定 1GB |

### 5.3 Zeabur vs Fly.io

| 項目 | Zeabur | Fly.io |
|------|--------|--------|
| **上手難度** | 簡單 | 中等 |
| **CLI 需求** | 無需 | 需要 |
| **適合** | 快速部署 | 精細控制 |

---

## 6. 常見問題

### Q1: Zeabur 穩定嗎？
**A:** n8n 在 Zeabur 上已超過 13,000 次部署，穩定性經過驗證。平台提供自動重啟和健康檢查。

### Q2: 資料會遺失嗎？
**A:** 建議定期匯出工作流備份（Settings → Export）。也可搭配 Zeabur 的 Volume 儲存實現持久化。

### Q3: 可以連接其他服務嗎？
**A:** 可以！Zeabur 支援部署 PostgreSQL、Redis、MinIO 等，並自動建立內部網路連線。

### Q4: 如何備份？
**A:** 
1. n8n 內建：Settings → Export（匯出工作流）
2. Zeabur CLI：可匯出完整服務設定

### Q5: 有中文介面嗎？
**A:** Zeabur 控制台支援中文，n8n 目前為英文介面。

---

## 7. 快速檢查清單

部署前確認：
- [ ] 已註冊 Zeabur 帳號
- [ ] 選擇 Developer Plan
- [ ] 選擇鄰近地區（Tokyo/Singapore）

部署後確認：
- [ ] 服務狀態顯示 "Live"
- [ ] 域名可正常存取
- [ ] 已建立管理員帳號
- [ ] 已設定環境變數（如需要）
- [ ] 已解鎖付費功能

---

## 8. 參考資源

- [Zeabur n8n 部署教學（圖文）](https://document.zeabur.app/en/n8n-setup)
- [Zeabur n8n Template](https://zeabur.com/templates/JP88UN)
- [n8n v2 with Worker Template](https://zeabur.com/templates/6LRV95)
- [YouTube 教學影片](https://www.youtube.com/watch?v=Vx1jQ89jSko)
- [n8nCoder 部落格](https://n8ncoder.com/blog/self-host-n8n-on-zeabur)

---

*最後更新：2026-02-15*
