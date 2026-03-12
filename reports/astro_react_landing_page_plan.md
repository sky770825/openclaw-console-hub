# Astro React Landing Page 規劃、評估與風險定義

## 1. MVP 階段定義 (Minimum Viable Product)
- **核心功能**：
  - 基於 Astro 4.x 的靜態內容生成 (SSG)
  - 使用 React 18 實作高互動組件（如：預約表單、動態過濾器）
  - Tailwind CSS 響應式設計
  - 基本 SEO 優化與 Metadata 設置
- **非核心 (Post-MVP)**：
  - 全文搜索功能
  - 多國語系 (i18n)
  - 用戶評論系統

## 2. 工時評估 (總計: 10 MD)
- **技術選型與架構搭建**: 1 MD
- **React UI 組件庫開發**: 3 MDs
- **Astro 頁面整合與路由**: 2 MDs
- **外部研究 (Lin) 與 API 串接**: 2 MDs
- **部署與自動化 CI/CD**: 1 MD
- **QA 與效能調優**: 1 MD

## 3. 技術風險
- **Hydration Overload**: 過度使用 React 組件可能導致客戶端 JS 過多，失去 Astro 優勢。
- **孤島通訊 (Island Communication)**：不同 React 組件間的狀態共享需小心處理（建議使用 nanostores）。
- **外部調研風險**：第三方服務 API 的限制或不穩定性。
