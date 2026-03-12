# Astro React Landing Page 規劃報告

## 執行摘要
根據外部調研（Lin）與技術評估（阿策），本項目將採用 Astro 搭配 React 進行 MVP 開發。

## 1. MVP 階段定義
- **Core LP**: 具備 SSG 優勢的首頁，SEO 極大化。
- **Interactive UI**: 使用 React 組件處理聯絡表單與互動式導覽。
- **Performance**: 確保 95+ 的 Lighthouse 效能評分。

## 2. 工時估算
- 環境配置與 Astro/Tailwind 整合: 1d
- 核心 UI 組件開發: 2d
- 內容整合與動態 Hydration 調校: 1d
- 部署與測試: 1d
- **總計**: 5 工作日

## 3. 技術風險
- **Hydration Conflict**: 需嚴格控管 client:* 指令的使用，避免 JS 束體過大。
- **Data Fetching**: Astro 靜態生成期間的 API 整合穩定性。
