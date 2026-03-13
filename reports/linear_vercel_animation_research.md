# Linear & Vercel 動畫實作調研報告

## 1. 專案依賴分析 (package.json)
針對 Linear/Vercel 風格（通常使用 framer-motion 或原生 Tailwind 實作），檢查結果如下：
```
    "framer-motion": "^12.34.3",
```

## 2. 程式碼實作現況
### Framer Motion 使用情況
(前 10 個檔案):
```
/Users/sky770825/openclaw任務面版設計/src/components/starship/fx/MotionPanel.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/Dashboard.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/starship/ManufacturingRoadmap.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/starship/FrameworksOverview.tsx
/Users/sky770825/openclaw任務面版設計/src/pages/CaseStudies.tsx
```

### Tailwind CSS 動畫類別
(部分範例):
```
/Users/sky770825/openclaw任務面版設計/src/components/LiveExecutionPanel.tsx:          <RotateCw className="h-4 w-4 animate-spin" />
/Users/sky770825/openclaw任務面版設計/src/components/LiveExecutionPanel.tsx:            <StatusIcon className={cn('h-4 w-4', statusInfo.color, currentStatus === 'running' && 'animate-spin')} />
/Users/sky770825/openclaw任務面版設計/src/components/ui/alert-dialog.tsx:      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
/Users/sky770825/openclaw任務面版設計/src/components/ui/alert-dialog.tsx:        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
/Users/sky770825/openclaw任務面版設計/src/components/ui/tabs.tsx:      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
```

### 特殊樣式 (Glow, Gradients, Glassmorphism)
(部分範例):
```
/Users/sky770825/openclaw任務面版設計/src/index.css:    @apply bg-card/80 backdrop-blur-sm;
/Users/sky770825/openclaw任務面版設計/src/index.css:    @apply bg-card/95 backdrop-blur-md;
/Users/sky770825/openclaw任務面版設計/src/index.css:  .shadow-glow {
/Users/sky770825/openclaw任務面版設計/src/index.css:  @keyframes pulse-glow {
/Users/sky770825/openclaw任務面版設計/src/index.css:  .animate-pulse-glow {
```

## 3. 調研結論
- **技術棧**: 如果發現 `framer-motion`，則專案傾向於使用聲明式動畫。
- **風格一致性**: 檢查 `tailwind.config.js` 是否有自定義的 easing (如 `cubic-bezier`) 是判斷是否達成 Linear 精緻感的關鍵。
- **下一步建議**:
    1. 參考 Vercel 的 [Geist Design System](https://vercel.com/design) 進行組件優化。
    2. 實作 Linear 著名的 "Command Menu" (K-menu) 動畫。
    3. 在 `src/components` 中建立一個實驗性的 `LinearCard.tsx` 進行打樣。

---
報告產生時間: Wed Mar  4 20:46:23 CST 2026
