# 部署指南 (Vercel & Railway)

本文件說明如何將 OpenClaw 的前端部署至 Vercel，後端部署至 Railway。

## 1. 前端部署 (Vercel)

Vercel 適合託管靜態網頁或 Next.js 應用程式。

### 步驟：
1. **登入 Vercel** 並點擊 "Add New" -> "Project"。
2. **導入 GitHub 儲存庫**。
3. **設定 Build Settings**：
   - Framework Preset: `Vite` (或根據專案框架選擇)。
   - Build Command: `npm run build` 或 `pnpm build`。
   - Output Directory: `dist`。
4. **設定環境變數 (Environment Variables)**：
   - `VITE_API_URL`: 指向你的 Railway 後端網址 (例如 `https://api.yourproject.railway.app`)。
5. **部署**：點擊 "Deploy"。

### 注意事項：
- 確保 API 請求路徑在生產環境中使用 `VITE_API_URL`。

---

## 2. 後端部署 (Railway)

Railway 適合託管 Node.js 服務、資料庫與 Docker 容器。

### 步驟：
1. **登入 Railway** 並點擊 "New Project"。
2. **選擇 "Deploy from GitHub repo"**。
3. **設定環境變數**：
   - 複製 `.env.production.template` 的內容並填入真實數值。
   - 務必設定 `PORT` (Railway 會自動注入，但程式碼需能讀取 `process.env.PORT`)。
   - 設定 `ALLOWED_ORIGINS` 為你的 Vercel 網址以允許 CORS。
4. **檢查啟動指令**：
   - Railway 會自動偵測 `package.json` 中的 `start` 指令。
   - 確保 `start` 指令指向編譯後的檔案 (例如 `node dist/index.js`)。

### 注意事項：
- **CORS 設定**：如果遇到跨網域問題，請檢查 Railway 上的 `ALLOWED_ORIGINS` 是否正確包含 Vercel 的域名。
- **資料庫連接**：如果使用 Railway 內建資料庫，請使用其提供的私有網絡連接字串以提升效能與安全性。

---

## 3. 部署後檢核
- [ ] 前端是否能正確載入。
- [ ] 前端 API 請求是否導向正確的後端網址。
- [ ] 後端 CORS 是否允許前端域名。
- [ ] 寫入操作 (POST/PUT/DELETE) 是否有被 `authMiddleware` 正確保護。
