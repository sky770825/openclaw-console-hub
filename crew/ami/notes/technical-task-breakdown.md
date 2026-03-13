# 虛擬貨幣資訊網站：技術任務分解 (Technical Task Breakdown)

此文件基於《虛擬貨幣網站初步規劃》，將開發工作分解為具體的技術任務。

## 第一階段：基礎設施與後端設定 (Sprint 1)

### 1. 專案初始化與環境設定
- [ ] 初始化 Next.js 前端專案 (pnpm create next-app)
- [ ] 初始化 Node.js/Express 後端專案 (pnpm init, install express)
- [ ] 設定 Docker Compose，包含 Node.js, Next.js, PostgreSQL, Redis 服務
- [ ] 建立 Git repository，設定 main/develop 分支策略與 CI/CD pipeline (GitHub Actions)

### 2. 資料庫設計與建立
- [ ] 設計資料庫 Schema (ERD)
    - `users` (使用者資訊)
    - `coins` (貨幣基本資訊)
    - `coin_market_data` (市場數據，如價格、市值)
    - `user_portfolios` (使用者資產組合)
    - `user_watchlists` (使用者觀察清單)
- [ ] 使用 Prisma ORM 初始化並執行第一次資料庫遷移 (migration)

### 3. 後端核心 API - 使用者認證
- [ ] 實作使用者註冊 API (`/api/auth/register`)
- [ ] 實作使用者登入 API (`/api/auth/login`)，使用 JWT (JSON Web Tokens) 進行身份驗證
- [ ] 實作 JWT 驗證的 middleware，保護需要登入的路由
- [ ] 實作使用者個人資料讀取/更新 API (`/api/users/me`)

## 第二階段：核心數據與前端展示 (Sprint 2)

### 1. 後端 - 數據抓取與儲存
- [ ] 開發 CoinGecko API 的 client module
- [ ] 建立排程任務 (e.g., node-cron)，定時從 CoinGecko 拉取全球市場數據並存入 Redis 快取
- [ ] 建立排程任務，定時拉取 Top 100 虛擬貨幣的詳細市場數據並存入 PostgreSQL
- [ ] 建立後端 API (`/api/coins`)，提供加密貨幣列表、搜尋、以及單一貨幣詳細資訊的查詢

### 2. 前端 - 核心頁面開發
- [ ] **首頁 (Homepage)**
    - [ ] 開發 UI 元件：導覽列、頁尾、市場總覽卡片
    - [ ] 串接 `/api/coins?limit=10` API，顯示 Top 10 貨幣列表
- [ ] **市場頁 (Markets Page)**
    - [ ] 開發 UI 元件：可排序/搜尋的貨幣表格、分頁元件
    - [ ] 串接 `/api/coins` API，實現完整的市場數據展示、搜尋與分頁功能
- [ ] **貨幣詳情頁 (Coin Detail Page)**
    - [ ] 開發 UI 元件：價格圖表 (使用 Chart.js 或類似庫)、數據統計區塊
    - [ ] 建立動態路由 `/[coinId]`
    - [ ] 串接 `/api/coins/:id` API，顯示指定貨幣的詳細資訊與歷史價格圖表

## 第三階段：使用者個人化功能 (Sprint 3)

### 1. 後端 - 個人化功能 API
- [ ] 實作「觀察清單」相關 API
    - `POST /api/watchlist` (新增)
    - `DELETE /api/watchlist/:coinId` (移除)
    - `GET /api/watchlist` (查詢)
- [ ] 實作「資產組合」相關 API
    - `POST /api/portfolio` (新增交易紀錄)
    - `PUT /api/portfolio/:transactionId` (修改)
    - `DELETE /api/portfolio/:transactionId` (刪除)
    - `GET /api/portfolio` (查詢並計算總覽)

### 2. 前端 - 使用者中心與個人化功能
- [ ] 開發使用者登入/註冊頁面，並整合後端認證 API
- [ ] 在導覽列顯示使用者登入狀態與個人頭像
- [ ] 開發「觀察清單」頁面，並串接相關 API
- [ ] 開發「資產組合」頁面，包含新增交易的表單與資產總覽圖表，並串接 API

## 第四階段：部署與優化 (Sprint 4)

- [ ] 撰寫單元測試與整合測試 (Jest, React Testing Library)
- [ ] 前端效能優化 (Code Splitting, Image Optimization)
- [ ] 後端 API 壓力測試 (e.g., k6, Artillery)
- [ ] 在 Vercel (前端) 和 AWS/GCP (後端) 上設定生產環境
- [ ] 完成最終部署，將網域指向服務
- [ ] 設定監控與日誌系統 (e.g., Sentry, Logtail)
