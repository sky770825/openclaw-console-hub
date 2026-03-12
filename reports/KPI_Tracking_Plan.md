# Astro+React Landing Page 數據追蹤指標 (KPIs) 規劃

## Phase 1: 基礎流量指標 (Basic Traffic)
- **PV (Page Views):** 頁面瀏覽總量。
- **UV (Unique Visitors):** 獨立訪客數。
- **Average Time on Page:** 使用者停留平均時間。
- **Lighthouse Score:** 效能、無障礙、SEO 指標（目標 > 90）。
- **Tools:** Google Analytics 4 (GA4), Vercel Analytics, Lighthouse CI.

## Phase 2: 互動組件點擊率 (Engagement CTR)
- **Hero CTA Click Rate:** 主視覺按鈕點擊。
- **Feature Card Hover/Click:** 功能卡片互動。
- **Scroll Depth:** 滾動深度 (25%, 50%, 75%, 100%)。
- **Tools:** Posthog / Mixpanel (Event Tracking).

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **Form Start Rate:** 開始填寫表單的人數。
- **Conversion Rate (CVR):** 成功提交 Waitlist 表單 / 總訪客。
- **Error Rate:** 表單驗證失敗次數。
- **Tools:** GA4 Conversion Events, Backend Logs.

## 實作規格 (Specifications for Developer)
- API Endpoint: `POST /api/track`
- Payload: `{ event: string, properties: object, timestamp: number }`
