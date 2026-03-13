# 高效能 Landing Page 技術策略報告 (Linear, Vercel, Raycast 風格)

## 1. 動畫效能優化 (Performance Animations)
### Linear & Raycast 核心技術
- **GPU 加速**: 優先使用 `transform` (translate3d, scale, rotate) 與 `opacity`，避免觸發 Layout/Paint。
- **Bezier Curves**: 使用 `cubic-bezier(0.4, 0, 0.2, 1)` 或是 `spring` 動畫模型 (Linear 常用 Framer Motion)。
- **Scroll-Triggered Animations**: 
    - 使用 `Intersection Observer API` 延遲動畫觸發。
    - Framer Motion 的 `whileInView` 屬性。
- **SVG 動畫**: 對於複雜圖形，使用 SVG Path length 偏移實現線條描繪效果。

## 2. 資料載入策略 (Data Loading Strategy)
### Vercel & Next.js 最佳實踐
- **Progressive Hydration**: 僅對進入視窗的元件進行水合。
- **Streaming SSR**: 利用 Next.js 13/14 App Router 的 `loading.tsx` 與 Suspense。
- **Pre-fetching**: 在 Link 進入視窗時預取 JSON/JS (Next.js 內建)。
- **SWR / React Query**: 實現 Stale-While-Revalidate，確保 UI 立即響應同時背景更新。

## 3. 用戶體驗優化 (UX Optimization)
- **Skeleton Screens**: 減少 CLS (Cumulative Layout Shift)。
- **Image Optimization**: 使用 `next/image` 確保圖片以 WebP/AVIF 格式提供，並根據 Device Pixel Ratio 適配大小。
- **Keyboard-First Design**: (Raycast 靈魂) 即使是 Landing Page，也應支援快捷鍵（如 `Cmd+K` 搜尋）。

## 4. 針對本專案 (/Users/sky770825/openclaw任務面版設計) 的建議
- **當前檢測到的依賴**: @hookform/resolvers, @naari3/pixi-live2d-display, @radix-ui/react-accordion, @radix-ui/react-alert-dialog, @radix-ui/react-aspect-ratio, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-collapsible, @radix-ui/react-context-menu, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-hover-card, @radix-ui/react-label, @radix-ui/react-menubar, @radix-ui/react-navigation-menu, @radix-ui/react-popover, @radix-ui/react-progress, @radix-ui/react-radio-group, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slider, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toast, @radix-ui/react-toggle, @radix-ui/react-toggle-group, @radix-ui/react-tooltip, @react-three/drei, @react-three/fiber, @tanstack/react-query, @tsparticles/react, @tsparticles/slim, @types/three, class-variance-authority, clsx, cmdk, date-fns, echarts, echarts-for-react, embla-carousel-react, framer-motion, input-otp, lucide-react, next-themes, pixi.js, react, react-day-picker, react-dom, react-hook-form, react-resizable-panels, react-router-dom, recharts, sonner, tailwind-merge, tailwindcss-animate, three, vaul, zod
- **建議加入**: `framer-motion` 進行流暢轉場, `lucide-react` 或 `radix-ui` 確保 Accessible 無障礙體驗。
