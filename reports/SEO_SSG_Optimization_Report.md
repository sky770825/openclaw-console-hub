# 美業網站 SEO 與 SSR/SSG 優化技術報告

## 1. 專案概況
- **檢測技術棧:** Vite (React/Vue)
- **偵測路徑總數:** 32

## 2. SSR/SSG 配置建議
為了最大化 SEO 效益，建議根據技術棧進行以下配置：

### 若為 Vite 專案:
- **建議採用 SSG (Static Site Generation):** 安裝 `vite-ssg`。
- **配置:** 在 `package.json` 中修改 build 指令為 `vite-ssg build`。這將使每個路由在 build 時生成獨立的 HTML 檔案，讓 Google 爬蟲能直接讀取內容。

### 若為 Next.js 專案:
- **預設即支持 SSR/SSG:** 
  - 靜態頁面使用 `getStaticProps`。
  - 動態資料頁面使用 `getServerSideProps` 以確保內容即時更新且對 SEO 友好。

## 3. 已生成資產
- **Sitemap:** `sandbox/output/sitemap.xml` (包含所有靜態路由)。
- **Meta Tags:** `sandbox/output/seo_og_tags.html` (包含 Open Graph 與 Twitter Card 標籤)。
- **分享元件:** `scripts/SocialShareButtons.jsx` (前端社群分享邏輯)。

## 4. 後續執行建議
1. 將 `sitemap.xml` 放置於 Web Server 根目錄。
2. 將 `seo_og_tags.html` 中的內容整合進網站的 `<head>` 中。
3. 確保圖片路徑 (`og:image`) 存在於伺服器上。
