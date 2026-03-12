# Astro+React Landing Page 數據追蹤方案 (KPIs)

## Phase 1: 基礎流量指標 (Base Traffic)
- **PV (Page Views)**: 總瀏覽次數。
- **UV (Unique Visitors)**: 獨立訪客數 (以 Cookie/LocalStorage 識別)。
- **平均停留時間**: 使用者在頁面上的持續時間。
- **Lighthouse 分數**: 效能、無障礙、SEO 與最佳實踐指標 (目標 > 90)。
- **工具**: GA4 (基礎整合) + 自建 Analytics API。

## Phase 2: 互動組件點擊率 (Engagement)
- **CTA 點擊率**: 追蹤 "Get Started" 或 "Join Now" 按鈕。
- **組件曝光**: 追蹤關鍵區塊 (如 Pricing, Features) 是否進入視窗。
- **事件名稱**: `cta_click`, `section_view`。

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **表單提交數**: 成功加入 Waitlist 的人數。
- **轉換率 (CVR)**: 表單提交數 / 總 UV。
- **事件名稱**: `waitlist_signup_success`。

## 追蹤代碼規格 (Backend API Support)
- **Endpoint**: `POST /api/analytics/track`
- **Payload**:
  ```json
  {
    "event": "string",
    "properties": "object",
    "timestamp": "iso_date"
  }
  ```
