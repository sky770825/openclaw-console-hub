# 技術報告：Linear & Vercel 風格動畫實作指南

## 1. 核心技術棧 (Core Stack)
根據分析與現代前端趨勢，達成 Linear/Vercel 質感的關鍵技術包括：
- **Framer Motion**: 用於佈局動畫 (Layout Animations) 與手勢交互。
- **Tailwind CSS**: 處理基礎過渡與高性能 GPU 加速位移。
- **React Server Components (RSC)**: 搭配 Skeleton 屏滑動效果。

## 2. 關鍵視覺效果實作路徑
### A. 邊框光暈效果 (Border Beam / Glow)
利用 `linear-gradient` 與 `conic-gradient` 配合 `framer-motion` 的 `animate` 屬性進行旋轉。

### B. 平滑佈局切換 (Layout Projection)
使用 Framer Motion 的 `layout` prop，讓組件在 DOM 結構改變時自動計算補間動畫。

### C. 閃爍文本與遮罩 (Shimmer Effect)
利用 CSS Animation 配合 `mask-image` 實現從左到右的掃光效果，常用於加載狀態。

## 3. 當前專案狀態分析
- **偵測到的相關依賴**:
clsx
framer-motion
lucide-react
tailwind-merge
tailwindcss-animate

- **原始碼範例參考**:
```
/Users/sky770825/openclaw任務面版設計/src/config/communityLayers.ts:    enabled: true, // v0.7 啟用：需滿足 trustPromotion.ts 升級條件
/Users/sky770825/openclaw任務面版設計/src/index.css:  .animate-fade-in {
/Users/sky770825/openclaw任務面版設計/src/index.css:  .animate-slide-up {
/Users/sky770825/openclaw任務面版設計/src/index.css:  .animate-slide-right {
/Users/sky770825/openclaw任務面版設計/src/index.css:  .animate-pulse-glow {
/Users/sky770825/openclaw任務面版設計/src/index.css:  .animate-oc-pulse {
/Users/sky770825/openclaw任務面版設計/src/index.css:.animate-gradient-shift {
/Users/sky770825/openclaw任務面版設計/src/index.css:::view-transition-old(root),
/Users/sky770825/openclaw任務面版設計/src/index.css:::view-transition-new(root) {
/Users/sky770825/openclaw任務面版設計/src/index.css:::view-transition-old(root) {
/Users/sky770825/openclaw任務面版設計/src/index.css:::view-transition-new(root) {
/Users/sky770825/openclaw任務面版設計/src/index.css:@supports (transition-behavior: allow-discrete) {
/Users/sky770825/openclaw任務面版設計/src/index.css:    transition-behavior: allow-discrete;
/Users/sky770825/openclaw任務面版設計/src/components/LiveExecutionPanel.tsx:          <RotateCw className="h-4 w-4 animate-spin" />
/Users/sky770825/openclaw任務面版設計/src/components/LiveExecutionPanel.tsx:            <StatusIcon className={cn('h-4 w-4', statusInfo.color, currentStatus === 'running' && 'animate-spin')} />
/Users/sky770825/openclaw任務面版設計/src/components/ui/alert-dialog.tsx:      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
/Users/sky770825/openclaw任務面版設計/src/components/ui/alert-dialog.tsx:        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
/Users/sky770825/openclaw任務面版設計/src/components/ui/tabs.tsx:      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
/Users/sky770825/openclaw任務面版設計/src/components/ui/card.tsx:  <div ref={ref} className={cn("rounded-xl border border-[var(--oc-border)] bg-[var(--oc-s2)] text-[var(--oc-t1)] transition-all hover:bg-[var(--oc-s3)]", className)} {...props} />
/Users/sky770825/openclaw任務面版設計/src/components/ui/slider.tsx:    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
```

## 4. 具體校準建議
針對「阿工」的開發需求，應優先建立一套共享的 `animations.ts` 設定檔，統一 `spring` (彈簧) 參數：
- stiffness: 100, damping: 30 (Linear 風格偏向沈穩)
- stiffness: 400, damping: 40 (快速響應)

