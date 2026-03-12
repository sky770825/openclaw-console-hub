# Astro+React Landing Page 數據追蹤指標 (KPIs) 規劃方案

## Phase 1: 基礎流量指標 (Traffic Metrics)
- **目標**: 建立基礎流量基準。
- **指標**: 
  - PV (Page Views): 總瀏覽次數。
  - UV (Unique Visitors): 獨立訪客數。
  - Bounce Rate: 跳出率。
  - Avg. Session Duration: 平均停留時間。
  - Lighthouse Score: 效能、SEO、無障礙分數（目標 > 90）。
- **工具**: Google Analytics 4 (GA4), Vercel Analytics.

## Phase 2: 互動組件點擊率 (Engagement Metrics)
- **目標**: 衡量 Landing Page 吸引力。
- **事件追蹤 (Custom Events)**:
  - `hero_cta_click`: 首屏主按鈕點擊。
  - `feature_card_expand`: 特色卡片展開。
  - `pricing_toggle`: 價格方案切換。
- **指標**: Click-Through Rate (CTR).

## Phase 3: Waitlist 表單轉換率 (Conversion Metrics)
- **目標**: 衡量核心業務價值。
- **指標**:
  - `waitlist_submit_success`: 表單提交成功。
  - Conversion Rate: 成功提交人數 / 總 UV。
- **工具**: 自研後端追蹤 API + Database.
