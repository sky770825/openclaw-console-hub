# Astro+React Landing Page 數據追蹤規格書 (v1.0)

## 追蹤目標 (KPIs)
- **Phase 1: 基礎流量** - PV/UV, Session Duration, Lighthouse Scores.
- **Phase 2: 互動率** - 特性卡片點擊, 導航列點擊.
- **Phase 3: 轉換率** - Waitlist 表單提交成功率.

## 代碼實作規格

### 工具選擇
- **自研蒐集器**: 傳送到 `/api/analytics` (後端已實作)
- **GA4/GTM**: 基礎流量備援

### 事件定義 (Event Schema)
typescript
interface AnalyticsEvent {
  event: 'page_view' | 'click' | 'conversion' | 'web_vitals';
  category: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}
### 埋點位置 (阿工請注意)
1. **Waitlist Submit**: `src/components/WaitlistForm.tsx` -> `onSubmitSuccess`
2. **Feature Cards**: `src/components/Features.tsx` -> `onClick`
3. **Web Vitals**: `src/pages/_app.tsx` or Astro script section.
