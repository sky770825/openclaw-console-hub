# 2025 前端效能優化進階技巧

> 來源：Gemini Flash 2.5 搜尋整理
> 日期：2026-02-16
> 適用：前端開發、效能調校

## 1. Core Web Vitals 優化

**LCP (最大內容繪製時間)：**
- 伺服器端渲染 (SSR) 與預渲染加速首屏
- 優化關鍵資源加載順序
- 使用 CDN 縮短資源加載距離
- 圖片壓縮，使用 WebP/AVIF 格式

**FID (首次輸入延遲)：**
- 減少 JavaScript 執行時間
- 使用 Web Workers 處理非 UI 計算
- 避免過多第三方腳本

**CLS (累計版面配置偏移)：**
- 為圖片和廣告明確定義尺寸
- 避免在現有內容上方插入新內容
- 使用 transform 和 opacity 進行動畫

## 2. 程式碼分割與懶加載

- **基於路由的程式碼分割**：不同路由分割成獨立 chunk
- **基於元件的程式碼分割**：大型元件分割成更小 chunk
- **Intersection Observer API**：監測元素進入可視區域實現懶加載
- **動態 import()**：需要時動態加載模組

## 3. 快取策略設計

| 層級 | 機制 |
|------|------|
| HTTP 快取 | Cache-Control、ETag、Last-Modified |
| Service Worker | 離線訪問、背景同步 |
| 瀏覽器儲存 | LocalStorage、SessionStorage、IndexedDB |
| CDN 快取 | 全球節點加速資源傳輸 |

## 4. 圖片與資源優化

- **圖片壓縮**：ImageOptim, TinyPNG
- **現代圖片格式**：WebP, AVIF 提供更好的壓縮率
- **響應式圖片**：`<picture>` 元素或 `srcset` 屬性
- **資源壓縮與合併**：減少請求數量
- **Tree Shaking**：移除未使用的程式碼
- **字體優化**：Web Font Loader 控制載入行為
