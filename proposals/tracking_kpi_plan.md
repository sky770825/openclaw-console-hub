# Astro+React Landing Page 數據追蹤指標 (KPIs) 規劃方案

## Phase 1: 基礎流量指標 (Foundation)
- **PV (Page Views)**: 頁面瀏覽量。
- **UV (Unique Visitors)**: 獨立訪客數。
- **Avg. Session Duration**: 平均停留時間，衡量內容吸引力。
- **Lighthouse Performance Score**: 目標 > 90，確保 Core Web Vitals 符合 SEO 標準。
- **工具**: Vercel Analytics / Google Analytics 4 (GA4)。

## Phase 2: 互動組件點擊率 (Engagement)
- **Feature Click Rate**: 產品特色區塊的點擊次數。
- **CTA Engagement**: 導航欄與頁尾 CTA 按鈕的點擊率。
- **Scroll Depth**: 捲動深度追蹤 (25%, 50%, 75%, 100%)。
- **工具**: Mixpanel / PostHog。

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **Conversion Rate (CR)**: Waitlist 成功提交數 / 總訪問人數。
- **Form Drop-off Rate**: 表單填寫中途流失率分析。
- **Success Rate**: 表單提交後的成功響應率。
- **工具**: 自研 Analytics API + Slack/Discord Webhook 通知。

## 代碼規格給阿工 (Tracking Specs)
- `trackEvent('click', 'waitlist_btn', { position: 'hero' })`
- `trackConversion('waitlist_submit', { email_domain: '...' })`
