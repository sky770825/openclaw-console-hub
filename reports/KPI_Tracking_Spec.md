# Astro+React Landing Page 數據追蹤指標 (KPIs) 規格書

## Phase 1: 基礎流量指標 (Basic Traffic)
- **PV (Page Views)**: 頁面瀏覽次數
- **UV (Unique Visitors)**: 獨立訪客數
- **Avg. Session Duration**: 平均停留時間
- **Lighthouse Performance**: 目標分數 > 90 (FCP, LCP, CLS)
- **工具**: GA4 + Google Tag Manager (GTM)

## Phase 2: 互動組件點擊率 (Interaction)
- **CTA Button Click Rate**: "立即開始"、"查看文件" 按鈕點擊
- **Component Engagement**: React 特性展示組件的停留與互動次數
- **工具**: GTM 自定義事件 (Event Category: 'Interaction')

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **Conversion Rate**: 提交 Waitlist 表單人數 / 總訪問人數
- **Form Error Rate**: 表單驗證失敗次數（用於優化 UX）
- **工具**: 後端 API 追蹤 + GA4 Conversion Event

## 給阿工的追蹤代碼規格
- **Endpoint**: `POST /api/analytics/track`
- **Payload**: 
  ```json
  {
    "event": "string",  // e.g., 'page_view', 'cta_click', 'waitlist_success'
    "label": "string",  // e.g., 'hero_section', 'footer'
    "metadata": "object"
  }
  ```
