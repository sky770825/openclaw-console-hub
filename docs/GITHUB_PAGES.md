# 用 GitHub Pages 部署前端（免 Railway 建前端）

## 一鍵設定

1. **開啟 GitHub Pages（用 Actions 當來源）**
   - 到你的 repo → **Settings** → 左側 **Pages**
   - 在 **Build and deployment** 的 **Source** 選 **GitHub Actions**

2. **推送 main 就會自動部署**
   - 推送程式碼到 `main` 後，Actions 會跑 `Deploy to GitHub Pages`
   - 完成後網址為：`https://<你的帳號>.github.io/<repo 名稱>/`

不用設任何 token 或 Railway，前端就放在 GitHub Pages。

---

## 關於後端 API

**GitHub Pages 只能放靜態檔案**，不能跑 Node 伺服器。

- **若你「還要」任務板 API（任務列表、Runs、寫入 Supabase 等）**  
  → 後端還是要放在別的地方，例如：
  - **Railway**（只部署 `server/`，前端改連這個 API 網址）
  - **Vercel**（把 server 做成 Serverless Functions）
  - 或之後改為前端直連 Supabase（就不需要自己的 API）

- **若你「暫時不用」後端**  
  → 可以只開 GitHub Pages，前端會載入，但呼叫 `/api` 會失敗；可之後再接上 API 或改直連 Supabase。

---

## 前端要連到自己的 API 時

在 **GitHub repo** 裡設 **Actions 的變數**（或 build 時注入）：

- 變數名：`VITE_API_BASE_URL`
- 值：你的 API 網址，例如 `https://你的後端.railway.app`（結尾不要加 `/`）

然後在 workflow 裡 build 時帶入：

```yaml
- name: Build
  run: npm run build
  env:
    VITE_BASE_PATH: /${{ github.event.repository.name }}/
    VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
```

（若你有設 `vars.VITE_API_BASE_URL`，前端就會用這個網址打 API。）

---

## 本專案用的流程

- **Workflow 檔**：`.github/workflows/deploy-github-pages.yml`
- **Build 時**：會設 `VITE_BASE_PATH=/<repo 名稱>/`，讓資源路徑在 GitHub Pages 下正確。
- **部署結果**：靜態檔在 `dist/`，由 Actions 上傳並由 GitHub Pages 提供。
