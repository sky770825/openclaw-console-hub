# 追蹤代碼規格書 (給阿工)

## 1. 基礎代碼
請在 Astro 的 `Layout.astro` 中引入後端 API 追蹤腳本。

## 2. 事件發送介面 (Client-side)
```typescript
const trackEvent = async (type: 'pageview' | 'click' | 'conversion', metadata: any) => {
  await fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      path: window.location.pathname,
      visitorId: getVisitorId(), // 請實作簡易本地存儲 ID
      metadata
    })
  });
};
```

## 3. 需埋點位置
- **Hero CTA**: `trackEvent('click', { elementId: 'hero_waitlist_btn' })`
- **Waitlist Submit Success**: `trackEvent('conversion', { formId: 'main_waitlist' })`
