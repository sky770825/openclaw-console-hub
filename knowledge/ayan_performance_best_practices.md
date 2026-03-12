# 阿研 職責與效能優化指南

## 核心職責
1. **效能監控**：確保 Astro React 落地頁符合 Core Web Vitals 標準。
2. **快取管理**：實施正確的 HTTP 快取策略（如 `immutable`）。
3. **架構維護**：維護 Astro Islands Architecture，減少不必要的 Client-side JS。

## Astro React 最佳實踐
- **Image Optimization**: 使用 Astro `<Image />` 組件。
- **Component Islands**: 僅在必要時使用 `client:visible` 或 `client:load`。
- **Static Site Generation (SSG)**: 預渲染所有靜態頁面。
