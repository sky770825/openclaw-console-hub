# Astro+React Landing Page 數據追蹤指標 (KPIs) 規劃書

## Phase 1: 基礎流量指標 (Basic Traffic)
- **工具**: GA4 + Lighthouse
- **指標**: 
  - PV (Page Views): 總瀏覽次數
  - UV (Unique Visitors): 獨立訪客數
  - Average Session Duration: 平均停留時間
  - Lighthouse Score: 效能、無障礙、SEO 指標 > 90

## Phase 2: 互動組件點擊率 (Interaction)
- **工具**: Custom API Backend
- **事件定義**:
  - `hero_cta_click`: Hero 區塊按鈕點擊
  - `feature_card_click`: 特色卡片點擊
  - `nav_link_click`: 導航列點擊

## Phase 3: Waitlist 表單轉換率 (Conversion)
- **工具**: Custom API Backend + CRM Integration
- **指標**:
  - `waitlist_submit_success`: 表單提交成功數
  - `conversion_rate`: (Waitlist 提交數 / UV) * 100%

## API 規格 (給阿工)
- **Endpoint**: `/api/analytics/event`
- **Method**: `POST`
- **Payload**: `{ "category": string, "action": string, "label"?: string, "value"?: number }`
