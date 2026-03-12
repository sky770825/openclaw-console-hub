# 2025 網頁設計最佳實踐

> 來源：Gemini Flash 2.5 搜尋整理
> 日期：2026-02-16
> 適用：Dashboard 手機版修復、前端開發

## 1. Tailwind CSS 進階技巧

- **掌握 Variants 與 Customization**：深入運用 Hover、Focus、Active 等 Variants，客製化顏色、字體、間距
- **使用 @apply 指令與 Components**：將常用樣式組合封裝成可重複使用的 Class
- **運用 PurgeCSS**：生產環境啟用 PurgeCSS 移除未使用 CSS，大幅減少檔案大小
- **利用 JIT 模式**：即時編譯樣式，加快開發速度，支援動態 Class 名稱

## 2. 響應式設計原則

- **Mobile-First Approach**：以行動裝置優先，再擴展到平板和桌面
- **Fluid Layout 與 Flexible Images**：流動式版面，彈性圖片避免失真
- **Media Queries 精準運用**：針對不同螢幕尺寸提供最佳佈局
- **Accessibility-First Design**：適當色彩對比、可訪問表單和導航

## 3. 效能優化要點

| 技巧 | 說明 |
|------|------|
| 壓縮圖片與影片 | 降低檔案大小縮短載入時間 |
| 瀏覽器快取 | 設定 Cache-Control 標頭 |
| 延遲載入 | Lazy Loading 螢幕外資源 |
| 最小化 HTTP 請求 | 合併 CSS/JS 檔案 |
| 使用 CDN | 全球節點加速內容傳輸 |
