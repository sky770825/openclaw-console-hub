# Astro+React Landing Page 數據追蹤規格 (KPIs)

## 追蹤階段規劃
### Phase 1: 基礎流量與性能指標 (Basic Traffic)
- **PV (Page Views)**: 每次頁面加載。
- **UV (Unique Visitors)**: 每日唯一訪客。
- **Lighthouse**: 性能、可存取性、SEO 分數。
- **停留時間**: 使用 `visibilitychange` 與 `unload` 計算。

### Phase 2: 互動指標 (Engagement CTR)
- **組件點擊率**: 追蹤 Navbar, Hero CTA, Footer 點擊。
- **滾動深度**: 追蹤用戶是否看到 Waitlist 表單區域。

### Phase 3: 轉換率 (Conversion)
- **Waitlist Conversion**: 成功提交表單的次數 / 總 UV。

## 追蹤代碼實作規格 (給阿工)
- **API Endpoint**: `POST /api/tracking/event`
- **Payload 範例**:
  ```json
  {
    "type": "conversion",
    "event": "waitlist_signup",
    "metadata": { "source": "hero_button", "email_domain": "gmail.com" }
  }
  ```
