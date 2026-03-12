# Astro+React Landing Page 數據追蹤方案 (KPIs)

## Phase 1: 基礎流量指標 (Foundation)
- **KPIs**: PV (Page Views), UV (Unique Visitors), Dwell Time (平均停留時間), Lighthouse Score.
- **工具**: Google Analytics 4 (GA4) + 自研 Analytics API.
- **事件**: `page_view`, `performance_report`.

## Phase 2: 互動組件點擊率 (Engagement)
- **KPIs**: CTA Button CTR, Scroll Depth, Feature Section Hover.
- **事件**: 
    - `cta_click` (label: 'hero_primary', 'footer_waitlist')
    - `scroll_milestone` (depth: 25, 50, 75, 100)

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **KPIs**: Form Start Rate, Form Completion Rate, Error Rate.
- **事件**:
    - `waitlist_start`
    - `waitlist_success`
    - `waitlist_error` (reason: string)

## 技術規格
- **Endpoint**: `POST /api/analytics/track`
- **Payload**: `{ event: string, properties: object, timestamp: number }`
