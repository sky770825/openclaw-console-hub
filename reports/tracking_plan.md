# Astro+React Landing Page 數據追蹤規劃書

## 第一階段：基礎流量指標 (Phase 1)
- **KPIs**: PV (頁面瀏覽), UV (獨立訪客), 停留時間, Lighthouse 效能分數。
- **工具**: 推薦使用 Google Analytics 4 (GA4) 或自建輕量化後端日誌。
- **事件規格**:
  - `page_view`: 包含 `page_title`, `page_location`, `referrer`。

## 第二階段：互動組件點擊率 (Phase 2)
- **KPIs**: 特色功能區點擊率 (CTR), 導航欄點擊分佈。
- **事件規格**:
  - `component_click`:
    - `component_id`: 組件唯一識別碼 (如 `feature-card-1`)
    - `component_name`: 組件名稱
    - `click_url`: 點擊目標連結

## 第三階段：Waitlist 表單轉換率 (Phase 3)
- **KPIs**: 表單開始填寫率, 表單提交成功率, 轉換路徑分析。
- **事件規格**:
  - `waitlist_signup`:
    - `status`: "success" | "fail"
    - `error_message`: 若失敗的原因
    - `source`: 來源管道 (如 `footer`, `hero_section`)

## 後端接收介面 (Implementation Spec)
- **Endpoint**: `POST /api/analytics/track`
- **Payload**:
  ```json
  {
    "event": "string",
    "properties": "object",
    "timestamp": "number"
  }
  ```
