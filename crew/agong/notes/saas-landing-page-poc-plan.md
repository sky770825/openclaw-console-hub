# SaaS Landing Page - 技術 POC 規劃

## 目標
為阿策的 MVP 規劃提供技術可行性、工時和風險評估的具體依據。不等規劃完，直接動手驗證技術選型。

## 技術選型建議
- **框架**: Astro
- **理由**: 基於上次的分析，Astro 的孤島架構 (Islands Architecture) 最適合這種高互動性的行銷頁面。能確保非互動內容是純靜態 HTML，達到最快載入速度，同時在需要的地方（例如 pricing-toggle, contact-form）才載入 React/Svelte/Vue 組件的 JS。完美符合「高互動」和「載入速度」的要求。

## POC 執行步驟 (預計 2-4 小時)
1.  **專案初始化**: `npm create astro@latest` 建立專案。
2.  **整合 UI 框架**: 加入 React 整合 (`npx astro add react`)，建立一個簡單的互動計數器組件，驗證孤島架構。
3.  **部署驗證**: 直接部署到 Vercel，驗證部署流程是否順暢。
4.  **性能評估**: 使用 PageSpeed Insights 或 Lighthouse 跑分，目標是行動版 95+。

## 產出
- 一個可運行的 POC 網站 URL。
- 一份 Lighthouse 性能報告。
- 實際的開發體驗和潛在問題記錄。

這份產出可以直接給阿策用來評估第一階段 MVP 的工時和技術風險。