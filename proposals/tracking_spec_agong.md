# 追蹤代碼實作規格 (給阿工)

## 1. 全域初始化 (GA4)
在 Astro 佈局檔的 <head> 加入：
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 2. 互動事件 (React Components)
請在 Button 組件加入以下事件觸發：
```javascript
const handleCtaClick = () => {
  window.gtag('event', 'click_cta', {
    'event_category': 'engagement',
    'event_label': 'hero_waitlist_button'
  });
};
```

## 3. 表單提交事件 (Phase 3)
表單成功提交後調用：
```javascript
window.gtag('event', 'generate_lead', {
  'event_category': 'conversion',
  'event_label': 'waitlist_signup'
});
```
