# 🚂 Railway 部署指南

## 快速部署步驟

### 1. 準備環境變數

Railway 需要以下環境變數：

```bash
# 必填
PORT=3011
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 選填（n8n 整合）
N8N_API_URL=https://your-n8n.railway.app
N8N_API_KEY=your-n8n-api-key
```

### 2. 部署方式

#### 方法一：Railway CLI（推薦）

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 進入 server 目錄
cd server

# 初始化專案
railway init --name openclaw-taskboard-api

# 設定環境變數
railway variables set PORT=3011
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_ANON_KEY=...
railway variables set SUPABASE_SERVICE_ROLE_KEY=...

# 部署
railway up
```

#### 方法二：GitHub 自動部署

1. 把程式碼 push 到 GitHub
2. 在 Railway Dashboard 建立新專案
3. 選擇 "Deploy from GitHub repo"
4. 選擇你的 repo，設定 root directory 為 `server/`
5. 在 Variables 頁面設定環境變數
6. 自動部署完成！

### 3. 取得公開網址

部署成功後，Railway 會給你一個網址：
`https://openclaw-taskboard-api-production.up.railway.app`

### 4. 更新儀表板

修改儀表板的 API URL：

```javascript
// taskboard-dashboard/src/app/components/TaskBoard.tsx
const API_BASE = 'https://your-railway-app.up.railway.app';
```

然後重新部署儀表板到 GitHub Pages。

## 🔧 疑難排解

### 部署失敗
- 確認 Dockerfile 在 `server/` 目錄下
- 檢查 Railway build logs

### API 無法連接
- 確認 CORS 設定正確
- 檢查環境變數是否設定完整

### 資料庫連接失敗
- 確認 Supabase 專案已建立
- 確認已執行 migration SQL
- 確認 IP 允許列表包含 Railway

## 📚 相關文件

- [Railway 文件](https://docs.railway.app/)
- [Supabase 文件](https://supabase.com/docs)
