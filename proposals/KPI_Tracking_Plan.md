# Astro+React Landing Page 數據追蹤方案

## Phase 1: 基礎流量指標 (Basic Traffic)
*   **KPIs:**
    *   PV (Page Views): 總瀏覽量
    *   UV (Unique Visitors): 獨立訪客數
    *   Avg. Session Duration: 平均停留時間
    *   Lighthouse Score: 效能、SEO、無障礙分數 (目標 > 90)
*   **工具:** Google Analytics 4 (GA4) + PageSpeed Insights
*   **埋點位置:** 全域 Header

## Phase 2: 互動組件點擊率 (Engagement)
*   **KPIs:**
    *   Primary CTA Click Rate: "立即加入" 按鈕點擊率
    *   Feature Card Interaction: 各功能卡片展開/點擊次數
    *   Scroll Depth: 捲動深度 (25%, 50%, 75%, 100%)
*   **工具:** GA4 Event Tracking + Hotjar (熱點圖)

## Phase 3: Waitlist 表單轉換率 (Conversion)
*   **KPIs:**
    *   Waitlist Conversion Rate: (成功提交表單人數 / 總 UV) * 100%
    *   Form Abandonment Rate: 表單填寫中斷率
*   **工具:** 自建 Analytics API + GA4 Conversion Event

---

# 追蹤代碼開發規格 (給阿工)

## 1. 基礎埋點 (GA4)
請在 Astro 的 `Layout.astro` 中插入 GA4 Tag。

## 2. 互動事件 (React Components)
請在按鈕組件中加入以下 Data Attributes 以利自動追蹤：
`data-track-event="cta_click"`
`data-track-label="hero_section"`

## 3. Server-side API
後端需提供 `POST /api/analytics/track` 接口紀錄關鍵轉換。
