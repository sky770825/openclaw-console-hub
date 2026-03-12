# Astro+React Landing Page 數據追蹤規格書

## Phase 1: 基礎流量指標 (Basic Traffic)
- **PV (Page Views)**: 頁面瀏覽次數。
- **UV (Unique Visitors)**: 獨立訪客數 (透過 Cookie/LocalStorage 識別)。
- **Stay Time**: 使用者在頁面平均停留時間。
- **Lighthouse Score**: 定期監控效能、SEO、無障礙指標 (>90 為目標)。

## Phase 2: 互動組件點擊率 (Engagement)
- **CTA Button Click**: 追蹤 "Get Started", "Try Now" 等按鈕。
- **Nav Link Click**: 導覽列點擊分佈。
- **Social Media Icons**: 社群連結點擊率。

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **Waitlist Submit**: 成功送出 Email 的數量。
- **Conversion Rate**: Waitlist Submit / Total UV.
- **Error Rate**: 表單驗證失敗次數，用於優化 UX。

## 技術實作建議
- **工具**: 推薦 Google Analytics 4 (GA4) + 自建 Analytics API。
- **API Endpoint**: `POST /api/analytics/track`
