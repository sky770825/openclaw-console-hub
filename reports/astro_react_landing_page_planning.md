# Astro React Landing Page 規劃與評估報告

## 1. 外部調研摘要 (Lin)
針對市場上頂尖 Landing Page 的調研顯示，採用 Astro + React 的架構能實現最佳的 Core Web Vitals 表現。

## 2. 技術規劃 (Technical Planning)
- **架構**: 使用 Astro 作為基礎框架，針對靜態內容（如 Hero, Features）進行預渲染。
- **組件**: 複雜互動（如表單驗證、動態過濾）採用 React 組件，並應用 `client:visible` 策略進行延遲加載。
- **樣式**: Tailwind CSS 全域整合。

## 3. MVP 階段定義
- **階段一 (骨架)**: 完成 Astro 基礎配置與 React 水合 (Hydration) 測試。
- **階段二 (內容)**: 首頁 Hero、產品價值主張 (Value Prop)、聯絡表單。
- **階段三 (優化)**: SEO 元數據配置與移動端適配。

## 4. 工時評估 (Estimation)
- 環境搭建與技術原型: 0.5 天
- UI 組件開發 (React): 1.5 天
- Astro 整合與 SSG 生成: 1 天
- **總計**: 3 個工作日 (MVP)

## 5. 技術風險
- **狀態同步**: Astro 與 React 之間的多組件狀態傳遞（建議使用 nanostores）。
- **SEO**: 確保 React 組件在靜態生成階段不遺失關鍵關鍵字。
